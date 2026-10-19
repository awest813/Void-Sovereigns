extends Node
## Optional Steamworks bridge.
## Plays offline when GodotSteam is not installed. Release exports refuse App
## ID 480 (Spacewar) so a store build cannot ship against the test app.
## Campaign saves sync through Steam Remote Storage when the API is present.
## Settings stay in user://settings.cfg and are not uploaded.

signal steam_state_changed(text: String)

const SPACEWAR_APP_ID := 480
const CACHE_PATH := "user://steam_cache.cfg"

var status_text: String = "Steam offline"
var _steam: Object = null
var _steam_ready: bool = false
var _unlocked: Dictionary = {}
var _stats: Dictionary = {"extractions": 0, "deaths": 0}
var _accept_uploads: bool = false
var _pending_upload: bool = false
var _checked: bool = false


static func app_id_allowed(app_id: int, debug_build: bool) -> bool:
	if app_id <= 0:
		return false
	if app_id == SPACEWAR_APP_ID and not debug_build:
		return false
	return true


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_load_cache()
	MissionState.mission_status_changed.connect(_on_status)
	MissionState.mission_completed.connect(_on_mission_completed)
	EconomyState.item_sold.connect(_on_item_sold)
	ProgressionState.level_up.connect(_on_level_up)
	LoadoutState.armor_changed.connect(_on_armor)
	SceneManager.scene_changed.connect(_on_scene_changed)
	SaveSystem.save_completed.connect(_on_save_completed)
	_catch_up()
	call_deferred("_boot")


func read_app_id() -> int:
	var from_env := OS.get_environment("STEAM_APP_ID")
	if from_env.is_valid_int():
		return int(from_env)
	if not FileAccess.file_exists("res://steam/app_id.txt"):
		return 0
	var line := FileAccess.get_file_as_string("res://steam/app_id.txt").strip_edges().split("\n")[0].strip_edges()
	if line.is_valid_int():
		return int(line)
	return 0


func unlock(api: String) -> void:
	if not AchievementCatalog.has_api(api) or _unlocked.has(api):
		return
	_unlocked[api] = true
	_save_cache()
	if _steam_ready and _steam != null and _steam.has_method("setAchievement"):
		_steam.call("setAchievement", api)
		_store_stats()
	print("Achievement unlocked: %s" % api)


func _boot() -> void:
	if "--release-check" in OS.get_cmdline_user_args():
		_run_release_check()
		return
	var app_id := read_app_id()
	if not app_id_allowed(app_id, OS.is_debug_build()):
		if app_id == SPACEWAR_APP_ID:
			push_error("SteamService: refusing Spacewar app id 480 in a release export. Set steam/app_id.txt to your Steamworks App ID.")
		_set_status("Steam disabled")
		return
	if not Engine.has_singleton("Steam"):
		_set_status("Steam offline")
		return
	_steam = Engine.get_singleton("Steam")
	if _steam == null or not _steam.has_method("steamInitEx"):
		_set_status("Steam plugin unavailable")
		return
	var response: Variant = _steam.call("steamInitEx", app_id, true)
	var ok := false
	var verbal := ""
	if response is Dictionary:
		ok = int(response.get("status", 1)) == 0
		verbal = str(response.get("verbal", ""))
	elif response is bool:
		ok = response
	if not ok:
		push_warning("SteamService: init failed (%s)" % verbal)
		_set_status("Steam init failed")
		return
	_steam_ready = true
	_set_status("Steam connected")
	if _steam.has_signal("overlay_toggled"):
		_steam.connect("overlay_toggled", Callable(self, "_on_overlay"))
	_resync_steam()
	_initial_cloud_sync()
	_accept_uploads = true
	if _pending_upload:
		_upload_slot(SaveSystem.active_slot())
		_pending_upload = false
	_push_presence(SceneManager.current_scene_id)


func _on_overlay(active: bool) -> void:
	var pause := get_node_or_null("/root/PauseMenu")
	if pause == null:
		return
	if active:
		pause.hold_for_overlay()
	else:
		pause.release_overlay()


func _on_status(status: String) -> void:
	match status:
		"accepted":
			unlock("FIRST_CONTRACT")
		"deployed":
			unlock("COLD_DROP")
		"objectiveComplete":
			unlock("PACKAGE_SECURED")
		"success":
			unlock("EXTRACTED")
			_add_stat("extractions", 1)
		"failed":
			unlock("KIA")
			_add_stat("deaths", 1)


func _on_mission_completed(_mission_id: String) -> void:
	if MissionState.completed_missions.size() >= 3:
		unlock("VETERAN")


func _on_item_sold(_item: Dictionary, _sale_value: int) -> void:
	unlock("TRADER")


func _on_level_up(new_level: int) -> void:
	if new_level >= 2:
		unlock("PROMOTED")


func _on_armor(_slot: String, item_id: String) -> void:
	if item_id != "":
		unlock("GEAR_UP")


func _on_scene_changed(scene_id: String) -> void:
	_push_presence(scene_id)


func _on_save_completed(slot: int) -> void:
	if not _accept_uploads:
		_pending_upload = true
		return
	_upload_slot(slot)


