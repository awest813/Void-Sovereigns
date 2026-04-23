extends Area3D
## ExtractionSystem — Area3D that counts down on player proximity.
## Ports ExtractionSystem.ts. Place in the mission scene on the extraction room.

signal extraction_complete()
signal extraction_progress_changed(percent: float)

@export var hold_duration: float = 15.0
@export var pressure_spawn_interval: float = 11.0
@export var spawn_bot_interval: float = 5.0

var _progress: float = 0.0
var _is_extracting: bool = false
var _last_spawn: float = 0.0
var _last_pressure_spawn: float = 0.0
var _pressure_announced: bool = false
var _player_inside: bool = false
var _hud: Node = null
var _health: Node = null    # HealthSystem

## Scene to spawn during extraction pressure
@export var security_bot_scene: PackedScene = null

func setup(hud: Node, health: Node) -> void:
	_hud = hud
	_health = health
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

func _process(delta: float) -> void:
	var status := MissionState.mission_status
	if status != "objectiveComplete" and status != "extractionAvailable":
		return

	if not _pressure_announced:
		_pressure_announced = true
		_show_message("FACILITY ALERT: OBJECTIVE REMOVED. SECURITY IS HUNTING.", 4.0)

	# Pressure spawns before the player reaches the zone
	if status == "objectiveComplete":
		_last_pressure_spawn += delta
		if _last_pressure_spawn >= pressure_spawn_interval:
			_last_pressure_spawn = 0.0
			_spawn_bot(true)

	if _player_inside:
		if not _is_extracting:
			_is_extracting = true
			if status == "objectiveComplete":
				MissionState.transition("extractionAvailable")
			_show_message("ESTABLISHING UPLINK... HOLD THE ZONE", 3.0)

		_progress += delta
		extraction_progress_changed.emit(_progress / hold_duration)
		_show_message("EXTRACTION PROGRESS: %d%%" % int(_progress / hold_duration * 100), 0.5)

		# Periodic bot spawn during extraction
		if _progress > _last_spawn + spawn_bot_interval:
			_last_spawn = _progress
			_spawn_bot(true)

		if _progress >= hold_duration:
			_complete_extraction()
	elif _is_extracting:
		_is_extracting = false
		_progress = maxf(0.0, _progress - 0.5)
		_show_message("UPLINK LOST: RETURN TO EXTRACTION ZONE", 3.0)

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_inside = true

func _on_body_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_inside = false

func _complete_extraction() -> void:
	MissionState.transition("success")
	extraction_complete.emit()

func _spawn_bot(force_alert: bool = false) -> void:
	if security_bot_scene == null:
		return
	var bot := security_bot_scene.instantiate()
	bot.position = global_position + Vector3(
		randf_range(-5.0, 5.0), 1.0, randf_range(-5.0, 5.0)
	)
	get_tree().current_scene.add_child(bot)
	if force_alert and bot.has_method("force_alert"):
		bot.force_alert(global_position)
	_show_message("WARNING: SECURITY REINFORCEMENTS TRACKING YOUR SIGNAL", 2.2)

func _show_message(msg: String, duration: float) -> void:
	if _hud and _hud.has_method("show_message"):
		_hud.show_message(msg, duration)
