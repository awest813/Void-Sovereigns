extends CharacterBody3D
## SecurityBot — 8-state FSM AI with NavigationAgent3D. Ports SecurityBot.ts.

signal bot_killed()
signal bot_alerted()

enum AIState { PATROL, INVESTIGATE, PEEK, ALERT, ATTACK, RETREAT, STAGGERED, DEAD }

# ── Node References ───────────────────────────────────────────────────────────
@onready var nav_agent: NavigationAgent3D   = $NavigationAgent3D
@onready var anim_player: AnimationPlayer  = $AnimationPlayer
@onready var hum_audio: AudioStreamPlayer3D = $HumAudio
@onready var muzzle_light: OmniLight3D     = $MuzzleLight
@onready var eye_mesh: MeshInstance3D      = $EyeMesh

# ── Exported Tunables ─────────────────────────────────────────────────────────
@export var detection_range: float   = 10.0
@export var attack_range: float      = 8.0
@export var patrol_radius: float     = 5.0
@export var fire_rate: float         = 0.8   # seconds between shots
@export var damage: float            = 5.0
@export var max_health: float        = 20.0
@export var stagger_duration: float  = 0.45
@export var max_speed: float         = 3.5

## Optional waypoint list for patrol routes.
@export var waypoints: Array[NodePath] = []

# ── State ─────────────────────────────────────────────────────────────────────
var _state: AIState = AIState.PATROL
var _health: float
var _suspicion: float = 0.0
var _last_fire_time: float = 0.0
var _state_entered_at: float = 0.0
var _has_announced_alert: bool = false
var _last_known_player_pos: Vector3 = Vector3.ZERO
var _peek_position: Vector3 = Vector3.ZERO
var _has_peek_pos: bool = false
var _waypoint_index: int = 0
var _start_position: Vector3
var _hud: Node = null
var _player: Node3D = null
var _player_health: Node = null  # HealthSystem

# Resolved waypoint positions
var _waypoint_positions: Array[Vector3] = []

func _ready() -> void:
	_health         = max_health
	_start_position = global_position
	add_to_group("security_bots")

	# Resolve NodePath waypoints to Vector3
	for wp_path in waypoints:
		var n := get_node_or_null(wp_path)
		if n:
			_waypoint_positions.append(n.global_position)

	_transition_to(AIState.PATROL)

func setup(player: Node3D, player_health: Node, hud: Node) -> void:
	_player        = player
	_player_health = player_health
	_hud           = hud

