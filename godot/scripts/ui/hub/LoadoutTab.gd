extends Control
## LoadoutTab — three weapon slots (primary / secondary / melee) + ammo
## counters and weapon metadata.

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

const SLOTS := [
	{"key": "primary",   "label": "PRIMARY"},
	{"key": "secondary", "label": "SECONDARY"},
	{"key": "melee",     "label": "MELEE"},
]

var _slot_cards: Dictionary = {}   # slot → Control

func _ready() -> void:
	_build()
	LoadoutState.loadout_changed.connect(refresh)
	LoadoutState.ammo_changed.connect(func(_t, _c): refresh())
	refresh()

func _build() -> void:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", Palette.SP_MD)
	add_child(col)

	var header := Label.new()
	header.text = "// LOADOUT"
	header.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	col.add_child(header)

	for slot in SLOTS:
		var card := _build_slot_card(slot["key"], slot["label"])
		_slot_cards[slot["key"]] = card
		col.add_child(card)

	var hint := Label.new()
	hint.text = "Equip weapons from the INVENTORY tab. Melee slot auto-selects melee-class weapons."
	hint.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	hint.add_theme_font_size_override("font_size", 11)
	col.add_child(hint)

func _build_slot_card(slot_key: String, slot_label: String) -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", Palette.panel_style())
	var row := HBoxContainer.new()
	row.name = "Row"
	row.add_theme_constant_override("separation", Palette.SP_LG)
	panel.add_child(row)

	var slot_lbl := Label.new()
	slot_lbl.text = slot_label
	slot_lbl.custom_minimum_size = Vector2(110, 0)
	slot_lbl.add_theme_color_override("font_color", Palette.ACCENT)
	row.add_child(slot_lbl)

	var body := VBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.name = "Body"
	row.add_child(body)

	var unequip := Button.new()
	unequip.text = "UNEQUIP"
	unequip.pressed.connect(func(): LoadoutState.equip_weapon_id(slot_key, ""))
	row.add_child(unequip)
	panel.set_meta("slot_key", slot_key)
	return panel

func refresh() -> void:
	for slot in SLOTS:
		var card: PanelContainer = _slot_cards[slot["key"]]
		var body: VBoxContainer = card.get_node("Row/Body")
		for child in body.get_children():
			child.queue_free()
		var def := _get_slot_weapon(slot["key"])
		if def == null:
			var empty := Label.new()
			empty.text = "— empty —"
			empty.add_theme_color_override("font_color", Palette.TEXT_MUTED)
			body.add_child(empty)
			continue
		var name_lbl := Label.new()
		name_lbl.text = def.display_name.to_upper()
		name_lbl.add_theme_color_override("font_color", HubPalette.rarity_color(def.rarity))
		name_lbl.add_theme_font_size_override("font_size", 16)
		body.add_child(name_lbl)

		var stat_lbl := Label.new()
		stat_lbl.text = "DMG %d  ·  RATE %.2fs  ·  DPS %d  ·  MAG %d" % [
			int(def.damage), def.fire_rate, int(def.dps()), def.mag_size,
		]
		stat_lbl.add_theme_color_override("font_color", Palette.TEXT_MUTED)
		stat_lbl.add_theme_font_size_override("font_size", 12)
		body.add_child(stat_lbl)

		var ammo_reserve: int = LoadoutState.ammo.get(def.legacy_weapon_type(), 0)
		var ammo_lbl := Label.new()
		if def.weapon_class == WeaponDefinition.WeaponClass.MELEE:
			ammo_lbl.text = "MELEE — no ammo"
		else:
			ammo_lbl.text = "AMMO RESERVE  %d" % ammo_reserve
		body.add_child(ammo_lbl)

		# Mod slot chips
		if not def.mod_slots.is_empty():
			var chips := HBoxContainer.new()
			for slot_name in def.mod_slots:
				var chip := Label.new()
				chip.text = "[ %s ]" % String(slot_name).to_upper()
				chip.add_theme_color_override("font_color", Palette.ACCENT)
				chip.add_theme_font_size_override("font_size", 10)
				chips.add_child(chip)
			body.add_child(chips)

func _get_slot_weapon(slot_key: String) -> WeaponDefinition:
	match slot_key:
		"primary":   return LoadoutState.get_primary_weapon()
		"secondary": return LoadoutState.get_secondary_weapon()
		"melee":     return LoadoutState.get_melee_weapon()
	return null
