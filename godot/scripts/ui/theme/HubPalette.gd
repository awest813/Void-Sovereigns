class_name HubPalette
extends RefCounted
## HubPalette — Marathon × Tarkov visual language constants + StyleBox factory
## for the hub UI. All tabs and panels derive their colours from this class
## so restyling a single place repaints the whole hub.

# ── Core palette (Marathon chrome + Tarkov density) ──────────────────────────
const BG_DEEP:       Color = Color("#0b0e11")
const BG_PANEL:      Color = Color("#14181c")
const BG_PANEL_ALT:  Color = Color("#1b2026")
const LINE:          Color = Color("#2a323b")
const TEXT_PRIMARY:  Color = Color("#d7dde3")
const TEXT_MUTED:    Color = Color("#7c8894")
const ACCENT:        Color = Color("#2be0c8")
const WARN:          Color = Color("#e07a2b")
const DANGER:        Color = Color("#d94a4a")
const SUCCESS:       Color = Color("#6cbf5a")

# ── Rarity accents ───────────────────────────────────────────────────────────
const RARITY_COMMON:    Color = Color("#7c8894")
const RARITY_UNCOMMON:  Color = Color("#6cbf5a")
const RARITY_RARE:      Color = Color("#4aa7e0")
const RARITY_EPIC:      Color = Color("#a368e0")
const RARITY_LEGENDARY: Color = Color("#e0b23a")

# ── Spacing scale ────────────────────────────────────────────────────────────
const SP_XS := 2
const SP_SM := 4
const SP_MD := 8
const SP_LG := 16
const SP_XL := 24

# ── Cell size for grid inventory (Tarkov-style pixel-precise) ────────────────
const CELL_PX := 48

static func rarity_color(rarity: int) -> Color:
	match rarity:
		ItemDefinition.Rarity.UNCOMMON:  return RARITY_UNCOMMON
		ItemDefinition.Rarity.RARE:      return RARITY_RARE
		ItemDefinition.Rarity.EPIC:      return RARITY_EPIC
		ItemDefinition.Rarity.LEGENDARY: return RARITY_LEGENDARY
	return RARITY_COMMON

# ── StyleBox factories ───────────────────────────────────────────────────────

static func panel_style(bg: Color = BG_PANEL, border: Color = LINE, border_w: int = 1) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(border_w)
	s.corner_radius_top_left = 0
	s.corner_radius_top_right = 0
	s.corner_radius_bottom_left = 0
	s.corner_radius_bottom_right = 0
	s.content_margin_left = SP_MD
	s.content_margin_right = SP_MD
	s.content_margin_top = SP_MD
	s.content_margin_bottom = SP_MD
	return s

static func button_style(bg: Color, border: Color, border_w: int = 1) -> StyleBoxFlat:
	var s := panel_style(bg, border, border_w)
	s.content_margin_left = SP_LG
	s.content_margin_right = SP_LG
	s.content_margin_top = SP_MD
	s.content_margin_bottom = SP_MD
	return s

static func tile_style(rarity: int) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = BG_PANEL_ALT
	s.border_color = rarity_color(rarity)
	s.set_border_width_all(2)
	s.content_margin_left = SP_SM
	s.content_margin_right = SP_SM
	s.content_margin_top = SP_SM
	s.content_margin_bottom = SP_SM
	return s

# ── Full Theme resource builder ──────────────────────────────────────────────

static func build_theme() -> Theme:
	var t := Theme.new()

	# ── Label
	t.set_color("font_color", "Label", TEXT_PRIMARY)
	t.set_font_size("font_size", "Label", 14)

	# ── Panel / PanelContainer
	t.set_stylebox("panel", "Panel", panel_style(BG_PANEL))
	t.set_stylebox("panel", "PanelContainer", panel_style(BG_PANEL))

	# ── Button states
	var btn_normal   := button_style(BG_PANEL,     LINE,   1)
	var btn_hover    := button_style(BG_PANEL_ALT, ACCENT, 1)
	var btn_pressed  := button_style(ACCENT,       ACCENT, 1)
	btn_pressed.bg_color = Color(ACCENT.r, ACCENT.g, ACCENT.b, 0.25)
	var btn_disabled := button_style(BG_DEEP,      LINE,   1)
	btn_disabled.bg_color = Color(BG_DEEP.r, BG_DEEP.g, BG_DEEP.b, 0.6)

	t.set_stylebox("normal",   "Button", btn_normal)
	t.set_stylebox("hover",    "Button", btn_hover)
	t.set_stylebox("pressed",  "Button", btn_pressed)
	t.set_stylebox("disabled", "Button", btn_disabled)
	t.set_stylebox("focus",    "Button", btn_hover)
	t.set_color("font_color",          "Button", TEXT_PRIMARY)
	t.set_color("font_hover_color",    "Button", ACCENT)
	t.set_color("font_pressed_color",  "Button", ACCENT)
	t.set_color("font_disabled_color", "Button", TEXT_MUTED)
	t.set_font_size("font_size", "Button", 14)

	# ── ProgressBar
	var pb_bg := StyleBoxFlat.new()
	pb_bg.bg_color = BG_DEEP
	pb_bg.set_border_width_all(1)
	pb_bg.border_color = LINE
	var pb_fg := StyleBoxFlat.new()
	pb_fg.bg_color = ACCENT
	t.set_stylebox("background", "ProgressBar", pb_bg)
	t.set_stylebox("fill",       "ProgressBar", pb_fg)

	# ── LineEdit
	t.set_stylebox("normal", "LineEdit", panel_style(BG_DEEP, LINE, 1))
	t.set_stylebox("focus",  "LineEdit", panel_style(BG_DEEP, ACCENT, 1))
	t.set_color("font_color", "LineEdit", TEXT_PRIMARY)

	# ── TabContainer (we mostly hide default tabs, but style the panel)
	t.set_stylebox("panel", "TabContainer", panel_style(BG_PANEL))

	return t
