extends Control
## TraderTab — Tarkov-vendor style sell list. Reuses EconomyState market
## prices (decaying saturation) and the existing sell flow.

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

var _list: VBoxContainer
var _summary: Label

func _ready() -> void:
	_build()
	InventoryState.inventory_changed.connect(refresh)
	EconomyState.credits_changed.connect(func(_c): refresh())
	refresh()

func _build() -> void:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", Palette.SP_MD)
	add_child(col)

	var header := HBoxContainer.new()
	var title := Label.new()
	title.text = "// TRADER — KIROV SCRAP & SALVAGE"
	title.add_theme_color_override("font_color", Palette.ACCENT)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)
	_summary = Label.new()
	header.add_child(_summary)
	col.add_child(header)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", Palette.SP_SM)
	scroll.add_child(_list)

	var footer := Label.new()
	footer.text = "Prices depress with repeated sales — Kirov remembers."
	footer.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	footer.add_theme_font_size_override("font_size", 11)
	col.add_child(footer)

func refresh() -> void:
	_summary.text = "CR %d" % EconomyState.credits
	for c in _list.get_children():
		c.queue_free()
	for entry in InventoryState.as_legacy_array():
		_list.add_child(_build_row(entry))

func _build_row(entry: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", Palette.panel_style())
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", Palette.SP_LG)
	panel.add_child(row)

	var name_lbl := Label.new()
	var count: int = int(entry.get("count", 1))
	var name_text: String = String(entry.get("name", entry.get("id", "?")))
	name_lbl.text = "%s  ×%d" % [name_text, count]
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_lbl)

	var base_val: int = int(entry.get("base_value", entry.get("value", 0)))
	var price: int = EconomyState.get_market_value(String(entry.get("id", "")), base_val)
	var price_lbl := Label.new()
	price_lbl.text = "%d cr" % price
	price_lbl.add_theme_color_override("font_color", Palette.ACCENT)
	row.add_child(price_lbl)

	var sell_btn := Button.new()
	sell_btn.text = "SELL 1"
	var row_entry: Dictionary = entry
	sell_btn.pressed.connect(func(): EconomyState.sell_item(row_entry))
	row.add_child(sell_btn)
	return panel