# ── Physics Process ───────────────────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	if _player == null or _state == AIState.DEAD:
		return

	var dist_to_player := global_position.distance_to(_player.global_position)
	var has_sight      := dist_to_player < detection_range and _has_line_of_sight()
	var can_see_player := _update_suspicion(delta, dist_to_player, has_sight)

	match _state:
		AIState.PATROL:
			_patrol()
			_play_anim("Walk")
			if can_see_player:
				_last_known_player_pos = _player.global_position
				_transition_to(AIState.ALERT if _suspicion >= 1.0 else AIState.PEEK)

		AIState.INVESTIGATE:
			_play_anim("Walk")
			nav_agent.target_position = _last_known_player_pos
			if global_position.distance_to(_last_known_player_pos) < 1.5:
				_transition_to(AIState.PATROL)
			if can_see_player:
				_last_known_player_pos = _player.global_position
				_transition_to(AIState.ALERT if _suspicion >= 1.0 else AIState.PEEK)

		AIState.PEEK:
			_play_anim("Idle")
			if has_sight:
				_last_known_player_pos = _player.global_position
			if not _has_peek_pos:
				_peek_position = _find_peek_position()
				_has_peek_pos = true
			nav_agent.target_position = _peek_position
			look_at(_player.global_position, Vector3.UP)
			if _suspicion >= 1.0:
				_transition_to(AIState.ALERT)
			elif not has_sight and Time.get_ticks_msec() / 1000.0 - _state_entered_at > 1.8:
				_transition_to(AIState.INVESTIGATE)

		AIState.ALERT:
			_play_anim("Idle")
			look_at(_player.global_position, Vector3.UP)
			if can_see_player:
				_last_known_player_pos = _player.global_position
			nav_agent.target_position = _player.global_position
			if dist_to_player < attack_range and can_see_player:
				_transition_to(AIState.ATTACK)
			elif not can_see_player and Time.get_ticks_msec() / 1000.0 - _state_entered_at > 1.8:
				_transition_to(AIState.INVESTIGATE)

		AIState.ATTACK:
			_play_anim("Shoot")
			look_at(_player.global_position, Vector3.UP)
			if can_see_player:
				_last_known_player_pos = _player.global_position
			if _health / max_health < 0.35 and dist_to_player < 5.0:
				_transition_to(AIState.RETREAT)
			else:
				nav_agent.target_position = _player.global_position
				_attack()
				if not can_see_player:
					_transition_to(AIState.INVESTIGATE)
				elif dist_to_player > attack_range:
					_transition_to(AIState.ALERT)

		AIState.RETREAT:
			_play_anim("Walk")
			var away := (global_position - _player.global_position).normalized()
			nav_agent.target_position = global_position + away * 5.0
			if dist_to_player > attack_range:
				_transition_to(AIState.ALERT if can_see_player else AIState.INVESTIGATE)

		AIState.STAGGERED:
			velocity *= 0.5
			_play_anim("Idle")
			if Time.get_ticks_msec() / 1000.0 - _state_entered_at > stagger_duration:
				_transition_to(AIState.ATTACK if can_see_player else AIState.INVESTIGATE)

	# Navigation movement
	if _state not in [AIState.DEAD, AIState.STAGGERED]:
		_apply_nav_velocity(delta)

func _apply_nav_velocity(delta: float) -> void:
	if nav_agent.is_navigation_finished():
		return
	var dir := (nav_agent.get_next_path_position() - global_position).normalized()
	dir.y = 0.0
	velocity = dir * max_speed * _extraction_pressure_mult()
	velocity += get_gravity() * delta
	move_and_slide()

# ── Private helpers ───────────────────────────────────────────────────────────

func _patrol() -> void:
	if _waypoint_positions.size() > 0:
		var target := _waypoint_positions[_waypoint_index]
		nav_agent.target_position = target
		if global_position.distance_to(target) < 1.5:
			_waypoint_index = (_waypoint_index + 1) % _waypoint_positions.size()
	else:
		if nav_agent.is_navigation_finished():
			nav_agent.target_position = _get_random_patrol_point()

func _get_random_patrol_point() -> Vector3:
	return _start_position + Vector3(
		randf_range(-patrol_radius, patrol_radius),
		0.0,
		randf_range(-patrol_radius, patrol_radius)
	)

func _has_line_of_sight() -> bool:
	if _player == null:
		return false
	var space  := get_world_3d().direct_space_state
	var origin := global_position + Vector3(0.0, 0.8, 0.0)
	var target := _player.global_position
	var query  := PhysicsRayQueryParameters3D.create(origin, target)
	query.exclude = [self]
	var result := space.intersect_ray(query)
	if result.has("collider"):
		return (result["collider"] as Node).is_in_group("player")
	return false

func _update_suspicion(delta: float, dist: float, has_sight: bool) -> bool:
	var exposure := 1.0
	if _player and _player.has_method("get_exposure_score"):
		exposure = _player.get_exposure_score()
	var range_factor := maxf(0.15, 1.0 - dist / detection_range)
	if has_sight:
		_suspicion += delta * exposure * (0.55 + range_factor) * _extraction_pressure_mult()
	elif _state != AIState.INVESTIGATE:
		_suspicion -= delta * 0.28
	_suspicion = clampf(_suspicion, 0.0, 1.35)
	return _suspicion > 0.28

func _extraction_pressure_mult() -> float:
	var s := MissionState.mission_status
	return 1.35 if s == "objectiveComplete" or s == "extractionAvailable" else 1.0

