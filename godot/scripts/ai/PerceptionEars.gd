extends Node
class_name PerceptionEars
## Sound-event perception component. Add to AI entities and add to group "perception_ears".
## Game systems (WeaponSystem, footstep audio, etc.) call emit_sound_at() to broadcast.
## Entities within hearing_range receive the sound_detected signal.

signal sound_detected(position: Vector3, volume: float)

## Maximum distance in metres at which sounds are heard.
@export var hearing_range: float = 15.0

# ── Public API ────────────────────────────────────────────────────────────────

## Call from anywhere to broadcast a sound into the scene.
## All PerceptionEars nodes in the "perception_ears" group within range will respond.
## volume: 0.0 – 1.0 (gunshot ≈ 1.0, footstep ≈ 0.3)
static func emit_sound_at(position: Vector3, volume: float, tree: SceneTree) -> void:
	for node in tree.get_nodes_in_group("perception_ears"):
		if node is PerceptionEars:
			(node as PerceptionEars)._check_sound(position, volume)

## Direct call when you already have a reference to a specific PerceptionEars.
func hear(position: Vector3, volume: float) -> void:
	_check_sound(position, volume)

# ── Internals ─────────────────────────────────────────────────────────────────

func _check_sound(pos: Vector3, volume: float) -> void:
	var owner_node := get_parent()
	if owner_node == null:
		return
	var dist := owner_node.global_position.distance_to(pos)
	var effective_range := hearing_range * volume
	if dist <= effective_range:
		sound_detected.emit(pos, volume)
