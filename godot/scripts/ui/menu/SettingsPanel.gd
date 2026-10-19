class_name SettingsPanel
extends Control
## Video, audio, and rebinding. Used by the title screen and the pause menu.

signal back_pressed

var _listening: String = ""
var _listen_frame: int = -1
var _bind_buttons: Dictionary = {}
var _window: OptionButton
var _resolution: OptionButton
var _fps: OptionButton
var _vsync: CheckButton
var _invert: CheckButton
var _master: HSlider
var _sfx: HSlider
var _music: HSlider
var _mouse: HSlider
var _stick: HSlider
var _fov: HSlider


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	theme = HubPalette.build_theme()
	_build()
	hide()
	if not GameSettings.changed.is_connected(_refresh_binds):
		GameSettings.changed.connect(_refresh_binds)


func open() -> void:
	_sync_widgets()
	_refresh_binds()
	show()


func close() -> void:
	_listening = ""
	hide()
	back_pressed.emit()


func is_listening() -> bool:
	return _listening != ""


func _build() -> void:
	var bg := MenuChrome.backdrop()
	bg.color = Color(HubPalette.BG_DEEP, 0.94)
	add_child(bg)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 48)
	margin.add_theme_constant_override("margin_right", 48)
	margin.add_theme_constant_override("margin_top", 36)
	margin.add_theme_constant_override("margin_bottom", 36)
	add_child(margin)

	var panel := MenuChrome.plate()
	margin.add_child(panel)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	panel.add_child(scroll)

	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", 10)
	scroll.add_child(box)

	box.add_child(MenuChrome.title("SETTINGS", 28, HubPalette.ACCENT))
	box.add_child(MenuChrome.title("VIDEO", 16, HubPalette.TEXT_MUTED))

	_window = OptionButton.new()
	for mode in GameSettings.WINDOW_MODES:
		_window.add_item(mode)
	_window.item_selected.connect(func(idx: int) -> void: GameSettings.set_window_mode(idx))
	box.add_child(_labeled("Window", _window))

	_resolution = OptionButton.new()
	for res in GameSettings.RESOLUTIONS:
		_resolution.add_item("%d × %d" % [res.x, res.y])
	_resolution.item_selected.connect(func(idx: int) -> void: GameSettings.set_resolution_index(idx))
	box.add_child(_labeled("Resolution", _resolution))

	_fps = OptionButton.new()
	for cap in GameSettings.FPS_OPTIONS:
		_fps.add_item("Uncapped" if cap == 0 else "%d FPS" % cap)
	_fps.item_selected.connect(func(idx: int) -> void: GameSettings.set_fps_cap(GameSettings.FPS_OPTIONS[idx]))
	box.add_child(_labeled("Frame limit", _fps))

	_vsync = CheckButton.new()
	_vsync.text = "VSync"
	_vsync.toggled.connect(func(on: bool) -> void: GameSettings.set_vsync(on))
	box.add_child(_vsync)

	box.add_child(MenuChrome.title("AUDIO", 16, HubPalette.TEXT_MUTED))
	_master = _slider(0.0, 1.0, 0.01)
	_master.value_changed.connect(func(v: float) -> void: GameSettings.set_master(v))
	box.add_child(_labeled("Master", _master))
	_sfx = _slider(0.0, 1.0, 0.01)
	_sfx.value_changed.connect(func(v: float) -> void: GameSettings.set_sfx(v))
	box.add_child(_labeled("Effects", _sfx))
	_music = _slider(0.0, 1.0, 0.01)
	_music.value_changed.connect(func(v: float) -> void: GameSettings.set_music(v))
	box.add_child(_labeled("Music", _music))

	box.add_child(MenuChrome.title("CONTROLS", 16, HubPalette.TEXT_MUTED))
	_mouse = _slider(0.001, 0.02, 0.0005)
	_mouse.value_changed.connect(func(v: float) -> void: GameSettings.set_mouse_sens(v))
	box.add_child(_labeled("Mouse", _mouse))
	_stick = _slider(0.4, 6.0, 0.1)
	_stick.value_changed.connect(func(v: float) -> void: GameSettings.set_stick_sens(v))
	box.add_child(_labeled("Stick", _stick))
	_fov = _slider(60.0, 110.0, 1.0)
	_fov.value_changed.connect(func(v: float) -> void: GameSettings.set_fov(v))
	box.add_child(_labeled("Field of view", _fov))
	_invert = CheckButton.new()
	_invert.text = "Invert look"
	_invert.toggled.connect(func(on: bool) -> void: GameSettings.set_invert_y(on))
	box.add_child(_invert)

	box.add_child(MenuChrome.body("Select a binding, then press a key, mouse button, or pad button. Esc cancels."))
	for action in GameSettings.REBINDABLE:
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 12)
		var name_label := Label.new()
		name_label.text = String(GameSettings.ACTION_LABELS.get(action, action))
		name_label.custom_minimum_size = Vector2(140, 0)
		name_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(name_label)
		var bind := Button.new()
		bind.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		bind.pressed.connect(_start_listen.bind(action))
		row.add_child(bind)
		_bind_buttons[action] = bind
		box.add_child(row)

	var reset := MenuChrome.button("RESET BINDINGS", 220)
	reset.pressed.connect(func() -> void: GameSettings.reset_bindings())
	box.add_child(reset)

	var back := MenuChrome.button("BACK", 220)
	back.pressed.connect(close)
	box.add_child(back)
	_sync_widgets()
	_refresh_binds()