func _attack() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_fire_time < fire_rate:
		return
	_last_fire_time = now

	if _player == null:
		return
	var space  := get_world_3d().direct_space_state
	var origin := global_position + Vector3(0.0, 0.8, 0.0)
	var dir    := (_player.global_position - origin).normalized()
	var query  := PhysicsRayQueryParameters3D.create(origin, origin + dir * attack_range)
	query.exclude = [self]
	var result := space.intersect_ray(query)
	if result.has("collider"):
		var c = result["collider"]
		if c.is_in_group("player") and _player_health and _player_health.has_method("take_damage"):
			_player_health.take_damage(damage * _extraction_pressure_mult())
			_trigger_muzzle_flash()

func _trigger_muzzle_flash() -> void:
	if muzzle_light:
		muzzle_light.light_energy = 4.0
		await get_tree().create_timer(0.05).timeout
		if is_instance_valid(muzzle_light):
			muzzle_light.light_energy = 0.0

func _find_peek_position() -> Vector3:
	if _player == null:
		return _start_position
	var to_player := _player.global_position - global_position
	var side := to_player.cross(Vector3.UP).normalized()
	return global_position + side * (1.6 if randf() > 0.5 else -1.6)

func _play_anim(name: String) -> void:
	if anim_player == null:
		return
	if anim_player.current_animation != name.to_lower() and anim_player.has_animation(name.to_lower()):
		anim_player.play(name.to_lower())

func _set_eye_color(color: Color) -> void:
	if eye_mesh == null:
		return
	var mat := eye_mesh.get_active_material(0) as StandardMaterial3D
	if mat:
		mat.emission = color

func _transition_to(next: AIState) -> void:
	if _state == next or _state == AIState.DEAD:
		return
	_state           = next
	_state_entered_at = Time.get_ticks_msec() / 1000.0
	if next != AIState.PEEK:
		_has_peek_pos = false

	match next:
		AIState.PATROL:
			_set_eye_color(Color(0.1, 0.4, 0.8))
			_has_announced_alert = false
		AIState.INVESTIGATE:
			_set_eye_color(Color(1.0, 0.5, 0.0))
		AIState.PEEK:
			_set_eye_color(Color(0.95, 0.22, 0.05))
			_show_message("SENSOR SHADOW MOVEMENT", 1.2)
		AIState.ALERT:
			_set_eye_color(Color(1.0, 0.5, 0.0))
			if not _has_announced_alert:
				_show_message("HOSTILE SENSOR CONTACT", 1.8)
				_has_announced_alert = true
			bot_alerted.emit()
		AIState.ATTACK:
			_set_eye_color(Color(1.0, 0.0, 0.0))
		AIState.RETREAT:
			_set_eye_color(Color(0.8, 0.2, 1.0))
			_show_message("HOSTILE REPOSITIONING", 1.5)
		AIState.STAGGERED:
			_set_eye_color(Color(1.0, 1.0, 1.0))
		AIState.DEAD:
			pass

func _show_message(msg: String, duration: float) -> void:
	if _hud and _hud.has_method("show_message"):
		_hud.show_message(msg, duration)

# ── Public API ────────────────────────────────────────────────────────────────

func take_damage(amount: float) -> void:
	if _state == AIState.DEAD:
		return
	_health -= amount
	if _last_known_player_pos == Vector3.ZERO and _player:
		_last_known_player_pos = _player.global_position
	if _health <= 0.0:
		_die()
	else:
		_transition_to(AIState.STAGGERED)

func force_alert(pos: Vector3 = Vector3.ZERO) -> void:
	if _state == AIState.DEAD:
		return
	_last_known_player_pos = pos if pos != Vector3.ZERO else (_player.global_position if _player else global_position)
	_suspicion = 1.1
	_transition_to(AIState.ALERT)

func _die() -> void:
	_transition_to(AIState.DEAD)
	if ProgressionState.add_xp(100):
		if _hud and _hud.has_method("show_level_up"):
			_hud.show_level_up()
	bot_killed.emit()
	if hum_audio:
		hum_audio.stop()
	await get_tree().create_timer(0.5).timeout
	queue_free()
