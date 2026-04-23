extends Area3D
class_name SKHurtbox
## Defender-side hurtbox attached to damageable entities.
## Receives hits from SKHitbox and routes them through HitPipeline.
## combatant_path should point to the entity's CombatantComponent or HealthSystem.

signal received_hit(packet: DamagePacket)

## NodePath to the CombatantComponent/HealthSystem on the owning entity.
## Defaults to the direct parent ("..").
@export var combatant_path: NodePath = NodePath("..")

func _ready() -> void:
	set_collision_layer(0)  # Hurtboxes don't push physics objects

## Called by SKHitbox. Routes the packet through HitPipeline.
func receive_hit(packet: DamagePacket) -> void:
	received_hit.emit(packet)
	var target := get_node_or_null(combatant_path)
	if target == null:
		target = get_parent()
	HitPipeline.resolve(packet, target)
