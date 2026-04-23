extends Control
## HubShell — full-screen Marathon × Tarkov hub UI.
##
## Layout (code-built, no .tscn needed):
##   ┌─────────────────────────────────────────────────────────────┐
##   │  TOP BAR: callsign · credits · XP · perk/skill pips · ⚙    │
##   ├─────┬───────────────────────────────────────────────────────┤
##   │     │                                                       │
##   │ NAV │                  TAB CONTENT                          │
##   │     │                                                       │
##   ├─────┴───────────────────────────────────────────────────────┤
##   │  STATUS: hints · selected-item name · radio line            │
##   └─────────────────────────────────────────────────────────────┘
##
## Nav buttons switch the child TabContainer. Toggle the shell with
## ui_inventory / ui_character / ui_perks / ui_skills (preselects tab).

const HubPaletteScript := preload("res://scripts/ui/theme/HubPalette.gd")
const CharacterTabScript := preload("res://scripts/ui/hub/CharacterTab.gd")
const InventoryTabScript := preload("res://scripts/ui/hub/InventoryTab.gd")
const LoadoutTabScript   := preload("res://scripts/ui/hub/LoadoutTab.gd")
const PerksTabScript     := preload("res://scripts/ui/hub/PerksTab.gd")
const SkillsTabScript    := preload("res://scripts/ui/hub/SkillsTab.gd")
const TraderTabScript    := preload("res://scripts/ui/hub/TraderTab.gd")
const LaunchTabScript    := preload("res://scripts/ui/hub/LaunchTab.gd")

signal closed()

enum Tab { CHARACTER, INVENTORY, LOADOUT, PERKS, SKILLS, TRADER, LAUNCH }

const TAB_DEFS := [
	{"id": Tab.CHARACTER, "label": "CHARACTER"},
	{"id": Tab.INVENTORY, "label": "INVENTORY"},
	{"id": Tab.LOADOUT,   "label": "LOADOUT"},
	{"id": Tab.PERKS,     "label": "PERKS"},
	{"id": Tab.SKILLS,    "label": "SKILLS"},
	{"id": Tab.TRADER,    "label": "TRADER"},
	{"id": Tab.LAUNCH,    "label": "LAUNCH"},
]

var _tab_container: TabContainer
var _nav_buttons:   Dictionary = {}   # Tab → Button
var _credits_label: Label
var _xp_bar:        ProgressBar
var _xp_text:       Label
var _perk_pips:     Label
var _skill_pips:    Label
var _status_line:   Label
var _active_tab:    int = Tab.CHARACTER

func _ready() -> void:
	theme = HubPaletteScript.build_theme()
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build()
	_wire_state_signals()
	_refresh_top_bar()
	_set_active_tab(Tab.CHARACTER)
	hide()

# ── Public API ────────────────────────────────────────────────────────────────

func open(tab: int = Tab.CHARACTER) -> void:
	show()
	_set_active_tab(tab)
	_refresh_top_bar()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func close() -> void:
	hide()
	Input.mouse_mode = Input.MOUSE_MODE_CONFINED
	closed.emit()

func set_status(line: String) -> void:
	if _status_line:
		_status_line.text = line

# ── Input ─────────────────────────────────────────────────────────────────────

func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()
		return
	var pressed_tab: int = -1
	if event.is_action_pressed("ui_inventory"):
		pressed_tab = Tab.INVENTORY
	elif event.is_action_pressed("ui_character"):
		pressed_tab = Tab.CHARACTER
	elif event.is_action_pressed("ui_perks"):
		pressed_tab = Tab.PERKS
	elif event.is_action_pressed("ui_skills"):
		pressed_tab = Tab.SKILLS
	if pressed_tab != -1:
		if visible and _active_tab == pressed_tab:
			close()
		else:
			open(pressed_tab)
		get_viewport().set_input_as_handled()

# ── Build layout ──────────────────────────────────────────────────────────────

func _build() -> void:
	# Background
	var bg := ColorRect.new()
	bg.color = HubPaletteScript.BG_DEEP
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(bg)

	# Subtle grain overlay
	var grain := ColorRect.new()
	grain.set_anchors_preset(Control.PRESET_FULL_RECT)
	grain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var shader := load("res://scripts/ui/theme/hub_grain.gdshader") as Shader
	if shader:
		var mat := ShaderMaterial.new()
		mat.shader = shader
		grain.material = mat
	grain.color = Color(1.0, 1.0, 1.0, 0.04)
	add_child(grain)

	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.offset_left = HubPaletteScript.SP_LG
	root.offset_right = -HubPaletteScript.SP_LG
	root.offset_top = HubPaletteScript.SP_LG
	root.offset_bottom = -HubPaletteScript.SP_LG
	root.add_theme_constant_override("separation", HubPaletteScript.SP_MD)
	add_child(root)

	root.add_child(_build_top_bar())

	var body := HBoxContainer.new()
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", HubPaletteScript.SP_MD)
	root.add_child(body)

	body.add_child(_build_left_rail())

	_tab_container = TabContainer.new()
	_tab_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_tab_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_tab_container.tabs_visible = false   # custom left rail drives selection
	_populate_tabs()
	body.add_child(_tab_container)

	root.add_child(_build_status_bar())

