extends CharacterBody3D
## BossCenturion — SecurityBot with phase transitions. Extends SecurityBot pattern.
## Uses CombatantComponent for damage intake and SKLootTable for drops.

signal phase_changed(phase: int)

@onready var nav_agent: NavigationAgent3D    = $NavigationAgent3D
@onready var anim_player: AnimationPlayer   = $AnimationPlayer
@onready var muzzle_light: OmniLight3D      = $MuzzleLight
@onready var eye_mesh: MeshInstance3D       = $EyeMesh

enum AIState { PHASE1, PHASE2, PHASE3, DEAD }

@export var max_health: float    = 500.0
@export var attack_range: float  = 10.0
@export var fire_rate_p1: float  = 1.0
@export var fire_rate_p2: float  = 0.6
@export var fire_rate_p3: float  = 0.3
@export var damage_p1: float     = 10.0
@export var damage_p2: float     = 18.0
@export var damage_p3: float     = 28.0
@export var max_speed: float     = 4.5

## Optional boss loot table. Falls back to LootData.TABLE_BOSS when null.
@export var loot_table: SKLootTable = null

var _combatant: CombatantComponent = null
var _state: AIState = AIState.PHASE1
var _player: Node3D = null
var _player_health: Node = null
var _hud: Node = null
var _last_fire_time: float = 0.0

func _ready() -> void:
	add_to_group("enemies")

	_combatant = CombatantComponent.new()
	_combatant.name        = "CombatantComponent"
	_combatant.max_health  = max_health
	_combatant.poise_threshold = 9999.0   # Boss never staggers from poise
	_combatant.iframe_duration = 0.1
	add_child(_combatant)
	_combatant.died.connect(_die)
	_combatant.damaged.connect(func(_pkt, _amt): _check_phase_transition())

func setup(player: Node3D, player_health: Node, hud: Node) -> void:
	_player        = player
	_player_health = player_health
	_hud           = hud

func _physics_process(delta: float) -> void:
	if _player == null or _state == AIState.DEAD:
		return

	_check_phase_transition()

	var dist := global_position.distance_to(_player.global_position)
	look_at(_player.global_position, Vector3.UP)
	nav_agent.target_position = _player.global_position

	if dist < attack_range:
		_attack()
	else:
		_move(delta)

func _check_phase_transition() -> void:
	var pct := _combatant.get_health_percent()
	var new_state := _state
	if pct > 0.66:
		new_state = AIState.PHASE1
	elif pct > 0.33:
		new_state = AIState.PHASE2
	else:
		new_state = AIState.PHASE3

	if new_state != _state:
		_state = new_state
		phase_changed.emit(_state as int)
		_on_phase_change(_state)

func _on_phase_change(phase: AIState) -> void:
	match phase:
		AIState.PHASE2:
			if _hud and _hud.has_method("show_message"):
				_hud.show_message("CENTURION CORE BREACH — PHASE 2 ENGAGED", 3.0)
		AIState.PHASE3:
			if _hud and _hud.has_method("show_message"):
				_hud.show_message("CRITICAL DAMAGE — CENTURION ENTERING APEX FURY", 3.0)

func _move(delta: float) -> void:
	if nav_agent.is_navigation_finished():
		return
	var dir := (nav_agent.get_next_path_position() - global_position).normalized()
	dir.y   = 0.0
	velocity = dir * max_speed
	velocity += get_gravity() * delta
	move_and_slide()

func _attack() -> void:
	var now  := Time.get_ticks_msec() / 1000.0
	var rate := fire_rate_p1
	var dmg  := damage_p1
	match _state:
		AIState.PHASE2: rate = fire_rate_p2; dmg = damage_p2
		AIState.PHASE3: rate = fire_rate_p3; dmg = damage_p3
	if now - _last_fire_time < rate:
		return
	_last_fire_time = now
	if _player_health:
		var packet := DamagePacket.make(dmg, DamagePacket.Type.BALLISTIC, self)
		HitPipeline.resolve(packet, _player_health)
	if muzzle_light:
		muzzle_light.light_energy = 5.0
		await get_tree().create_timer(0.05).timeout
		if is_instance_valid(muzzle_light):
			muzzle_light.light_energy = 0.0

func take_damage(amount: float) -> void:
	if _state == AIState.DEAD:
		return
	_combatant.take_damage(amount)

func _die() -> void:
	_state = AIState.DEAD
	# Drop loot — prefer exported SKLootTable, fall back to LootData.TABLE_BOSS
	var ctx := {"level": ProgressionState.level}
	var drops: Array = []
	if loot_table != null:
		drops = loot_table.roll(ctx)
	else:
		drops = SKLootTable.from_array(LootData.TABLE_BOSS).roll(ctx)
	for item in drops:
		EconomyState.add_loot(item)

	if ProgressionState.add_xp(3000):
		if _hud and _hud.has_method("show_level_up"):
			_hud.show_level_up()
	MissionState.transition("objectiveComplete")
	await get_tree().create_timer(1.0).timeout
	queue_free()
