extends Node
## Machine-local display, audio, and control settings.
## Stored in user://settings.cfg so a new game does not wipe them and so
## resolution does not ride along with Steam Cloud campaign saves.

signal changed

const SETTINGS_PATH := "user://settings.cfg"
const RESOLUTIONS: Array[Vector2i] = [
	Vector2i(1280, 720),
	Vector2i(1366, 768),
	Vector2i(1600, 900),
	Vector2i(1920, 1080),
	Vector2i(2560, 1440),
	Vector2i(3840, 2160),
]
const WINDOW_MODES: PackedStringArray = ["Windowed", "Borderless", "Exclusive fullscreen"]
const FPS_OPTIONS: Array[int] = [0, 60, 120, 144, 240]
const REBINDABLE: PackedStringArray = [
	"jump", "sprint", "crouch", "interact", "reload", "shoot",
	"flashlight", "melee", "grenade", "impulse_dash", "pause",
]
const ACTION_LABELS: Dictionary = {
	"jump": "Jump",
	"sprint": "Sprint",
	"crouch": "Crouch",
	"interact": "Interact",
	"reload": "Reload",
	"shoot": "Fire",
	"flashlight": "Flashlight",
	"melee": "Melee",
	"grenade": "Grenade",
	"impulse_dash": "Dash",
	"pause": "Pause",
}

var window_mode: int = 0
var resolution_index: int = 2
var vsync: bool = true
var fps_cap: int = 0
var vol_master: float = 1.0
var vol_sfx: float = 1.0
var vol_music: float = 0.8
var mouse_sens: float = 0.005
var stick_sens: float = 2.2
var invert_y: bool = false
var fov: float = 75.0

var _defaults: Dictionary = {}
var _bindings: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_capture_defaults()
	_load()
	apply_all()


func apply_all() -> void:
	_apply_display()
	_apply_audio()
	_apply_globals()
	_apply_bindings()


func reload_from_disk() -> void:
	_load()
	apply_all()


func set_window_mode(mode: int) -> void:
	window_mode = clampi(mode, 0, WINDOW_MODES.size() - 1)
	_apply_display()
	_commit()


func set_resolution_index(index: int) -> void:
	resolution_index = clampi(index, 0, RESOLUTIONS.size() - 1)
	_apply_display()
	_commit()


func set_vsync(enabled: bool) -> void:
	vsync = enabled
	_apply_display()
	_commit()


func set_fps_cap(cap: int) -> void:
	fps_cap = cap if cap in FPS_OPTIONS else 0
	_apply_display()
	_commit()


func set_master(linear: float) -> void:
	vol_master = clampf(linear, 0.0, 1.0)
	_apply_audio()
	_commit()


func set_sfx(linear: float) -> void:
	vol_sfx = clampf(linear, 0.0, 1.0)
	_apply_audio()
	_commit()


func set_music(linear: float) -> void:
	vol_music = clampf(linear, 0.0, 1.0)
	_apply_audio()
	_commit()


func set_mouse_sens(value: float) -> void:
	mouse_sens = clampf(value, 0.001, 0.02)
	_apply_globals()
	_commit()


func set_stick_sens(value: float) -> void:
	stick_sens = clampf(value, 0.4, 6.0)
	_apply_globals()
	_commit()


func set_invert_y(enabled: bool) -> void:
	invert_y = enabled
	_apply_globals()
	_commit()


func set_fov(value: float) -> void:
	fov = clampf(value, 60.0, 110.0)
	_apply_globals()
	_commit()


func binding_text(action: String) -> String:
	var parts := PackedStringArray()
	for event in InputMap.action_get_events(action):
		if event is InputEvent:
			parts.append((event as InputEvent).as_text())
	return ", ".join(parts)