func _catch_up() -> void:
	var status := MissionState.mission_status
	if status != "none" or not MissionState.completed_missions.is_empty():
		unlock("FIRST_CONTRACT")
	if status in ["deployed", "objectiveActive", "objectiveComplete", "extractionAvailable", "success", "failed"] or not MissionState.completed_missions.is_empty():
		unlock("COLD_DROP")
	if status in ["objectiveComplete", "extractionAvailable", "success"]:
		unlock("PACKAGE_SECURED")
	if not MissionState.completed_missions.is_empty():
		unlock("EXTRACTED")
	if MissionState.completed_missions.size() >= 3:
		unlock("VETERAN")
	if ProgressionState.level >= 2:
		unlock("PROMOTED")
	if LoadoutState.equipped_armor.size() > 0:
		unlock("GEAR_UP")


func _add_stat(key: String, amount: int) -> void:
	_stats[key] = int(_stats.get(key, 0)) + amount
	_save_cache()
	_push_stats()


func _push_stats() -> void:
	if not _steam_ready or _steam == null or not _steam.has_method("setStatInt"):
		return
	_steam.call("setStatInt", "extractions", int(_stats.get("extractions", 0)))
	_steam.call("setStatInt", "deaths", int(_stats.get("deaths", 0)))
	_store_stats()


func _store_stats() -> void:
	if _steam_ready and _steam != null and _steam.has_method("storeStats"):
		_steam.call("storeStats")


func _resync_steam() -> void:
	if not _steam_ready or _steam == null:
		return
	for api in _unlocked.keys():
		if _steam.has_method("setAchievement"):
			_steam.call("setAchievement", String(api))
	_push_stats()


func _push_presence(scene_id: String) -> void:
	if not _steam_ready or _steam == null or not _steam.has_method("setRichPresence"):
		return
	var line := "In menu"
	match scene_id:
		"hub":
			line = "Aboard the station"
		"mission":
			line = "On contract"
		"main_menu":
			line = "At the title screen"
	_steam.call("setRichPresence", "status", line)


func _initial_cloud_sync() -> void:
	if _steam == null or not _steam.has_method("fileExists"):
		return
	var cloud_name := "slot_0.cfg"
	var cloud := bool(_steam.call("fileExists", cloud_name))
	var local_info := SaveSystem.slot_info(0)
	var local_stamp := int(local_info.get("saved_at", 0))
	var cloud_stamp := 0
	if cloud and _steam.has_method("getFileTimestamp"):
		cloud_stamp = int(_steam.call("getFileTimestamp", cloud_name))
	if cloud and cloud_stamp > local_stamp:
		_download_slot(0)
	elif not local_info.is_empty():
		_upload_slot(0)


func _upload_slot(slot: int) -> void:
	if not _steam_ready or _steam == null or not _steam.has_method("fileWrite"):
		return
	var path := "user://saves/slot_%d.cfg" % slot
	if not FileAccess.file_exists(path):
		return
	var bytes := FileAccess.get_file_as_bytes(path)
	var wrote: Variant = _steam.call("fileWrite", "slot_%d.cfg" % slot, bytes, bytes.size())
	if wrote is bool and not bool(wrote):
		push_warning("SteamService: cloud write failed for slot %d" % slot)


func _download_slot(slot: int) -> void:
	if _steam == null:
		return
	var cloud_name := "slot_%d.cfg" % slot
	var size := int(_steam.call("getFileSize", cloud_name)) if _steam.has_method("getFileSize") else 0
	if size <= 0:
		return
	var raw: Variant = _steam.call("fileRead", cloud_name, size)
	var buf := PackedByteArray()
	if raw is PackedByteArray:
		buf = raw
	elif raw is Dictionary and raw.get("buf", null) is PackedByteArray:
		buf = raw["buf"]
	if buf.is_empty():
		return
	var file := FileAccess.open("user://saves/slot_%d.cfg" % slot, FileAccess.WRITE)
	if file == null:
		return
	file.store_buffer(buf)
	file.close()
	if slot == SaveSystem.active_slot():
		SaveSystem.load_slot(slot)


func _load_cache() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(CACHE_PATH) != OK:
		return
	var ids: Variant = cfg.get_value("achievements", "unlocked", [])
	if ids is Array:
		for api in ids:
			_unlocked[String(api)] = true
	_stats["extractions"] = int(cfg.get_value("stats", "extractions", 0))
	_stats["deaths"] = int(cfg.get_value("stats", "deaths", 0))


func _save_cache() -> void:
	var cfg := ConfigFile.new()
	var ids: Array = []
	for api in _unlocked.keys():
		ids.append(String(api))
	cfg.set_value("achievements", "unlocked", ids)
	cfg.set_value("stats", "extractions", int(_stats.get("extractions", 0)))
	cfg.set_value("stats", "deaths", int(_stats.get("deaths", 0)))
	cfg.save(CACHE_PATH)


