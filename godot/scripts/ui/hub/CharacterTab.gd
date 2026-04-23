extends Control
## CharacterTab — paper-doll armour slots + live stat readout.

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

const SLOTS := [
	{"key": "head",     "label": "HEAD"},
	{"key": "chest",    "label": "CHEST"},
	{"key": "arms",     "label": "ARMS"},
	{"key": "legs",     "label": "LEGS"},
	{"key": "rig",      "label": "RIG"},
	{"key": "backpack", "label": "BACKPACK"},
]

const DAMAGE_TYPES := [
	{"id": 0, "label": "BALLISTIC"},
	{"id": 1, "label": "VOID"},
	{"id": 2, "label": "THERMAL"},
	{"id": 3, "label": "MELEE"},
	{"id": 4, "label": "EXPLOSIVE"},
	{"id": 5, "label": "HAZARD"},
]

var _slot_buttons: Dictionary = {}    # slot_key → Button
var _stats_label:  RichTextLabel

func _ready() -> void:
	_build()
	LoadoutState.loadout_changed.connect(refresh)
	ProgressionState.perk_unlocked.connect(func(_id): refresh())
	refresh()

func _build() -> void:
	var row := HBoxContainer.new()
	row.set_anchors_preset(Control.PRESET_FULL_RECT)
	row.add_theme_constant_override("separation", Palette.SP_LG)
	add_child(row)

	# Paper-doll column
	var doll := VBoxContainer.new()
	doll.custom_minimum_size = Vector2(260, 0)
	doll.add_theme_constant_override("separation", Palette.SP_SM)
	var header := Label.new()
	header.text = "// GEAR"
	header.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	doll.add_child(header)
	for slot in SLOTS:
		var btn := Button.new()
		btn.text = "%s  —  EMPTY" % slot["label"]
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		var key: String = slot["key"]
		btn.pressed.connect(func(): _on_slot_pressed(key))
		doll.add_child(btn)
		_slot_buttons[key] = btn
	row.add_child(doll)

	# Stats column
	var stats_panel := PanelContainer.new()
	stats_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stats_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stats_panel.add_theme_stylebox_override("panel", Palette.panel_style())
	_stats_label = RichTextLabel.new()
	_stats_label.bbcode_enabled = true
	_stats_label.scroll_active = false
	_stats_label.fit_content = true
	stats_panel.add_child(_stats_label)
	row.add_child(stats_panel)

func refresh() -> void:
	for slot in SLOTS:
		var key: String = slot["key"]
		var btn: Button = _slot_buttons[key]
		var def := LoadoutState.get_equipped_armor(key)
		if def:
			var color := HubPalette.rarity_color(def.rarity)
			btn.text = "%s  —  %s" % [slot["label"], def.display_name.to_upper()]
			btn.add_theme_color_override("font_color", color)
		else:
			btn.text = "%s  —  EMPTY" % slot["label"]
			btn.remove_theme_color_override("font_color")
	_stats_label.text = _build_stats_text()

func _build_stats_text() -> String:
	var lines: Array[String] = []
	lines.append("[b][color=#2be0c8]// CHARACTER STATS[/color][/b]")
	lines.append("")
	lines.append("LEVEL         %d" % ProgressionState.level)
	lines.append("PERKS OWNED   %d" % ProgressionState.perks.size())
	lines.append("SKILLS OWNED  %d" % ProgressionState.skills.size())
	lines.append("")
	# Armor value sum
	var total_armor := 0
	for key in LoadoutState.equipped_armor.keys():
		var def := LoadoutState.get_equipped_armor(key)
		if def:
			total_armor += def.armor_value
	lines.append("ARMOR (sum)   %d" % total_armor)
	lines.append("")
	lines.append("[b]DAMAGE RESISTANCES[/b]  (1.00 = no reduction)")
	for dt in DAMAGE_TYPES:
		var mult: float = LoadoutState.aggregate_resistance(dt["id"])
		var pct: int = int((1.0 - mult) * 100.0)
		var colorcode := "#6cbf5a" if pct > 0 else "#7c8894"
		lines.append("  %-10s  x%.2f   [color=%s]-%d%%[/color]" % [dt["label"], mult, colorcode, pct])
	lines.append("")
	# Movement & stealth modifiers (multiply across armor pieces)
	var move_mult := 1.0
	var stealth_mult := 1.0
	for key in LoadoutState.equipped_armor.keys():
		var def2 := LoadoutState.get_equipped_armor(key)
		if def2:
			move_mult *= def2.move_speed_mult
			stealth_mult *= def2.stealth_mult
	lines.append("MOVE  SPEED   x%.2f" % move_mult)
	lines.append("STEALTH       x%.2f" % stealth_mult)
	lines.append("")
	var cap: int = InventoryState.total_capacity()
	var used: int = InventoryState.used_capacity()
	lines.append("INVENTORY     %d / %d cells" % [used, cap])
	return "\n".join(lines)

func _on_slot_pressed(slot_key: String) -> void:
	# Left-click clears slot; choosing armor happens via InventoryTab.
	LoadoutState.unequip_armor(slot_key)
