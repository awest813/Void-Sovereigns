extends CharacterBody3D
class_name VoidDrone
## VoidDrone — self-contained enemy that wires PerceptionEyes, PerceptionEars,
## SKBlackboard, and CombatantComponent into a 4-state FSM.
## Drop into any scene in the "player" group; the drone auto-discovers the player.
## On death it spawns DroppedItem world-pickups for each rolled loot item.

signal drone_killed()

enum AIState { PATROL, CHASE, ATTACK, DEAD }

# ── Exported Tunables ─────────────────────────────────────────────────────────
@export var detection_range: float  = 12.0
@export var attack_range: float     = 1.8    ## Contact attack distance (metres)
@export var contact_damage: float   = 8.0    ## HP dealt per hit
@export var attack_rate: float      = 1.2    ## Seconds between attacks
@export var move_speed: float       = 3.0
@export var patrol_radius: float    = 4.0
@export var max_health: float       = 30.0
## Optional loot override; falls back to LootData.TABLE_COMMON.
@export var loot_table: SKLootTable = null

# ── AI Components ─────────────────────────────────────────────────────────────
var _eyes: PerceptionEyes     = null
var _ears: PerceptionEars     = null
var _blackboard: SKBlackboard = null
var _combatant: CombatantComponent = null

# ── Runtime State ─────────────────────────────────────────────────────────────
var _state: AIState = AIState.PATROL
var _player: Node3D = null
var _player_health: Node = null
var _start_pos: Vector3 = Vector3.ZERO
var _patrol_target: Vector3 = Vector3.ZERO
var _last_attack_time: float = 0.0
var _state_entered_at: float = 0.0

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	_start_pos     = global_position
	_patrol_target = _random_patrol_point()
	add_to_group("enemies")

	# ── CombatantComponent ────────────────────────────────────────────────────
	_combatant = CombatantComponent.new()
	_combatant.name            = "CombatantComponent"
	_combatant.max_health      = max_health
	_combatant.poise_threshold = max_health * 0.35
	add_child(_combatant)
	_combatant.died.connect(_on_died)
	_combatant.poise_broken.connect(func():
		velocity.x = 0.0
		velocity.z = 0.0
	)

	# ── PerceptionEyes ────────────────────────────────────────────────────────
	_eyes = PerceptionEyes.new()
	_eyes.name                 = "PerceptionEyes"
	_eyes.detection_range      = detection_range
	_eyes.fov_degrees          = 110.0
	_eyes.peripheral_fov_degrees = 170.0
	_eyes.gain_rate            = 1.5
	_eyes.decay_rate           = 0.4
	add_child(_eyes)

	# ── PerceptionEars ────────────────────────────────────────────────────────
	_ears = PerceptionEars.new()
	_ears.name          = "PerceptionEars"
	_ears.hearing_range = detection_range * 1.3
	add_child(_ears)
	_ears.add_to_group("perception_ears")
	_ears.sound_detected.connect(_on_sound_heard)

	# ── Per-drone blackboard (replaced via set_blackboard for group AI) ───────
	_blackboard = SKBlackboard.new()

	# Defer player lookup so the full scene tree is ready.
	call_deferred("_find_player")

func _find_player() -> void:
	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		_player        = players[0] as Node3D
		_eyes.target   = _player
		_player_health = _player.get_node_or_null("HealthSystem")

## Allow mission.gd to inject a shared blackboard for group coordination.
func set_blackboard(bb: SKBlackboard) -> void:
	_blackboard = bb

