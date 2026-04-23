extends Node
class_name CombatantComponent
## Attach to any damageable entity (enemy, object) to get the full damage pipeline:
## resistances, poise/stagger, i-frames, and status-effect tracking.
## For the player's unique shield/dodge logic, see HealthSystem.gd instead.

signal damaged(packet: DamagePacket, actual_amount: float)
signal poise_broken()
signal died()
signal status_applied(effect: StatusEffect)
signal status_expired(effect_id: String)

@export var max_health:        float = 100.0
## Per damage-type resistance multipliers. 1.0 = normal, 0.5 = half damage, 2.0 = double.
@export var resistances:       Dictionary = {}   # DamagePacket.Type (int) -> float
## Poise damage absorbed before a stagger (resets after poise_reset_time).
@export var poise_threshold:   float = 20.0
@export var poise_reset_time:  float = 2.0
## Seconds of invincibility after being hit (0 = no i-frames).
@export var iframe_duration:   float = 0.0

var current_health: float
var _poise_damage:  float = 0.0
var _poise_timer:   float = 0.0
var _iframe_timer:  float = 0.0

## Active status effects: Array[StatusEffect]
var _status_effects: Array = []

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	current_health = max_health

func _process(delta: float) -> void:
	_update_iframe(delta)
	_update_poise(delta)
	_update_status_effects(delta)

# ── Public API ────────────────────────────────────────────────────────────────

## Main entry point for all incoming damage. Returns the actual damage dealt.
func receive(packet: DamagePacket) -> float:
	if current_health <= 0.0:
		return 0.0

	# I-frame check
	if _iframe_timer > 0.0:
		return 0.0

	# Apply resistance
	var mult: float = resistances.get(packet.type as int, 1.0)
	var amount := packet.amount * mult
	if packet.is_crit:
		amount *= 1.5

	# Apply health damage
	current_health = maxf(0.0, current_health - amount)
	damaged.emit(packet, amount)

	# Poise
	_poise_damage += amount
	if _poise_damage >= poise_threshold:
		_poise_damage = 0.0
		poise_broken.emit()

	# I-frames
	if iframe_duration > 0.0:
		_iframe_timer = iframe_duration

	# Poise timer reset on damage
	_poise_timer = 0.0

	# Apply bundled status effect
	if packet.status != null and packet.status is StatusEffect:
		apply_status(packet.status as StatusEffect)

	if current_health <= 0.0:
		died.emit()

	return amount

## Backward-compatible raw damage intake.
func take_damage(amount: float) -> void:
	receive(DamagePacket.make(amount, DamagePacket.Type.BALLISTIC))

func heal(amount: float) -> void:
	current_health = minf(max_health, current_health + amount)

func get_health_percent() -> float:
	return current_health / max_health

func is_dead() -> bool:
	return current_health <= 0.0

## Apply a StatusEffect (stacks by id if already present — refreshes duration).
func apply_status(effect: StatusEffect) -> void:
	for existing in _status_effects:
		if existing.id == effect.id:
			existing._elapsed = 0.0   # Refresh duration
			return
	_status_effects.append(effect)
	status_applied.emit(effect)

## Returns the combined slow factor from all active slow/freeze effects.
func get_slow_factor() -> float:
	var factor := 1.0
	for e in _status_effects:
		factor = minf(factor, e.slow_factor)
	return factor

## Returns true if a status effect with this id is active.
func has_status(effect_id: String) -> bool:
	for e in _status_effects:
		if e.id == effect_id:
			return true
	return false

# ── Private ───────────────────────────────────────────────────────────────────

func _update_iframe(delta: float) -> void:
	if _iframe_timer > 0.0:
		_iframe_timer = maxf(0.0, _iframe_timer - delta)

func _update_poise(delta: float) -> void:
	if _poise_damage > 0.0:
		_poise_timer += delta
		if _poise_timer >= poise_reset_time:
			_poise_damage = 0.0
			_poise_timer  = 0.0

func _update_status_effects(delta: float) -> void:
	var expired: Array = []
	for effect in _status_effects:
		var tick_packet: DamagePacket = effect.update(delta)
		if tick_packet != null:
			receive(tick_packet)
		if effect.is_expired():
			expired.append(effect)
	for e in expired:
		_status_effects.erase(e)
		status_expired.emit(e.id)
