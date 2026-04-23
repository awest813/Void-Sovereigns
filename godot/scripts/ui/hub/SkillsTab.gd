extends Control
## SkillsTab — list of active/passive skills with unlock buttons and a
## hotbar-binding panel for active skills (Z / X / V).

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

var _list: VBoxContainer
var _hotbar_row: HBoxContainer
var _header: Label

func _ready() -> void:
	_build()
	ProgressionState.skill_unlocked.connect(func(_id): refresh())
	ProgressionState.skill_points_changed.connect(func(_p): refresh())
	ProgressionState.skill_bound.connect(func(_s, _i): refresh())
	refresh()

func _build() -> void:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", Palette.SP_MD)
	add_child(col)

	_header = Label.new()
	_header.text = "// SKILLS"
	_header.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	col.add_child(_header)

	# Hotbar panel
	var hb_panel := PanelContainer.new()
	hb_panel.add_theme_stylebox_override("panel", Palette.panel_style())
	_hotbar_row = HBoxContainer.new()
	_hotbar_row.add_theme_constant_override("separation", Palette.SP_LG)
	hb_panel.add_child(_hotbar_row)
	col.add_child(hb_panel)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", Palette.SP_SM)
	scroll.add_child(_list)

func refresh() -> void:
	_header.text = "// SKILLS     ◇ %d PTS   LVL %d" % [ProgressionState.skill_points, ProgressionState.level]

	# Hotbar
	for c in _hotbar_row.get_children():
		c.queue_free()
	var key_labels := ["Z", "X", "V"]
	for i in 3:
		var slot := VBoxContainer.new()
		var key_lbl := Label.new()
		key_lbl.text = "[ %s ]" % key_labels[i]
		key_lbl.add_theme_color_override("font_color", Palette.ACCENT)
		slot.add_child(key_lbl)
		var bound_id: String = ProgressionState.skill_hotbar[i]
		var name_lbl := Label.new()
		if bound_id == "":
			name_lbl.text = "— empty —"
			name_lbl.add_theme_color_override("font_color", Palette.TEXT_MUTED)
		else:
			var def := ContentRegistry.get_skill(StringName(bound_id))
			name_lbl.text = def.display_name if def else bound_id
		slot.add_child(name_lbl)
		var clear_btn := Button.new()
		clear_btn.text = "CLEAR"
		var slot_i := i
		clear_btn.pressed.connect(func(): ProgressionState.bind_skill_to_slot(slot_i, ""))
		slot.add_child(clear_btn)
		_hotbar_row.add_child(slot)

	# Skill cards
	for c in _list.get_children():
		c.queue_free()
	for skill in ContentRegistry.skills():
		var def := skill as SkillDefinition
		if def == null:
			continue
		_list.add_child(_build_row(def))

func _build_row(def: SkillDefinition) -> Control:
	var owned := ProgressionState.has_skill(String(def.id))
	var can := ProgressionState.can_unlock_skill(String(def.id))

	var panel := PanelContainer.new()
	var style := Palette.panel_style()
	style.border_color = Palette.ACCENT if owned else (Palette.SUCCESS if can else Palette.LINE)
	panel.add_theme_stylebox_override("panel", style)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", Palette.SP_LG)
	panel.add_child(row)

	var icon := Label.new()
	icon.text = def.icon
	icon.add_theme_font_size_override("font_size", 22)
	icon.custom_minimum_size = Vector2(44, 0)
	icon.add_theme_color_override("font_color", Palette.ACCENT)
	row.add_child(icon)

	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var name_lbl := Label.new()
	var kind_str := "ACTIVE" if def.is_active() else "PASSIVE"
	name_lbl.text = "%s   [%s · T%d · %s]" % [def.display_name, kind_str, def.tier, def.branch_to_string().to_upper()]
	name_lbl.add_theme_font_size_override("font_size", 14)
	info.add_child(name_lbl)
	var desc_lbl := Label.new()
	desc_lbl.text = def.description
	desc_lbl.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	desc_lbl.add_theme_font_size_override("font_size", 11)
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	info.add_child(desc_lbl)
	if def.is_active():
		var meta := Label.new()
		meta.text = "CD %.1fs · E %d" % [def.cooldown, def.energy_cost]
		meta.add_theme_color_override("font_color", Palette.TEXT_MUTED)
		meta.add_theme_font_size_override("font_size", 11)
		info.add_child(meta)
	row.add_child(info)

	# Action column
	var actions := VBoxContainer.new()
	if owned:
		var owned_lbl := Label.new()
		owned_lbl.text = "OWNED"
		owned_lbl.add_theme_color_override("font_color", Palette.ACCENT)
		actions.add_child(owned_lbl)
		if def.is_active():
			var bind_row := HBoxContainer.new()
			var keys := ["Z", "X", "V"]
			for i in 3:
				var btn := Button.new()
				btn.text = keys[i]
				var slot_i := i
				var id_s := String(def.id)
				btn.pressed.connect(func(): ProgressionState.bind_skill_to_slot(slot_i, id_s))
				bind_row.add_child(btn)
			actions.add_child(bind_row)
	elif can:
		var btn := Button.new()
		btn.text = "UNLOCK (%d pt)" % def.cost
		btn.pressed.connect(func(): ProgressionState.unlock_skill(String(def.id)))
		actions.add_child(btn)
	else:
		var locked := Label.new()
		if ProgressionState.level < def.required_level():
			locked.text = "LVL %d" % def.required_level()
		elif ProgressionState.skill_points < def.cost:
			locked.text = "%d PTS" % def.cost
		else:
			locked.text = "REQ"
		locked.add_theme_color_override("font_color", Palette.TEXT_MUTED)
		actions.add_child(locked)
	row.add_child(actions)
	return panel