func set_binding(action: String, event: InputEvent) -> void:
	if action not in REBINDABLE or event == null:
		return
	var copy := _clean_event(event)
	if copy == null:
		return
	var kept: Array[InputEvent] = []
	for existing in InputMap.action_get_events(action):
		if existing is InputEvent and not _same_class(existing, copy):
			kept.append(existing)
	InputMap.action_erase_events(action)
	for kept_event in kept:
		InputMap.action_add_event(action, kept_event)
	InputMap.action_add_event(action, copy)
	_bindings[action] = _events_to_dicts(InputMap.action_get_events(action))
	_commit()


func reset_bindings() -> void:
	_bindings = {}
	for action in _defaults.keys():
		InputMap.action_erase_events(action)
		var saved: Array = _defaults[action]
		for event in saved:
			if event is InputEvent:
				InputMap.action_add_event(action, (event as InputEvent).duplicate())
	_commit()


func _commit() -> void:
	_save()
	changed.emit()


func _capture_defaults() -> void:
	for action in REBINDABLE:
		var copies: Array[InputEvent] = []
		for event in InputMap.action_get_events(action):
			if event is InputEvent:
				copies.append((event as InputEvent).duplicate())
		_defaults[action] = copies


func _load() -> void:
	if OS.get_environment("SteamDeck") == "1":
		window_mode = 1
	var cfg := ConfigFile.new()
	if cfg.load(SETTINGS_PATH) != OK:
		return
	window_mode = int(cfg.get_value("video", "window_mode", window_mode))
	resolution_index = int(cfg.get_value("video", "resolution_index", resolution_index))
	vsync = bool(cfg.get_value("video", "vsync", vsync))
	fps_cap = int(cfg.get_value("video", "fps_cap", fps_cap))
	vol_master = float(cfg.get_value("audio", "master", vol_master))
	vol_sfx = float(cfg.get_value("audio", "sfx", vol_sfx))
	vol_music = float(cfg.get_value("audio", "music", vol_music))
	mouse_sens = float(cfg.get_value("controls", "mouse_sens", mouse_sens))
	stick_sens = float(cfg.get_value("controls", "stick_sens", stick_sens))
	invert_y = bool(cfg.get_value("controls", "invert_y", invert_y))
	fov = float(cfg.get_value("controls", "fov", fov))
	_bindings = {}
	if cfg.has_section("bindings"):
		for action in cfg.get_section_keys("bindings"):
			_bindings[String(action)] = cfg.get_value("bindings", action, [])
	window_mode = clampi(window_mode, 0, WINDOW_MODES.size() - 1)
	resolution_index = clampi(resolution_index, 0, RESOLUTIONS.size() - 1)
	fov = clampf(fov, 60.0, 110.0)
	mouse_sens = clampf(mouse_sens, 0.001, 0.02)
	stick_sens = clampf(stick_sens, 0.4, 6.0)
	vol_master = clampf(vol_master, 0.0, 1.0)
	vol_sfx = clampf(vol_sfx, 0.0, 1.0)
	vol_music = clampf(vol_music, 0.0, 1.0)


func _save() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("video", "window_mode", window_mode)
	cfg.set_value("video", "resolution_index", resolution_index)
	cfg.set_value("video", "vsync", vsync)
	cfg.set_value("video", "fps_cap", fps_cap)
	cfg.set_value("audio", "master", vol_master)
	cfg.set_value("audio", "sfx", vol_sfx)
	cfg.set_value("audio", "music", vol_music)
	cfg.set_value("controls", "mouse_sens", mouse_sens)
	cfg.set_value("controls", "stick_sens", stick_sens)
	cfg.set_value("controls", "invert_y", invert_y)
	cfg.set_value("controls", "fov", fov)
	for action in _bindings.keys():
		cfg.set_value("bindings", action, _bindings[action])
	cfg.save(SETTINGS_PATH)


