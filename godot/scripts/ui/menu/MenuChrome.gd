class_name MenuChrome
extends RefCounted
## Shared constructors for the title screen, pause menu, and settings.

static func title(text: String, size: int, color: Color = HubPalette.TEXT_PRIMARY) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	return label


static func body(text: String, color: Color = HubPalette.TEXT_MUTED) -> Label:
	var label := title(text, 14, color)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label


static func button(text: String, wide: float = 320.0) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.custom_minimum_size = Vector2(wide, 40)
	btn.focus_mode = Control.FOCUS_ALL
	return btn


static func backdrop() -> ColorRect:
	var rect := ColorRect.new()
	rect.color = HubPalette.BG_DEEP
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_STOP
	return rect


static func plate() -> PanelContainer:
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", HubPalette.panel_style(HubPalette.BG_PANEL, HubPalette.LINE, 1))
	return panel
