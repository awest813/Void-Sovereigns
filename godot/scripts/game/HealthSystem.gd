extends Node
## HealthSystem — HP + shield layer with regen. Ports HealthSystem.ts.
## Add as a child of the player or any damageable entity.

signal damaged(current: float, max_val: float)
signal healed(current: float, max_val: float)
signal died()
signal damage_avoided()
signal shield_changed(percent: float)

@export var max_health: float = 100.0
@export var shield_regen_delay: float = 5.0
@export var shield_regen_rate: float = 10.0  # units per second

var current_health: float
var max_shield: float
var current_shield: float
var _last_damage_time: float = -999.0

## Callable that returns true when damage should be avoided (dodge window).
var can_avoid_damage: Callable = Callable()

func _ready() -> void:
	# Support both the new lowercase perk id (ContentRegistry) and the legacy
	# uppercase id stored in older saves.
	var has_titan := ProgressionState.has_perk("titan_shields") or ProgressionState.has_perk("TITAN SHIELDS")
	max_shield = 200.0 if has_titan else 100.0
	current_health = max_health
	current_shield = max_shield

func _process(delta: float) -> void:
	# Shield regen after delay
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_damage_time > shield_regen_delay and current_shield < max_shield:
		current_shield = minf(max_shield, current_shield + shield_regen_rate * delta)
		shield_changed.emit(current_shield / max_shield)

# ── API ───────────────────────────────────────────────────────────────────────

## DamagePacket-aware entry point used by HitPipeline.
func receive(packet: DamagePacket) -> float:
	var amount := packet.amount
	if packet.is_crit:
		amount *= 1.5
	# Apply equipped-armor resistances (player-side only; CombatantComponent
	# handles enemies). LoadoutState.aggregate_resistance returns a multiplier
	# in [0,1] so we scale raw damage down by owner's gear.
	var parent := get_parent()
	if parent and parent.is_in_group("player"):
		amount *= LoadoutState.aggregate_resistance(int(packet.type))
	take_damage(amount)
	return amount

func take_damage(amount: float) -> void:
	if current_health <= 0.0:
		return
	if can_avoid_damage.is_valid() and can_avoid_damage.call():
		_last_damage_time = Time.get_ticks_msec() / 1000.0
		damage_avoided.emit()
		return

	_last_damage_time = Time.get_ticks_msec() / 1000.0

	var remaining := amount
	if current_shield > 0.0:
		var shield_hit := minf(current_shield, remaining)
		current_shield -= shield_hit
		remaining      -= shield_hit
		shield_changed.emit(current_shield / max_shield)

	if remaining > 0.0:
		current_health = maxf(0.0, current_health - remaining)
		damaged.emit(current_health, max_health)
		if current_health <= 0.0:
			died.emit()

func heal(amount: float) -> void:
	if current_health <= 0.0:
		return
	current_health = minf(max_health, current_health + amount)
	healed.emit(current_health, max_health)

func get_health_percent() -> float:
	return current_health / max_health

func get_shield_percent() -> float:
	return current_shield / max_shield

func reset() -> void:
	current_health = max_health
	current_shield = max_shield
