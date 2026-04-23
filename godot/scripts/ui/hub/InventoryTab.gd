extends Control
## InventoryTab — two-pane inventory. Left: equippable list filtered by
## category (weapon/armor/etc). Right: stash grid (Tarkov-style visual, but
## kept simple — one flat grid container with rarity-bordered tiles).

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

var _filter: int = -1   # ItemDefinition.Category or -1 for ALL
var _grid:   GridContainer
var _summary: Label
var _filter_buttons: Dictionary = {}  # category → Button

const FILTERS := [
	{"id": -1, "label": "ALL"},
	{"id": ItemDefinition.Category.WEAPON,     "label": "WEAPONS"},
	{"id": ItemDefinition.Category.ARMOR,      "label": "ARMOR"},
	{"id": ItemDefinition.Category.AMMO,       "label": "AMMO"},
	{"id": ItemDefinition.Category.CONSUMABLE, "label": "CONSUMABLES"},
	{"id": ItemDefinition.Category.MOD,        "label": "MODS"},
	{"id": ItemDefinition.Category.RELIC,      "label": "RELICS"},
	{"id": ItemDefinition.Category.MISC,       "label": "MISC"},
]

func _ready() -> void:
	_build()
	InventoryState.inventory_changed.connect(refresh)
	LoadoutState.loadout_changed.connect(refresh)
	refresh()

func _build() -> void:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", Palette.SP_MD)
	add_child(col)

	# Filter strip
	var filter_row := HBoxContainer.new()
	filter_row.add_theme_constant_override("separation", Palette.SP_SM)
	for f in FILTERS:
		var btn := Button.new()
		btn.text = f["label"]
		btn.toggle_mode = true
		btn.button_pressed = (f["id"] == _filter)
		var id: int = f["id"]
		btn.pressed.connect(func(): _set_filter(id))
		filter_row.add_child(btn)
		_filter_buttons[id] = btn
	col.add_child(filter_row)

	# Action row
	var action_row := HBoxContainer.new()
	action_row.add_theme_constant_override("separation", Palette.SP_SM)
	_summary = Label.new()
	_summary.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_summary.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	action_row.add_child(_summary)
	var sort_btn := Button.new()
	sort_btn.text = "SORT"
	sort_btn.pressed.connect(func(): InventoryState.sort())
	action_row.add_child(sort_btn)
	col.add_child(action_row)

	# Scroll + grid
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_grid = GridContainer.new()
	_grid.columns = 6
	_grid.add_theme_constant_override("h_separation", Palette.SP_SM)
	_grid.add_theme_constant_override("v_separation", Palette.SP_SM)
	scroll.add_child(_grid)

func _set_filter(cat: int) -> void:
	_filter = cat
	for key in _filter_buttons.keys():
		_filter_buttons[key].button_pressed = (key == cat)
	refresh()

func refresh() -> void:
	for child in _grid.get_children():
		child.queue_free()
	var visible_count := 0
	for stack in InventoryState.stacks:
		var def := _lookup_def(stack.get("id", ""))
		if def == null:
			continue
		if _filter != -1 and int(def.category) != _filter:
			continue
		_grid.add_child(_build_tile(stack, def))
		visible_count += 1
	_summary.text = "%d / %d cells used   ·   %d items shown" % [
		InventoryState.used_capacity(),
		InventoryState.total_capacity(),
		visible_count,
	]

func _build_tile(stack: Dictionary, def: ItemDefinition) -> Control:
	var tile := PanelContainer.new()
	tile.custom_minimum_size = Vector2(Palette.CELL_PX * def.grid_w + 16, Palette.CELL_PX * def.grid_h + 40)
	tile.add_theme_stylebox_override("panel", Palette.tile_style(def.rarity))

	var col := VBoxContainer.new()
	tile.add_child(col)

	var top := HBoxContainer.new()
	var icon := Label.new()
	icon.text = def.icon
	icon.add_theme_font_size_override("font_size", 20)
	icon.add_theme_color_override("font_color", HubPalette.rarity_color(def.rarity))
	top.add_child(icon)
	var count: int = int(stack.get("count", 1))
	if count > 1:
		var count_lbl := Label.new()
		count_lbl.text = "x%d" % count
		count_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		count_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count_lbl.add_theme_color_override("font_color", Palette.TEXT_MUTED)
		top.add_child(count_lbl)
	col.add_child(top)

	var name_lbl := Label.new()
	name_lbl.text = def.display_name
	name_lbl.add_theme_font_size_override("font_size", 12)
	col.add_child(name_lbl)

	var meta := Label.new()
	var mv := EconomyState.get_market_value(String(def.id), def.base_value)
	meta.text = "%s · %d cr" % [def.rarity_to_string().to_upper(), mv]
	meta.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	meta.add_theme_font_size_override("font_size", 11)
	col.add_child(meta)

	var actions := HBoxContainer.new()
	actions.add_theme_constant_override("separation", Palette.SP_SM)
	if def is WeaponDefinition:
		var equip_primary := Button.new()
		equip_primary.text = "EQUIP"
		equip_primary.pressed.connect(func(): _equip_weapon(def))
		actions.add_child(equip_primary)
	elif def is ArmorDefinition:
		var equip_armor := Button.new()
		equip_armor.text = "EQUIP"
		equip_armor.pressed.connect(func(): LoadoutState.equip_armor(String(def.id)))
		actions.add_child(equip_armor)
	var sell := Button.new()
	sell.text = "SELL"
	sell.pressed.connect(func(): _sell_one(stack, def))
	actions.add_child(sell)
	var drop := Button.new()
	drop.text = "DROP"
	drop.pressed.connect(func(): InventoryState.remove_stack(stack))
	actions.add_child(drop)
	col.add_child(actions)
	return tile

func _equip_weapon(def: ItemDefinition) -> void:
	var slot := "primary"
	if def is WeaponDefinition and def.weapon_class == WeaponDefinition.WeaponClass.MELEE:
		slot = "melee"
	LoadoutState.equip_weapon_id(slot, String(def.id))

func _sell_one(stack: Dictionary, def: ItemDefinition) -> void:
	var one := def.to_dict()
	one["_stack_ref"] = stack
	EconomyState.sell_item(one)

func _lookup_def(id) -> ItemDefinition:
	var cr := get_node_or_null("/root/ContentRegistry")
	if cr == null:
		return null
	return cr.get_item(StringName(id))