func _compile_scripts(path: String, errors: Array[String]) -> void:
	var dir := DirAccess.open(path)
	if dir == null:
		errors.append("cannot open %s" % path)
		return
	dir.list_dir_begin()
	var entry := dir.get_next()
	while entry != "":
		if not entry.begins_with("."):
			var full := "%s/%s" % [path, entry]
			if dir.current_is_dir():
				_compile_scripts(full, errors)
			elif entry.ends_with(".gd"):
				var scr := load(full) as GDScript
				if scr == null or not scr.can_instantiate():
					errors.append("script failed to compile: %s" % full)
		entry = dir.get_next()
	dir.list_dir_end()


func _set_status(text: String) -> void:
	status_text = text
	steam_state_changed.emit(text)


func _notification(what: int) -> void:
	if what != NOTIFICATION_WM_CLOSE_REQUEST:
		return
	SaveSystem.flush()
	if _steam_ready and _steam != null and _steam.has_method("steamShutdown"):
		_steam.call("steamShutdown")


func _run_release_check() -> void:
	if _checked:
		return
	_checked = true
	var errors: Array[String] = []
	var main := str(ProjectSettings.get_setting("application/run/main_scene", ""))
	if not main.ends_with("main_menu.tscn"):
		errors.append("main scene is %s" % main)
	if str(ProjectSettings.get_setting("application/config/version", "")) == "":
		errors.append("missing application version")
	if not FileAccess.file_exists("res://export_presets.cfg"):
		errors.append("missing export_presets.cfg")
	else:
		var presets := FileAccess.get_file_as_string("res://export_presets.cfg")
		if not presets.contains("Windows Desktop"):
			errors.append("export presets missing Windows")
		if not presets.contains("steam_appid.txt"):
			errors.append("export presets do not exclude steam_appid.txt")
	if not FileAccess.file_exists("res://icon.png"):
		errors.append("missing icon.png")
	if read_app_id() <= 0:
		errors.append("app id is not readable")
	if app_id_allowed(SPACEWAR_APP_ID, false):
		errors.append("release builds must refuse app id 480")
	if not app_id_allowed(SPACEWAR_APP_ID, true):
		errors.append("debug builds should allow app id 480")
	if not app_id_allowed(123456, false):
		errors.append("a real app id should be allowed in release")
	var parsed: Variant = JSON.parse_string(FileAccess.get_file_as_string("res://steam/achievements.json"))
	if parsed is not Dictionary or not (parsed as Dictionary).has("achievements"):
		errors.append("achievements.json is invalid")
	else:
		var json_ids := {}
		for entry in (parsed as Dictionary)["achievements"]:
			json_ids[String(entry.get("api", ""))] = true
		for api in AchievementCatalog.apis():
			if not json_ids.has(api):
				errors.append("achievements.json missing %s" % api)
		if json_ids.size() != AchievementCatalog.ALL.size():
			errors.append("achievement catalog size mismatch")
	for action in ["jump", "interact", "pause", "reload", "shoot", "crouch", "sprint"]:
		var found := false
		for event in InputMap.action_get_events(action):
			if event is InputEventJoypadButton or event is InputEventJoypadMotion:
				found = true
		if not found:
			errors.append("no gamepad binding for %s" % action)
	if not SceneManager.SCENES.has("main_menu"):
		errors.append("SceneManager missing main_menu")
	var debrief := FileAccess.get_file_as_string("res://scripts/ui/DebriefUI.gd")
	if not debrief.contains("func show_failure"):
		errors.append("DebriefUI missing show_failure")
	SaveSystem.set_value("release_check", "marker", 7)
	SaveSystem.begin_fresh(0)
	if int(SaveSystem.get_value("release_check", "marker", 0)) != 0:
		errors.append("begin_fresh did not clear the slot")
	GameSettings.set_fov(83.0)
	GameSettings.reload_from_disk()
	if absf(GameSettings.fov - 83.0) > 0.01:
		errors.append("settings fov did not persist")
	GameSettings.set_fov(75.0)
	var jump := InputEventKey.new()
	jump.physical_keycode = KEY_J
	GameSettings.set_binding("jump", jump)
	GameSettings.reload_from_disk()
	var bound := false
	for event in InputMap.action_get_events("jump"):
		if event is InputEventKey and (event as InputEventKey).physical_keycode == KEY_J:
			bound = true
	if not bound:
		errors.append("jump rebind did not persist")
	GameSettings.reset_bindings()
	_compile_scripts("res://scripts", errors)
	for path in ["res://scenes/main_menu.tscn", "res://scenes/hub.tscn", "res://scenes/mission.tscn", "res://scenes/player.tscn"]:
		var packed := load(path) as PackedScene
		if packed == null:
			errors.append("failed to load %s" % path)
			continue
		var node := packed.instantiate()
		get_tree().root.add_child(node)
		node.queue_free()
	print("RELEASE_CHECK errors=%d" % errors.size())
	for err in errors:
		push_error("RELEASE_CHECK_FAIL %s" % err)
		print("RELEASE_CHECK_FAIL %s" % err)
	if errors.is_empty():
		print("RELEASE_CHECK_OK")
		get_tree().quit(0)
	else:
		get_tree().quit(1)
