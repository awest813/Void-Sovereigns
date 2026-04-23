extends Control
## MissionBoardUI — mission selection. Ports MissionBoardUI.ts.

@onready var mission_list: VBoxContainer = $Panel/Scroll/MissionList
@onready var close_button: Button        = $Panel/CloseButton
@onready var accept_button: Button       = $Panel/AcceptButton
@onready var detail_label: Label         = $Panel/DetailLabel

var _selected_mission: Dictionary = {}

func _ready() -> void:
	close_button.pressed.connect(func(): hide())
	accept_button.pressed.connect(_on_accept)
	MissionState.mission_status_changed.connect(func(_s): refresh())
	hide()

func refresh() -> void:
	_selected_mission = {}
	accept_button.disabled = true
	detail_label.text = ""

	for child in mission_list.get_children():
		child.queue_free()

	var missions := DataManager.get_missions()
	for mission in missions:
		var completed := MissionState.completed_missions.has(mission["id"])
		var btn := Button.new()
		btn.text = "[%s] %s  [Diff: %d]" % [
			"✓" if completed else " ",
			mission["title"],
			mission["difficulty"]
		]
		btn.custom_minimum_size = Vector2(0, 40)
		btn.pressed.connect(func(m=mission): _on_mission_selected(m))
		btn.disabled = completed
		mission_list.add_child(btn)

func _on_mission_selected(mission: Dictionary) -> void:
	_selected_mission = mission
	detail_label.text = "%s\n%s\n\nReward: %d credits | %d XP" % [
		mission["title"],
		mission["description"],
		mission["credit_reward"],
		mission["xp_reward"],
	]
	accept_button.disabled = MissionState.completed_missions.has(mission["id"])

func _on_accept() -> void:
	if _selected_mission.is_empty():
		return
	MissionState.accept_mission(_selected_mission["id"])
	hide()
