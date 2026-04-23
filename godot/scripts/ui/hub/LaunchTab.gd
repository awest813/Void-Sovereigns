extends Control
## LaunchTab — contract cards + "READY" checks + DEPLOY button. Replaces
## the old MissionBoardUI deployment flow for users of HubShell.

const Palette := preload("res://scripts/ui/theme/HubPalette.gd")

var _list: VBoxContainer
var _ready_panel: Label

func _ready() -> void:
	_build()
	MissionState.mission_status_changed.connect(func(_s): refresh())
	LoadoutState.loadout_changed.connect(refresh)
	refresh()

func _build() -> void:
	var col := VBoxContainer.new()
	col.set_anchors_preset(Control.PRESET_FULL_RECT)
	col.add_theme_constant_override("separation", Palette.SP_MD)
	add_child(col)

	var header := Label.new()
	header.text = "// CONTRACTS"
	header.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	col.add_child(header)

	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(scroll)
	_list = VBoxContainer.new()
	_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list.add_theme_constant_override("separation", Palette.SP_SM)
	scroll.add_child(_list)

	_ready_panel = Label.new()
	_ready_panel.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	_ready_panel.add_theme_font_size_override("font_size", 11)
	col.add_child(_ready_panel)

func refresh() -> void:
	for c in _list.get_children():
		c.queue_free()
	for mission in MissionData.MISSIONS:
		_list.add_child(_build_card(mission))
	_ready_panel.text = _readiness_text()

func _build_card(mission: Dictionary) -> Control:
	var panel := PanelContainer.new()
	var style := Palette.panel_style()
	var is_active := MissionState.active_mission_id == mission.get("id", "")
	if is_active:
		style.border_color = Palette.ACCENT
		style.set_border_width_all(2)
	panel.add_theme_stylebox_override("panel", style)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", Palette.SP_LG)
	panel.add_child(row)

	var info := VBoxContainer.new()
	info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var title := Label.new()
	title.text = mission.get("title", "?")
	title.add_theme_font_size_override("font_size", 15)
	info.add_child(title)
	var sub := Label.new()
	sub.text = "DIFF %d · BIOME %s · XP %d · CR %d" % [
		int(mission.get("difficulty", 1)),
		String(mission.get("biome", "")).to_upper(),
		int(mission.get("xp_reward", 0)),
		int(mission.get("credit_reward", 0)),
	]
	sub.add_theme_color_override("font_color", Palette.TEXT_MUTED)
	sub.add_theme_font_size_override("font_size", 11)
	info.add_child(sub)
	var desc := Label.new()
	desc.text = mission.get("description", "")
	desc.autowrap_mode = TextServer.AUTOWRAP_WORD
	desc.add_theme_font_size_override("font_size", 12)
	info.add_child(desc)
	row.add_child(info)

	var actions := VBoxContainer.new()
	var accept := Button.new()
	accept.text = "ACTIVE" if is_active else "ACCEPT"
	accept.disabled = is_active
	var mid: String = mission.get("id", "")
	accept.pressed.connect(func(): _accept(mid))
	actions.add_child(accept)
	var deploy := Button.new()
	deploy.text = "DEPLOY"
	deploy.disabled = not is_active or not _is_ready()
	deploy.pressed.connect(_deploy)
	actions.add_child(deploy)
	row.add_child(actions)
	return panel

func _accept(id: String) -> void:
	MissionState.active_mission_id = id
	MissionState.transition("accepted")

func _deploy() -> void:
	if MissionState.can_transition(MissionState.mission_status, "deployed"):
		MissionState.transition("deployed")
		SceneManager.switch_to("mission")

func _is_ready() -> bool:
	var w: WeaponDefinition = LoadoutState.get_primary_weapon()
	if w == null:
		return false
	if w.weapon_class != WeaponDefinition.WeaponClass.MELEE:
		if LoadoutState.ammo.get(w.legacy_weapon_type(), 0) <= 0:
			return false
	return true

func _readiness_text() -> String:
	var checks: Array[String] = []
	var w: WeaponDefinition = LoadoutState.get_primary_weapon()
	checks.append("[%s] Primary weapon equipped" % ("✓" if w else "·"))
	var has_chest := LoadoutState.get_equipped_armor("chest") != null
	checks.append("[%s] Chest armor equipped" % ("✓" if has_chest else "·"))
	var has_ammo := w != null and (w.weapon_class == WeaponDefinition.WeaponClass.MELEE or LoadoutState.ammo.get(w.legacy_weapon_type(), 0) > 0)
	checks.append("[%s] Ammo reserve > 0" % ("✓" if has_ammo else "·"))
	return "   ".join(checks)