func _apply_display() -> void:
	Engine.max_fps = fps_cap if fps_cap > 0 else 0
	if DisplayServer.get_name() == "headless":
		return
	var mode := DisplayServer.VSYNC_ENABLED if vsync else DisplayServer.VSYNC_DISABLED
	DisplayServer.window_set_vsync_mode(mode)
	match window_mode:
		1:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN)
		2:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN)
		_:
			DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_WINDOWED)
			var res: Vector2i = RESOLUTIONS[clampi(resolution_index, 0, RESOLUTIONS.size() - 1)]
			DisplayServer.window_set_size(res)
			var screen := DisplayServer.window_get_current_screen()
			var origin := DisplayServer.screen_get_position(screen)
			var screen_size := DisplayServer.screen_get_size(screen)
			DisplayServer.window_set_position(origin + (screen_size - res) / 2)


func _apply_audio() -> void:
	_set_bus("Master", vol_master)
	_set_bus("SFX", vol_sfx)
	_set_bus("Music", vol_music)


func _set_bus(bus_name: String, linear: float) -> void:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx < 0:
		return
	if linear <= 0.001:
		AudioServer.set_bus_volume_db(idx, -80.0)
	else:
		AudioServer.set_bus_volume_db(idx, linear_to_db(clampf(linear, 0.001, 1.0)))


func _apply_globals() -> void:
	Global.sensitivity = mouse_sens
	Global.controller_sensitivity = stick_sens
	Global.invert_y = invert_y
	Global.base_fov = fov


func _apply_bindings() -> void:
	for action in _bindings.keys():
		var raw: Variant = _bindings[action]
		if raw is not Array:
			continue
		var restored: Array[InputEvent] = []
		for entry in raw:
			if entry is Dictionary:
				var event := _event_from_dict(entry)
				if event:
					restored.append(event)
		if restored.is_empty():
			continue
		InputMap.action_erase_events(String(action))
		for event in restored:
			InputMap.action_add_event(String(action), event)


func _events_to_dicts(events: Array) -> Array:
	var out: Array = []
	for event in events:
		if event is InputEvent:
			var data := _event_to_dict(event)
			if not data.is_empty():
				out.append(data)
	return out


func _event_to_dict(event: InputEvent) -> Dictionary:
	if event is InputEventKey:
		return {"kind": "key", "code": int((event as InputEventKey).physical_keycode)}
	if event is InputEventMouseButton:
		return {"kind": "mouse", "button": (event as InputEventMouseButton).button_index}
	if event is InputEventJoypadButton:
		return {"kind": "joy_button", "button": (event as InputEventJoypadButton).button_index}
	if event is InputEventJoypadMotion:
		var motion := event as InputEventJoypadMotion
		return {"kind": "joy_motion", "axis": motion.axis, "value": motion.axis_value}
	return {}


func _event_from_dict(data: Dictionary) -> InputEvent:
	match String(data.get("kind", "")):
		"key":
			var key := InputEventKey.new()
			key.physical_keycode = int(data.get("code", 0)) as Key
			return key
		"mouse":
			var mouse := InputEventMouseButton.new()
			mouse.button_index = int(data.get("button", MOUSE_BUTTON_LEFT))
			return mouse
		"joy_button":
			var button := InputEventJoypadButton.new()
			button.button_index = int(data.get("button", JOY_BUTTON_A))
			return button
		"joy_motion":
			var motion := InputEventJoypadMotion.new()
			motion.axis = int(data.get("axis", JOY_AXIS_TRIGGER_RIGHT))
			motion.axis_value = float(data.get("value", 1.0))
			return motion
	return null


func _clean_event(event: InputEvent) -> InputEvent:
	var copy := event.duplicate() as InputEvent
	if copy is InputEventKey:
		var key := copy as InputEventKey
		key.pressed = false
		key.echo = false
	elif copy is InputEventMouseButton:
		(copy as InputEventMouseButton).pressed = false
	elif copy is InputEventJoypadButton:
		(copy as InputEventJoypadButton).pressed = false
	elif copy is InputEventJoypadMotion:
		var motion := copy as InputEventJoypadMotion
		motion.axis_value = 1.0 if motion.axis_value >= 0.0 else -1.0
	else:
		return null
	return copy


func _same_class(a: InputEvent, b: InputEvent) -> bool:
	return a.get_class() == b.get_class()
