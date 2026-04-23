extends Control
## DebriefUI — post-mission debrief. Ports DebriefUI.ts.

@onready var title_label: Label     = $Panel/TitleLabel
@onready var stats_label: Label     = $Panel/StatsLabel
@onready var loot_list: VBoxContainer = $Panel/LootList
@onready var continue_btn: Button   = $Panel/ContinueButton

func _ready() -> void:
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

func _on_continue() -> void:
	MissionState.transition("returnedToHub")
	MissionState.transition("none")
	EconomyState.decay_saturations()
	SceneManager.switch_to("hub")
	hide()

func _on_status_changed(status: String) -> void:
	if status == "success":
		var mission := DataManager.get_mission(MissionState.active_mission_id)
		var tier    := mission.get("loot_tier", "COMMON")
		var loot    := LootData.roll_many(DataManager.get_loot_table(tier), 3)
		for item in loot:
			EconomyState.add_loot(item)
		var xp := mission.get("xp_reward", 0)
		ProgressionState.add_xp(xp)
		EconomyState.add_credits(mission.get("credit_reward", 0))
		MissionState.complete_mission(MissionState.active_mission_id)
		show_debrief(mission, loot, xp)
