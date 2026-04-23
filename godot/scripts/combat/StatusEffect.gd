class_name StatusEffect
extends RefCounted
## Timed status effect applied to a CombatantComponent.
## Each update() call advances time and may return a DamagePacket for tick damage.

enum Type { BURN, SLOW, VOID_EXPOSURE, FREEZE, RADIATION }

var id:                  String               = ""
var type:                Type                 = Type.BURN
var duration:            float                = 5.0
var tick_interval:       float                = 0.5
var tick_damage:         float                = 0.0
var damage_packet_type:  DamagePacket.Type    = DamagePacket.Type.THERMAL
## Movement speed multiplier while active (1.0 = normal, 0.5 = 50% slower).
var slow_factor:         float                = 1.0
var source:              Node                 = null

var _elapsed:            float                = 0.0
var _tick_elapsed:       float                = 0.0

# ── Factories ─────────────────────────────────────────────────────────────────

static func burn(dur: float = 5.0, dps: float = 5.0, src: Node = null) -> StatusEffect:
	var e := StatusEffect.new()
	e.id                 = "burn"
	e.type               = Type.BURN
	e.duration           = dur
	e.tick_interval      = 0.5
	e.tick_damage        = dps * 0.5
	e.damage_packet_type = DamagePacket.Type.THERMAL
	e.source             = src
	return e

static func slow(dur: float = 3.0, factor: float = 0.5) -> StatusEffect:
	var e := StatusEffect.new()
	e.id          = "slow"
	e.type        = Type.SLOW
	e.duration    = dur
	e.slow_factor = factor
	return e

static func void_exposure(dur: float = 5.0, dps: float = 3.0, src: Node = null) -> StatusEffect:
	var e := StatusEffect.new()
	e.id                 = "void_exposure"
	e.type               = Type.VOID_EXPOSURE
	e.duration           = dur
	e.tick_interval      = 1.0
	e.tick_damage        = dps
	e.damage_packet_type = DamagePacket.Type.VOID
	e.source             = src
	return e

static func freeze(dur: float = 2.0) -> StatusEffect:
	var e := StatusEffect.new()
	e.id          = "freeze"
	e.type        = Type.FREEZE
	e.duration    = dur
	e.slow_factor = 0.1
	return e

static func radiation(dur: float = 8.0, dps: float = 2.0) -> StatusEffect:
	var e := StatusEffect.new()
	e.id                 = "radiation"
	e.type               = Type.RADIATION
	e.duration           = dur
	e.tick_interval      = 1.0
	e.tick_damage        = dps
	e.damage_packet_type = DamagePacket.Type.HAZARD
	return e

# ── Runtime ───────────────────────────────────────────────────────────────────

func is_expired() -> bool:
	return _elapsed >= duration

## Advance time. Returns a DamagePacket when a tick fires, null otherwise.
func update(delta: float) -> DamagePacket:
	_elapsed += delta
	if tick_damage <= 0.0:
		return null
	_tick_elapsed += delta
	if _tick_elapsed >= tick_interval:
		_tick_elapsed -= tick_interval
		return DamagePacket.make(tick_damage, damage_packet_type, source)
	return null

func remaining() -> float:
	return maxf(0.0, duration - _elapsed)
