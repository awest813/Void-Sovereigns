extends Control
## PerksTab — branch × tier skill-tree view. Each branch is a column; each
## tier is a row. Nodes are tiles; prerequisite lines are drawn with a _draw()
## override on the tree canvas.

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

const BRANCHES := [
	{"id": PerkDefinition.Branch.COMBAT,   "label": "COMBAT",   "color": Color("#d94a4a")},
	{"id": PerkDefinition.Branch.SURVIVAL, "label": "SURVIVAL", "color": Color("#6cbf5a")},
	{"id": PerkDefinition.Branch.TECH,     "label": "TECH",     "color": Color("#2be0c8")},
]

const TIERS := 5

var _canvas: Control
var _points_label: Label
## Map perk id → Rect2 (for line drawing).
var _tile_rects: Dictionary = {}
## Map perk id → PanelContainer (for redraw).
var _tile_nodes: Dictionary = {}

func _ready() -> void:
	_build()
	ProgressionState.perk_unlocked.connect(func(_id): refresh())
	ProgressionState.perk_points_changed.connect(func(_p): refresh())
	ProgressionState.level_up.connect(func(_l): refresh())
	refresh()

func _build() -> void:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", Palette.SP_MD)
	add_child(col)

	var header_row := HBoxContainer.new()
	var title := Label.new()
	title.text = "// PERK MATRIX"
	title.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_row.add_child(title)
	_points_label = Label.new()
	header_row.add_child(_points_label)
	col.add_child(header_row)

	# Branch-header row
	var branch_row := HBoxContainer.new()
	branch_row.add_theme_constant_override("separation", Palette.SP_LG)
	for b in BRANCHES:
		var b_header := Label.new()
		b_header.text = b["label"]
		b_header.add_theme_color_override("font_color", b["color"])
		b_header.add_theme_font_size_override("font_size", 16)
		b_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		b_header.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		branch_row.add_child(b_header)
	col.add_child(branch_row)

	# Scrollable canvas
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_canvas = Control.new()
	_canvas.custom_minimum_size = Vector2(720, TIERS * 130 + 40)
	_canvas.draw.connect(_on_canvas_draw)
	scroll.add_child(_canvas)

func refresh() -> void:
	_tile_rects.clear()
	for n in _tile_nodes.values():
		n.queue_free()
	_tile_nodes.clear()

	_points_label.text = "◆ %d PERK PTS   LVL %d" % [ProgressionState.perk_points, ProgressionState.level]

	# Layout perks by (branch, tier).
	var perks: Array = ContentRegistry.perks()
	var col_w: float = _canvas.size.x / float(BRANCHES.size())
	if col_w < 240.0:
		col_w = 240.0
	var row_h: float = 130.0
	for perk in perks:
		var def := perk as PerkDefinition
		if def == null:
			continue
		var branch_index := _branch_index(def.branch)
		if branch_index == -1:
			continue
		var x := branch_index * col_w + Palette.SP_MD
		var y := (def.tier - 1) * row_h + Palette.SP_MD
		var tile := _build_tile(def)
		tile.position = Vector2(x, y)
		tile.size = Vector2(col_w - Palette.SP_LG, row_h - Palette.SP_MD)
		_canvas.add_child(tile)
		_tile_nodes[String(def.id)] = tile
		_tile_rects[String(def.id)] = Rect2(tile.position, tile.size)
	_canvas.queue_redraw()

func _build_tile(def: PerkDefinition) -> Control:
	var owned := ProgressionState.has_perk(String(def.id))
	var can := ProgressionState.can_unlock_perk(String(def.id))

	var border := Palette.LINE
	var bg := Palette.BG_PANEL_ALT
	if owned:
		border = Palette.ACCENT
		bg = Color(Palette.ACCENT.r, Palette.ACCENT.g, Palette.ACCENT.b, 0.18)
	elif can:
		border = Palette.SUCCESS
	else:
		border = Palette.LINE

	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(2)
	style.content_margin_left = Palette.SP_MD
	style.content_margin_right = Palette.SP_MD
	style.content_margin_top = Palette.SP_SM
	style.content_margin_bottom = Palette.SP_SM
	panel.add_theme_stylebox_override("panel", style)

	var col := VBoxContainer.new()
	panel.add_child(col)

	var top := HBoxContainer.new()
	var icon := Label.new()
	icon.text = def.icon
	icon.add_theme_font_size_override("font_size", 18)
	icon.add_theme_color_override("font_color", border)
	top.add_child(icon)
	var tier_lbl := Label.new()
	tier_lbl.text = "  T%d" % def.tier
	tier_lbl.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	tier_lbl.add_theme_font_size_override("font_size", 10)
	tier_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	tier_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	top.add_child(tier_lbl)
	col.add_child(top)

	var name_lbl := Label.new()
	name_lbl.text = def.display_name
	name_lbl.add_theme_font_size_override("font_size", 13)
	col.add_child(name_lbl)

	var desc_lbl := Label.new()
	desc_lbl.text = def.description
	desc_lbl.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	desc_lbl.add_theme_font_size_override("font_size", 11)
	desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
	col.add_child(desc_lbl)

	var btn := Button.new()
	if owned:
		btn.text = "OWNED"
		btn.disabled = true
	elif can:
		btn.text = "UNLOCK (%d pt)" % def.cost
		btn.pressed.connect(func(): ProgressionState.unlock_perk(String(def.id)))
	else:
		var reason := "REQ LVL %d" % def.required_level()
		if ProgressionState.level < def.required_level():
			btn.text = "LVL %d NEEDED" % def.required_level()
		elif ProgressionState.perk_points < def.cost:
			btn.text = "%d PTS NEEDED" % def.cost
		else:
			btn.text = "LOCKED · REQ"
		btn.disabled = true
		btn.set_meta("reason", reason)
	col.add_child(btn)
	return panel

func _on_canvas_draw() -> void:
	# Draw prerequisite lines between tiles.
	for perk in ContentRegistry.perks():
		var def := perk as PerkDefinition
		if def == null:
			continue
		var my_rect: Rect2 = _tile_rects.get(String(def.id), Rect2())
		if my_rect.size == Vector2.ZERO:
			continue
		for req in def.requires:
			var req_rect: Rect2 = _tile_rects.get(String(req), Rect2())
			if req_rect.size == Vector2.ZERO:
				continue
			var from_pt := req_rect.position + Vector2(req_rect.size.x * 0.5, req_rect.size.y)
			var to_pt   := my_rect.position + Vector2(my_rect.size.x * 0.5, 0.0)
			var owned_ok := ProgressionState.has_perk(String(req))
			var col_line := Palette.ACCENT if owned_ok else Palette.LINE
			_canvas.draw_line(from_pt, to_pt, col_line, 2.0, true)

func _branch_index(branch: int) -> int:
	for i in BRANCHES.size():
		if BRANCHES[i]["id"] == branch:
			return i
	return -1