func _build_top_bar() -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", HubPaletteScript.panel_style())
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", HubPaletteScript.SP_LG)
	panel.add_child(row)

	var callsign := Label.new()
	callsign.text = "CALLSIGN — DRIFTER-07"
	callsign.add_theme_color_override("font_color", HubPaletteScript.ACCENT)
	callsign.add_theme_font_size_override("font_size", 18)
	row.add_child(callsign)

	var sep1 := VSeparator.new(); row.add_child(sep1)

	_credits_label = Label.new()
	_credits_label.text = "CR 0"
	row.add_child(_credits_label)

	var sep2 := VSeparator.new(); row.add_child(sep2)

	var xp_box := VBoxContainer.new()
	xp_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_xp_text = Label.new()
	_xp_text.text = "LVL 1"
	_xp_text.add_theme_color_override("font_color", HubPaletteScript.TEXT_MUTED)
	xp_box.add_child(_xp_text)
	_xp_bar = ProgressBar.new()
	_xp_bar.min_value = 0
	_xp_bar.max_value = 1000
	_xp_bar.show_percentage = false
	_xp_bar.custom_minimum_size = Vector2(240, 6)
	xp_box.add_child(_xp_bar)
	row.add_child(xp_box)

	var sep3 := VSeparator.new(); row.add_child(sep3)

	_perk_pips = Label.new()
	_perk_pips.text = "◆ PERK PTS 0"
	row.add_child(_perk_pips)

	_skill_pips = Label.new()
	_skill_pips.text = "◇ SKILL PTS 0"
	row.add_child(_skill_pips)

	var sep4 := VSeparator.new(); row.add_child(sep4)

	var close_btn := Button.new()
	close_btn.text = "× CLOSE"
	close_btn.pressed.connect(close)
	row.add_child(close_btn)
	return panel

func _build_left_rail() -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(200, 0)
	panel.add_theme_stylebox_override("panel", HubPaletteScript.panel_style())
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", HubPaletteScript.SP_SM)
	panel.add_child(col)

	var header := Label.new()
	header.text = "// NAV"
	header.add_theme_color_override("font_color", HubPaletteScript.TEXT_MUTED)
	header.add_theme_font_size_override("font_size", 11)
	col.add_child(header)

	for entry in TAB_DEFS:
		var btn := Button.new()
		btn.text = entry["label"]
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.toggle_mode = true
		var tab_id: int = entry["id"]
		btn.pressed.connect(func(): _set_active_tab(tab_id))
		col.add_child(btn)
		_nav_buttons[tab_id] = btn
	return panel

func _populate_tabs() -> void:
	# The order here must match TAB_DEFS order.
	_tab_container.add_child(_make_tab("Character", CharacterTabScript.new()))
	_tab_container.add_child(_make_tab("Inventory", InventoryTabScript.new()))
	_tab_container.add_child(_make_tab("Loadout",   LoadoutTabScript.new()))
	_tab_container.add_child(_make_tab("Perks",     PerksTabScript.new()))
	_tab_container.add_child(_make_tab("Skills",    SkillsTabScript.new()))
	_tab_container.add_child(_make_tab("Trader",    TraderTabScript.new()))
	_tab_container.add_child(_make_tab("Launch",    LaunchTabScript.new()))

func _make_tab(title: String, inner: Control) -> Control:
	var wrap := PanelContainer.new()
	wrap.name = title
	wrap.add_theme_stylebox_override("panel", HubPaletteScript.panel_style(HubPaletteScript.BG_PANEL_ALT))
	inner.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	inner.size_flags_vertical = Control.SIZE_EXPAND_FILL
	wrap.add_child(inner)
	return wrap

func _build_status_bar() -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", HubPaletteScript.panel_style())
	var row := HBoxContainer.new()
	panel.add_child(row)

	_status_line = Label.new()
	_status_line.text = "[TAB] inventory   [C] character   [P] perks   [K] skills   [ESC] close"
	_status_line.add_theme_color_override("font_color", HubPaletteScript.TEXT_MUTED)
	_status_line.add_theme_font_size_override("font_size", 12)
	_status_line.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(_status_line)
	return panel

# ── Tab management ────────────────────────────────────────────────────────────

func _set_active_tab(tab_id: int) -> void:
	_active_tab = tab_id
	_tab_container.current_tab = tab_id
	for id in _nav_buttons.keys():
		var btn: Button = _nav_buttons[id]
		btn.button_pressed = (id == tab_id)

# ── Live top-bar updates ──────────────────────────────────────────────────────

func _wire_state_signals() -> void:
	EconomyState.credits_changed.connect(func(_c): _refresh_top_bar())
	ProgressionState.xp_changed.connect(func(_xp, _lvl): _refresh_top_bar())
	ProgressionState.perk_points_changed.connect(func(_p): _refresh_top_bar())
	ProgressionState.skill_points_changed.connect(func(_p): _refresh_top_bar())

func _refresh_top_bar() -> void:
	if _credits_label:
		_credits_label.text = "CR %d" % EconomyState.credits
	if _xp_text:
		_xp_text.text = "LVL %d  %d / %d XP" % [
			ProgressionState.level,
			ProgressionState.xp,
			ProgressionState.xp_to_next_level(),
		]
	if _xp_bar:
		_xp_bar.max_value = ProgressionState.xp_to_next_level()
		_xp_bar.value     = ProgressionState.xp
	if _perk_pips:
		_perk_pips.text = "◆ PERK PTS %d" % ProgressionState.perk_points
	if _skill_pips:
		_skill_pips.text = "◇ SKILL PTS %d" % ProgressionState.skill_points