# ── Physics ───────────────────────────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	if _state == AIState.DEAD:
		return

	# Retry player lookup each frame until resolved.
	if _player == null:
		_find_player()
		return

	# ── Perception update ─────────────────────────────────────────────────────
	var perception  := _eyes.update(delta, _player, self)
	var can_see     := perception > 0
	var dist        := global_position.distance_to(_player.global_position)

	if can_see:
		_blackboard.set_vec3("last_known_player_pos", _player.global_position)

	var last_known := _blackboard.get_vec3("last_known_player_pos", global_position)

	# ── FSM ───────────────────────────────────────────────────────────────────
	match _state:
		AIState.PATROL:
			_move_toward(_patrol_target, delta)
			if global_position.distance_to(_patrol_target) < 1.0:
				_patrol_target = _random_patrol_point()
			if perception >= 1:
				_transition(AIState.CHASE)

		AIState.CHASE:
			_move_toward(last_known, delta)
			if can_see and dist <= attack_range:
				_transition(AIState.ATTACK)
			elif not can_see:
				var chase_elapsed := Time.get_ticks_msec() / 1000.0 - _state_entered_at
				if chase_elapsed > 5.0:
					_transition(AIState.PATROL)

		AIState.ATTACK:
			velocity.x = 0.0
			velocity.z = 0.0
			velocity.y += get_gravity().y * delta
			_safe_look_at(_player.global_position)
			_try_attack()
			if not can_see:
				_transition(AIState.CHASE)
			elif dist > attack_range:
				_transition(AIState.CHASE)

	move_and_slide()

# ── Private helpers ───────────────────────────────────────────────────────────

func _move_toward(target: Vector3, delta: float) -> void:
	var dir := target - global_position
	dir.y = 0.0
	if dir.length_squared() > 0.001:
		dir = dir.normalized()
		_safe_look_at(global_position + dir)
	var slow := _combatant.get_slow_factor() if _combatant else 1.0
	velocity.x = dir.x * move_speed * slow
	velocity.z = dir.z * move_speed * slow
	velocity.y += get_gravity().y * delta

func _try_attack() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_attack_time < attack_rate:
		return
	_last_attack_time = now
	if _player_health:
		var packet := DamagePacket.make(contact_damage, DamagePacket.Type.MELEE, self)
		HitPipeline.resolve(packet, _player_health)

func _transition(next: AIState) -> void:
	if _state == next:
		return
	_state            = next
	_state_entered_at = Time.get_ticks_msec() / 1000.0

func _random_patrol_point() -> Vector3:
	return _start_pos + Vector3(
		randf_range(-patrol_radius, patrol_radius),
		0.0,
		randf_range(-patrol_radius, patrol_radius)
	)

func _safe_look_at(target: Vector3) -> void:
	var dir := target - global_position
	if dir.length_squared() < 0.001:
		return
	look_at(target, Vector3.UP)

func _on_sound_heard(pos: Vector3, _volume: float) -> void:
	if _state == AIState.PATROL:
		_blackboard.set_vec3("last_known_player_pos", pos)
		_transition(AIState.CHASE)

# ── Public API ────────────────────────────────────────────────────────────────

func take_damage(amount: float) -> void:
	if _state == AIState.DEAD:
		return
	_combatant.take_damage(amount)

# ── Death & Loot ──────────────────────────────────────────────────────────────

func _on_died() -> void:
	_transition(AIState.DEAD)
	velocity = Vector3.ZERO

	# XP reward
	ProgressionState.add_xp(50)

	# Roll loot and spawn DroppedItem pickups in the world.
	var ctx   := {"level": ProgressionState.level}
	var drops: Array = []
	if loot_table != null:
		drops = loot_table.roll(ctx)
	else:
		drops = SKLootTable.from_array(LootData.TABLE_COMMON).roll(ctx)

	var item_scene := load("res://scenes/entities/dropped_item.tscn") as PackedScene
	var parent     := get_parent()

	for drop_item in drops:
		if item_scene and parent:
			var pickup := item_scene.instantiate()
			parent.add_child(pickup)
			(pickup as DroppedItem).set_item(drop_item)
			pickup.global_position = global_position + Vector3(
				randf_range(-0.6, 0.6), 0.25, randf_range(-0.6, 0.6)
			)
		else:
			# Fallback: silently add to inventory without a world pickup.
			EconomyState.add_loot(drop_item)

	drone_killed.emit()
	await get_tree().create_timer(0.3).timeout
	queue_free()
