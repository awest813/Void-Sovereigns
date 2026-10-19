extends Control
## DebriefUI — post-mission debrief. Ports DebriefUI.ts.

@onready var title_label: Label     = $Panel/TitleLabel
@onready var stats_label: Label     = $Panel/StatsLabel
@onready var loot_list: VBoxContainer = $Panel/LootList
@onready var continue_btn: Button   = $Panel/ContinueButton

func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.04, 0.05, 0.07, 0.84)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(bg)
	move_child(bg, 0)
	var plate := ColorRect.new()
	plate.color = Color("#14181c")
	plate.offset_right = 560.0
	plate.offset_bottom = 460.0
	plate.mouse_filter = Control.MOUSE_FILTER_IGNORE
	$Panel.add_child(plate)
	$Panel.move_child(plate, 0)
	title_label.add_theme_color_override("font_color", Color("#2be0c8"))
	stats_label.add_theme_color_override("font_color", Color("#d7dde3"))
	continue_btn.pressed.connect(_on_continue)
	MissionState.mission_status_changed.connect(_on_status_changed)
	hide()

func show_debrief(mission: Dictionary, loot: Array, xp_earned: int) -> void:
	title_label.text = "DEBRIEF: %s" % mission.get("title", "Unknown")
	stats_label.text = "XP EARNED: %d\nCREDITS EARNED: %d" % [
		xp_earned,
		mission.get("credit_reward", 0),
	]
	for child in loot_list.get_children():
		child.queue_free()
	for item in loot:
		var lbl := Label.new()
		lbl.text = "  • %s  (%d credits)" % [item.get("name", "Unknown"), item.get("base_value", 0)]
		loot_list.add_child(lbl)
	show()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func show_failure(reason: String = "Contract failed. No payout.") -> void:
	title_label.text = "KILLED IN ACTION"
	stats_label.text = reason
	_clear_loot()
	show()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _on_continue() -> void:
	if MissionState.mission_status == "success" or MissionState.mission_status == "failed":
		if MissionState.can_transition(MissionState.mission_status, "returnedToHub"):
			MissionState.transition("returnedToHub")
		if MissionState.can_transition(MissionState.mission_status, "none"):
			MissionState.transition("none")
	EconomyState.decay_saturations()
	SceneManager.switch_to("hub")
	hide()

func _on_status_changed(status: String) -> void:
	if status == "success":
		var mission: Dictionary = DataManager.get_mission(MissionState.active_mission_id)
		var tier: String = String(mission.get("loot_tier", "COMMON"))
		var loot: Array = LootData.roll_many(DataManager.get_loot_table(tier), 3)
		for item in loot:
			EconomyState.add_loot(item)
		var xp: int = int(mission.get("xp_reward", 0))
		ProgressionState.add_xp(xp)
		EconomyState.add_credits(int(mission.get("credit_reward", 0)))
		MissionState.complete_mission(MissionState.active_mission_id)
		show_debrief(mission, loot, xp)
	elif status == "failed":
		show_failure("You did not extract. The station kept your bunk. Nothing from this drop was paid out.")

func _clear_loot() -> void:
	for child in loot_list.get_children():
		child.queue_free()
