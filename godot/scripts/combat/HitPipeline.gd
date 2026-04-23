extends Node
## HitPipeline — autoload stateless resolver for DamagePackets.
## Walks the target's ownership chain looking for CombatantComponent or HealthSystem.
## Falls back to legacy take_damage(float) for backward compatibility.

## Resolve a packet against a target. Returns the actual damage dealt (0 = immune / missed).
func resolve(packet: DamagePacket, target: Node) -> float:
	if target == null or not is_instance_valid(target):
		return 0.0

	# 1. CombatantComponent on target itself
	var cc := _find_combatant(target)
	if cc != null:
		return cc.receive(packet)

	# 2. HealthSystem on target itself (player / player-owned nodes)
	var hs := _find_health_system(target)
	if hs != null:
		return hs.receive(packet)

	# 3. Legacy fallback — direct take_damage
	if target.has_method("take_damage"):
		target.take_damage(packet.amount)
		return packet.amount

	return 0.0

## Resolve against every valid target in the array. Returns total damage dealt.
func resolve_many(packet: DamagePacket, targets: Array) -> float:
	var total := 0.0
	for t in targets:
		total += resolve(packet, t)
	return total

# ── Helpers ───────────────────────────────────────────────────────────────────

## Search target then its parent for a CombatantComponent.
func _find_combatant(node: Node) -> CombatantComponent:
	if node is CombatantComponent:
		return node as CombatantComponent
	var direct := node.get_node_or_null("CombatantComponent")
	if direct != null and direct is CombatantComponent:
		return direct as CombatantComponent
	if node.get_parent() != null:
		var parent_cc := node.get_parent().get_node_or_null("CombatantComponent")
		if parent_cc != null and parent_cc is CombatantComponent:
			return parent_cc as CombatantComponent
	return null

## Search target then its parent for a HealthSystem.
func _find_health_system(node: Node) -> Node:
	var direct := node.get_node_or_null("HealthSystem")
	if direct != null and direct.has_method("receive"):
		return direct
	if node.get_parent() != null:
		var parent_hs := node.get_parent().get_node_or_null("HealthSystem")
		if parent_hs != null and parent_hs.has_method("receive"):
			return parent_hs
	return null