func _labeled(text: String, control: Control) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)
	var name_label := Label.new()
	name_label.text = text
	name_label.custom_minimum_size = Vector2(140, 0)
	name_label.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	control.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)
	row.add_child(control)
	return row


func _slider(min_v: float, max_v: float, step: float) -> HSlider:
	var slider := HSlider.new()
	slider.min_value = min_v
	slider.max_value = max_v
	slider.step = step
	slider.custom_minimum_size = Vector2(220, 24)
	return slider


func _sync_widgets() -> void:
	_window.select(GameSettings.window_mode)
	_resolution.select(GameSettings.resolution_index)
	var fps_index := GameSettings.FPS_OPTIONS.find(GameSettings.fps_cap)
	_fps.select(fps_index if fps_index >= 0 else 0)
	_vsync.set_pressed_no_signal(GameSettings.vsync)
	_invert.set_pressed_no_signal(GameSettings.invert_y)
	_master.set_value_no_signal(GameSettings.vol_master)
	_sfx.set_value_no_signal(GameSettings.vol_sfx)
	_music.set_value_no_signal(GameSettings.vol_music)
	_mouse.set_value_no_signal(GameSettings.mouse_sens)
	_stick.set_value_no_signal(GameSettings.stick_sens)
	_fov.set_value_no_signal(GameSettings.fov)


func _refresh_binds() -> void:
	for action in _bind_buttons.keys():
		var button: Button = _bind_buttons[action]
		if _listening == String(action):
			button.text = "Press a key…"
		else:
			button.text = GameSettings.binding_text(String(action))


func _start_listen(action: String) -> void:
	_listening = action
	_listen_frame = Engine.get_process_frames()
	_refresh_binds()


func _input(event: InputEvent) -> void:
	if not visible or _listening == "":
		return
	if Engine.get_process_frames() <= _listen_frame:
		get_viewport().set_input_as_handled()
		return
	if event.is_echo():
		return
	if event is InputEventKey and event.pressed and (event as InputEventKey).physical_keycode == KEY_ESCAPE:
		_listening = ""
		_refresh_binds()
		get_viewport().set_input_as_handled()
		return
	var take := false
	if (event is InputEventKey or event is InputEventMouseButton or event is InputEventJoypadButton) and event.pressed:
		take = true
	elif event is InputEventJoypadMotion and absf((event as InputEventJoypadMotion).axis_value) > 0.7:
		take = true
	if not take:
		return
	GameSettings.set_binding(_listening, event)
	_listening = ""
	_refresh_binds()
	get_viewport().set_input_as_handled()
