class_name DamagePacket
extends RefCounted
## Immutable-style data bag passed through the damage pipeline.
## Create with DamagePacket.make() and optionally attach a StatusEffect.

enum Type {
	BALLISTIC,   ## Bullets, projectiles
	VOID,        ## Void-energy damage
	THERMAL,     ## Fire / heat
	MELEE,       ## Bash, knife
	EXPLOSIVE,   ## Grenade, rocket
	HAZARD,      ## Environmental (acid, radiation, oxygen)
}

var amount:       float          = 0.0
var type:         Type           = Type.BALLISTIC
var is_crit:      bool           = false
var tags:         Array[String]  = []
var source:       Node           = null
var hit_position: Vector3        = Vector3.ZERO
var hit_normal:   Vector3        = Vector3.UP
## Optional status effect to apply alongside damage (processed by CombatantComponent).
var status:       RefCounted     = null   # StatusEffect or null

## Primary factory — covers the common case.
static func make(
		amount:   float,
		type:     Type  = Type.BALLISTIC,
		source:   Node  = null,
		is_crit:  bool  = false) -> DamagePacket:
	var p         := DamagePacket.new()
	p.amount      = amount
	p.type        = type
	p.source      = source
	p.is_crit     = is_crit
	return p

## Clone this packet with a different amount (useful when scaling by resistances).
func with_amount(new_amount: float) -> DamagePacket:
	var p         := DamagePacket.new()
	p.amount      = new_amount
	p.type        = type
	p.is_crit     = is_crit
	p.tags        = tags.duplicate()
	p.source      = source
	p.hit_position = hit_position
	p.hit_normal  = hit_normal
	p.status      = status
	return p

func has_tag(tag: String) -> bool:
	return tags.has(tag)
