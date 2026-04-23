extends Node3D
## mission.gd — mission scene controller. Wires player, dungeon, HUD, and all systems.

@onready var mission_zone: Node3D  = $MissionZone
@onready var hud: Node             = $UI/HUD
@onready var debrief_ui: Control   = $UI/DebriefUI
@onready var loading_ui: CanvasLayer = $UI/LoadingUI

@onready var oxygen_system: Node   = $Systems/OxygenSystem
@onready var radio_chatter: AudioStreamPlayer = $Systems/RadioChatter

var _player: CharacterBody3D = null
var _health_system: Node = null
var _weapon_system: Node = null
var _extract_system: Node = null

func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

	# Build dungeon from mission seed
	var mission := DataManager.get_mission(MissionState.active_mission_id)
	var seed_val := float(MissionState.active_mission_id.hash() % 1_000_000) / 1_000_000.0

	var zone_data: Dictionary = mission_zone.build(seed_val)

	# Spawn player at dungeon spawn point
	var player_scene := load("res://scenes/player.tscn") as PackedScene
	_player = player_scene.instantiate()
	_player.position = zone_data["spawn_position"]
	add_child(_player)
	_player.add_to_group("player")

	# Wire systems
	_health_system = _player.get_node("HealthSystem")
	_weapon_system = _player.get_node("WeaponSystem")
	var hud_node   = _player.get_node("HUD")

	_health_system.damaged.connect(func(cur, mx): hud_node.update_health(cur, mx))
	_health_system.shield_changed.connect(func(pct): hud_node.update_shield(pct))
	_health_system.died.connect(_on_player_died)
	_health_system.can_avoid_damage = Callable(_player, "is_dodging")

	_player.impulse_changed.connect(hud_node.update_impulse)

	oxygen_system.setup(hud_node)

	# Wire extraction point
	var extract_node := zone_data.get("extraction_node") as Node3D
	if extract_node:
		_extract_system = $Systems/ExtractionSystem
		if _extract_system:
			_extract_system.global_position = extract_node.global_position
			_extract_system.setup(hud_node, _health_system)

	# Room culling
	var culling: Node = $Systems/RoomActivitySystem
	if culling:
		culling.setup(mission_zone, _player)

	# Transition to objective active
	if MissionState.can_transition(MissionState.mission_status, "objectiveActive"):
		MissionState.transition("objectiveActive")

	# Show debrief when mission succeeds/fails
	MissionState.mission_status_changed.connect(_on_mission_status_changed)

	hud_node.show_message("DEPLOYED: %s" % mission.get("title", "Unknown"), 4.0)

func _on_player_died() -> void:
	MissionState.transition("failed")

func _on_mission_status_changed(status: String) -> void:
	if status == "success" or status == "failed":
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
		if debrief_ui and debrief_ui.has_method("show_debrief") and status == "success":
			pass  # DebriefUI listens to MissionState itself
