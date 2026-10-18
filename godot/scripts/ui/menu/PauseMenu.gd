extends Node
## Single-player pause. Also freezes the sim while the Steam overlay is open.

var _layer: CanvasLayer
var _panel: Control
var _banner: Label
var _settings: SettingsPanel
var _abandon: Button
var _quit: Button
var _user_paused: bool = false
var _overlay_hold: bool = false
var _quit_armed: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_layer = CanvasLayer.new()
	_layer.layer = 100
	_layer.process_mode = Node.PROCESS_MODE_ALWAYS
	add_child(_layer)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.theme = HubPalette.build_theme()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_layer.add_child(root)

	_banner = MenuChrome.title("PAUSED — STEAM OVERLAY", 18, HubPalette.ACCENT)
	_banner.set_anchors_preset(Control.PRESET_CENTER_TOP)
	_banner.offset_top = 24
	_banner.offset_left = -180
	_banner.offset_right = 180
	_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_banner.hide()
	root.add_child(_banner)

	_panel = Control.new()
	_panel.set_anchors_preset(Control.PRESET_FULL_RECT)
	_panel.hide()
	root.add_child(_panel)
	var dim := ColorRect.new()
	dim.color = Color(0.02, 0.03, 0.04, 0.78)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_STOP
	_panel.add_child(dim)

	var box := VBoxContainer.new()
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.offset_left = -180
	box.offset_top = -200
	box.offset_right = 180
	box.offset_bottom = 220
	box.add_theme_constant_override("separation", 8)
	_panel.add_child(box)
	box.add_child(MenuChrome.title("PAUSED", 32, HubPalette.ACCENT))

	var resume := MenuChrome.button("RESUME")
	resume.pressed.connect(_resume)
	box.add_child(resume)
	var settings := MenuChrome.button("SETTINGS")
	settings.pressed.connect(func() -> void: _settings.open())
	box.add_child(settings)
	_abandon = MenuChrome.button("ABANDON CONTRACT")
	_abandon.pressed.connect(_abandon_contract)
	box.add_child(_abandon)
	var title := MenuChrome.button("RETURN TO TITLE")
	title.pressed.connect(_to_title)
	box.add_child(title)
	_quit = MenuChrome.button("QUIT")
	_quit.pressed.connect(_quit_game)
	box.add_child(_quit)

	_settings = SettingsPanel.new()
	_settings.hide()
	root.add_child(_settings)
	SceneManager.scene_changed.connect(_on_scene_changed)


func hold_for_overlay() -> void:
	_overlay_hold = true
	_apply()


func release_overlay() -> void:
	_overlay_hold = false
	_apply()


func _unhandled_input(event: InputEvent) -> void:
	if not _playable():
		return
	if _settings and _settings.visible and _settings.is_listening():
		return
	var pause_pressed := event.is_action_pressed("pause")
	var cancel_pressed := event.is_action_pressed("ui_cancel")
	if not pause_pressed and not cancel_pressed:
		return
	if _user_paused:
		if _settings and _settings.visible:
			_settings.close()
		else:
			_resume()
		get_viewport().set_input_as_handled()
	elif pause_pressed:
		_user_paused = true
		_quit_armed = false
		_quit.text = "QUIT"
		_apply()
		get_viewport().set_input_as_handled()


func _resume() -> void:
	_user_paused = false
	_quit_armed = false
	if _settings:
		_settings.hide()
	_apply()


func _abandon_contract() -> void:
	_user_paused = false
	_overlay_hold = false
	get_tree().paused = false
	MissionState.clear_mission()
	_panel.hide()
	SceneManager.switch_to("hub")


func _to_title() -> void:
	_user_paused = false
	_overlay_hold = false
	get_tree().paused = false
	if _scene_path().ends_with("mission.tscn"):
		MissionState.clear_mission()
	_panel.hide()
	SceneManager.switch_to("main_menu")


func _quit_game() -> void:
	if not _quit_armed:
		_quit_armed = true
		_quit.text = "CONFIRM QUIT"
		return
	SaveSystem.flush()
	get_tree().quit()


func _on_scene_changed(scene_id: String) -> void:
	if scene_id == "main_menu":
		_user_paused = false
		_overlay_hold = false
		_panel.hide()
		_banner.hide()
		get_tree().paused = false


func _apply() -> void:
	if not _playable():
		_user_paused = false
		get_tree().paused = false
		_panel.hide()
		_banner.hide()
		return
	var frozen := _user_paused or _overlay_hold
	get_tree().paused = frozen
	_panel.visible = _user_paused
	_banner.visible = _overlay_hold and not _user_paused
	_abandon.visible = _scene_path().ends_with("mission.tscn")
	if frozen:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		if _user_paused and _panel.get_child_count() > 1:
			var box := _panel.get_child(1)
			if box.get_child_count() > 1 and box.get_child(1) is Control:
				(box.get_child(1) as Control).grab_focus()
	else:
		_restore_mouse()


func _restore_mouse() -> void:
	var scene := get_tree().current_scene
	if scene == null:
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		return
	var path := scene.scene_file_path
	if path.ends_with("mission.tscn"):
		var debrief := scene.get_node_or_null("UI/DebriefUI")
		if debrief != null and debrief.visible:
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
		return
	if path.ends_with("hub.tscn"):
		if _modal_open(scene):
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		else:
			Input.mouse_mode = Input.MOUSE_MODE_CONFINED
		return
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE


func _modal_open(scene: Node) -> bool:
	for node in get_tree().get_nodes_in_group("modal_ui"):
		if node is CanvasItem and (node as CanvasItem).visible and scene.is_ancestor_of(node):
			return true
	return false


func _playable() -> bool:
	var path := _scene_path()
	return path.ends_with("hub.tscn") or path.ends_with("mission.tscn")


func _scene_path() -> String:
	var scene := get_tree().current_scene
	if scene == null:
		return ""
	return scene.scene_file_path
