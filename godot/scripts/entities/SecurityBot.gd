extends CharacterBody3D
## SecurityBot — 8-state FSM AI with NavigationAgent3D. Ports SecurityBot.ts.
## Uses CombatantComponent for damage intake, PerceptionEyes for detection,
## SKBlackboard for cross-bot state sharing, and SKLootTable for drops.

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

## Optional loot table. Falls back to LootData.TABLE_COMMON when null.
@export var loot_table: SKLootTable = null

# ── Perception / Blackboard components (created in _ready) ────────────────────
var _eyes: PerceptionEyes = null
var _ears: PerceptionEars = null
var _blackboard: SKBlackboard = null

# ── CombatantComponent (created in _ready) ────────────────────────────────────
var _combatant: CombatantComponent = null

# ── State ─────────────────────────────────────────────────────────────────────
var _state: AIState = AIState.PATROL
var _last_fire_time: float = 0.0
var _state_entered_at: float = 0.0
var _has_announced_alert: bool = false
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
	_start_position = global_position
	add_to_group("security_bots")

	# Resolve NodePath waypoints to Vector3
	for wp_path in waypoints:
		var n := get_node_or_null(wp_path)
		if n:
			_waypoint_positions.append(n.global_position)

	# ── CombatantComponent ────────────────────────────────────────────────────
	_combatant = CombatantComponent.new()
	_combatant.name        = "CombatantComponent"
	_combatant.max_health  = max_health
	_combatant.poise_threshold = max_health * 0.25   # stagger at 25% of max-hp hit
	add_child(_combatant)
	_combatant.died.connect(_die)
	_combatant.poise_broken.connect(func(): _transition_to(AIState.STAGGERED))

	# ── PerceptionEyes ────────────────────────────────────────────────────────
	_eyes = PerceptionEyes.new()
	_eyes.name             = "PerceptionEyes"
	_eyes.detection_range  = detection_range
	_eyes.fov_degrees      = 90.0
	_eyes.peripheral_fov_degrees = 150.0
	add_child(_eyes)

	# ── PerceptionEars ────────────────────────────────────────────────────────
	_ears = PerceptionEars.new()
	_ears.name          = "PerceptionEars"
	_ears.hearing_range = detection_range * 1.5
	add_child(_ears)
	_ears.add_to_group("perception_ears")
	_ears.sound_detected.connect(_on_sound_detected)

	# Default per-bot blackboard (replaced when encounter provides a shared one)
	_blackboard = SKBlackboard.new()

	_transition_to(AIState.PATROL)

func setup(player: Node3D, player_health: Node, hud: Node) -> void:
	_player        = player
	_player_health = player_health
	_hud           = hud
	_eyes.target   = player

## Assign a shared blackboard (called by mission.gd for cross-bot coordination).
func set_blackboard(bb: SKBlackboard) -> void:
	_blackboard = bb

# ── Physics Process ───────────────────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	if _player == null or _state == AIState.DEAD:
		return

	# PerceptionEyes returns: 0 = undetected, 1 = noticed, 2 = alerted
	var perception    := _eyes.update(delta, _player, self)
	var can_see_player := perception > 0
	var dist_to_player := global_position.distance_to(_player.global_position)

	if can_see_player:
		_blackboard.set_vec3("last_known_player_pos", _player.global_position)

	var last_known := _blackboard.get_vec3("last_known_player_pos")

	match _state:
		AIState.PATROL:
			_patrol()
			_play_anim("Walk")
			if can_see_player:
				_transition_to(AIState.ALERT if perception >= 2 else AIState.PEEK)

		AIState.INVESTIGATE:
			_play_anim("Walk")
			nav_agent.target_position = last_known
			if global_position.distance_to(last_known) < 1.5:
				_transition_to(AIState.PATROL)
			if can_see_player:
				_transition_to(AIState.ALERT if perception >= 2 else AIState.PEEK)

		AIState.PEEK:
			_play_anim("Idle")
			if not _has_peek_pos:
				_peek_position = _find_peek_position()
				_has_peek_pos = true
			nav_agent.target_position = _peek_position
			look_at(_player.global_position, Vector3.UP)
			if perception >= 2:
				_transition_to(AIState.ALERT)
			elif not can_see_player and Time.get_ticks_msec() / 1000.0 - _state_entered_at > 1.8:
				_transition_to(AIState.INVESTIGATE)

		AIState.ALERT:
			_play_anim("Idle")
			look_at(_player.global_position, Vector3.UP)
			nav_agent.target_position = _player.global_position
			if dist_to_player < attack_range and can_see_player:
				_transition_to(AIState.ATTACK)
			elif not can_see_player and Time.get_ticks_msec() / 1000.0 - _state_entered_at > 1.8:
				_transition_to(AIState.INVESTIGATE)

		AIState.ATTACK:
			_play_anim("Shoot")
			look_at(_player.global_position, Vector3.UP)
			var hp_pct: float = _combatant.get_health_percent()
			if hp_pct < 0.35 and dist_to_player < 5.0:
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

	# Navigation movement — also apply slow factor from status effects
	if _state not in [AIState.DEAD, AIState.STAGGERED]:
		_apply_nav_velocity(delta)

func _apply_nav_velocity(delta: float) -> void:
	if nav_agent.is_navigation_finished():
		return
	var slow := _combatant.get_slow_factor() if _combatant else 1.0
	var dir := (nav_agent.get_next_path_position() - global_position).normalized()
	dir.y = 0.0
	velocity = dir * max_speed * _extraction_pressure_mult() * slow
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
		if c.is_in_group("player") and _player_health:
			var packet := DamagePacket.make(damage * _extraction_pressure_mult(), DamagePacket.Type.BALLISTIC, self)
			HitPipeline.resolve(packet, _player_health)
			_trigger_muzzle_flash()
			# Alert hearing-range bots via PerceptionEars
			PerceptionEars.emit_sound_at(global_position, 1.0, get_tree())

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

func _on_sound_detected(pos: Vector3, _volume: float) -> void:
	if _state == AIState.PATROL or _state == AIState.INVESTIGATE:
		_blackboard.set_vec3("last_known_player_pos", pos)
		_transition_to(AIState.INVESTIGATE)

# ── Public API ────────────────────────────────────────────────────────────────

func take_damage(amount: float) -> void:
	if _state == AIState.DEAD:
		return
	_combatant.take_damage(amount)

## DamagePacket-aware entry for HitPipeline (found on CombatantComponent child).

func force_alert(pos: Vector3 = Vector3.ZERO) -> void:
	if _state == AIState.DEAD:
		return
	var alert_pos := pos if pos != Vector3.ZERO else (_player.global_position if _player else global_position)
	_blackboard.set_vec3("last_known_player_pos", alert_pos)
	_eyes.force_alert()
	_transition_to(AIState.ALERT)

func _die() -> void:
	_transition_to(AIState.DEAD)
	if ProgressionState.add_xp(100):
		if _hud and _hud.has_method("show_level_up"):
			_hud.show_level_up()
	bot_killed.emit()
	if hum_audio:
		hum_audio.stop()

	# Drop loot — prefer exported SKLootTable, fall back to LootData.TABLE_COMMON
	var ctx := {"level": ProgressionState.level}
	var drops: Array = []
	if loot_table != null:
		drops = loot_table.roll(ctx)
	else:
		drops = SKLootTable.from_array(LootData.TABLE_COMMON).roll(ctx)
	for item in drops:
		EconomyState.add_loot(item)

	await get_tree().create_timer(0.5).timeout
	queue_free()
