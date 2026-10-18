extends Control
## Title screen. Boot scene for desktop and Steam builds.

var _continue: Button
var _settings: SettingsPanel
var _credits: Control
var _confirm: Control
var _steam: Label


func _ready() -> void:
	theme = HubPalette.build_theme()
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build()
	_settings = SettingsPanel.new()
	add_child(_settings)
	_settings.back_pressed.connect(func() -> void: _focus_menu())
	if not SteamService.steam_state_changed.is_connected(_on_steam):
		SteamService.steam_state_changed.connect(_on_steam)
	_on_steam(SteamService.status_text)
	_refresh_continue()
	_focus_menu()


func _build() -> void:
	add_child(MenuChrome.backdrop())

	var column := VBoxContainer.new()
	column.set_anchors_preset(Control.PRESET_CENTER_LEFT)
	column.offset_left = 72
	column.offset_top = -220
	column.offset_right = 460
	column.offset_bottom = 260
	column.add_theme_constant_override("separation", 8)
	add_child(column)

	column.add_child(MenuChrome.body("SINGLE PLAYER EXTRACTION"))
	column.add_child(MenuChrome.title("VOID SOVEREIGNS", 42, HubPalette.ACCENT))
	var version := str(ProjectSettings.get_setting("application/config/version", ""))
	column.add_child(MenuChrome.body("Version %s" % version))

	column.add_child(HSeparator.new())
	_continue = MenuChrome.button("CONTINUE")
	_continue.pressed.connect(_on_continue)
	column.add_child(_continue)
	var new_game := MenuChrome.button("NEW GAME")
	new_game.pressed.connect(_on_new_game)
	column.add_child(new_game)
	var settings := MenuChrome.button("SETTINGS")
	settings.pressed.connect(func() -> void: _settings.open())
	column.add_child(settings)
	var credits := MenuChrome.button("CREDITS")
	credits.pressed.connect(func() -> void: _credits.show())
	column.add_child(credits)
	var quit := MenuChrome.button("QUIT")
	quit.pressed.connect(_quit)
	column.add_child(quit)

	_steam = MenuChrome.body("Steam offline")
	_steam.position = Vector2(72, 0)
	_steam.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_steam.offset_left = 72
	_steam.offset_top = -48
	_steam.offset_right = 520
	_steam.offset_bottom = -16
	add_child(_steam)

	_credits = _overlay_panel(_credits_text(), "CLOSE")
	_credits.hide()
	add_child(_credits)
	(_credits.get_node("Box/Action") as Button).pressed.connect(func() -> void: _credits.hide())

	_confirm = _overlay_panel("Erase the current operator and start over?\nProgress, inventory, and credits on this machine will be deleted.", "ERASE AND START")
	_confirm.hide()
	add_child(_confirm)
	var erase: Button = _confirm.get_node("Box/Action")
	erase.pressed.connect(_start_new)
	var cancel := MenuChrome.button("CANCEL")
	cancel.pressed.connect(func() -> void: _confirm.hide())
	_confirm.get_node("Box").add_child(cancel)


func _credits_text() -> String:
	return "\n".join([
		"VOID SOVEREIGNS",
		"",
		"A single-player sci-fi extraction game.",
		"",
		"Godot Engine — MIT License",
		"Quaternius, Ultimate Space Kit — CC0 1.0",
		"First-person controller template — Micheal Parks, MIT (see LICENSE)",
		"",
		"No warranty. Pause with Esc or Start. The run ends when you extract or die.",
	])


func _overlay_panel(text: String, action_text: String) -> Control:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_STOP
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.72)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(dim)
	var box := VBoxContainer.new()
	box.name = "Box"
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.offset_left = -280
	box.offset_top = -160
	box.offset_right = 280
	box.offset_bottom = 160
	box.add_theme_constant_override("separation", 12)
	root.add_child(box)
	var plate := MenuChrome.plate()
	plate.size_flags_vertical = Control.SIZE_EXPAND_FILL
	box.add_child(plate)
	var inner := MarginContainer.new()
	inner.add_theme_constant_override("margin_left", 16)
	inner.add_theme_constant_override("margin_right", 16)
	inner.add_theme_constant_override("margin_top", 16)
	inner.add_theme_constant_override("margin_bottom", 16)
	plate.add_child(inner)
	var copy := MenuChrome.body(text, HubPalette.TEXT_PRIMARY)
	copy.custom_minimum_size = Vector2(480, 0)
	inner.add_child(copy)
	var action := MenuChrome.button(action_text)
	action.name = "Action"
	box.add_child(action)
	return root


func _refresh_continue() -> void:
	_continue.disabled = not _has_campaign()


func _has_campaign() -> bool:
	if not MissionState.completed_missions.is_empty():
		return true
	if MissionState.mission_status != "none":
		return true
	if ProgressionState.level > 1 or ProgressionState.xp > 0:
		return true
	if EconomyState.credits > 0:
		return true
	if not InventoryState.stacks.is_empty():
		return true
	return false


func _on_continue() -> void:
	if _continue.disabled:
		return
	SceneManager.switch_to("hub")


func _on_new_game() -> void:
	if _has_campaign():
		_confirm.show()
		return
	_start_new()


func _start_new() -> void:
	_confirm.hide()
	SaveSystem.begin_fresh(0)
	SceneManager.switch_to("hub")


func _quit() -> void:
	SaveSystem.flush()
	get_tree().quit()


func _on_steam(text: String) -> void:
	if _steam:
		_steam.text = text


func _focus_menu() -> void:
	if _continue and not _continue.disabled:
		_continue.grab_focus()
	elif _continue:
		var parent := _continue.get_parent()
		if parent and parent.get_child_count() > 5 and parent.get_child(5) is Control:
			(parent.get_child(5) as Control).grab_focus()


func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("ui_cancel"):
		return
	if _settings and _settings.visible:
		if not _settings.is_listening():
			_settings.close()
		get_viewport().set_input_as_handled()
		return
	if _credits.visible:
		_credits.hide()
		get_viewport().set_input_as_handled()
	elif _confirm.visible:
		_confirm.hide()
		get_viewport().set_input_as_handled()
