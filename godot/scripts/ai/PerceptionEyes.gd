extends Node
class_name PerceptionEyes
## FOV-cone perception component. Attach to (or create as child of) an AI entity.
## Replaces the raw _has_line_of_sight() + _update_suspicion() pattern.
##
## update() returns:
##   0  — target not perceived
##   1  — noticed (suspicion >= notice_threshold)
##   2  — alerted (suspicion >= alert_threshold)

## Maximum sight distance in metres.
@export var detection_range:        float = 10.0
## Direct-vision FOV half-angle in degrees (cone centred on forward).
@export var fov_degrees:            float = 90.0
## Peripheral FOV half-angle — wider but raises suspicion more slowly.
@export var peripheral_fov_degrees: float = 150.0
## Suspicion at which the AI is "noticed" (returns 1).
@export var notice_threshold:       float = 0.35
## Suspicion at which the AI is fully alerted (returns 2).
@export var alert_threshold:        float = 1.0
## Suspicion gained per second inside direct FOV (scaled by exposure + range).
@export var gain_rate:              float = 1.2
## Suspicion gained per second in peripheral FOV.
@export var peripheral_gain_rate:   float = 0.35
## Suspicion decay per second when target not visible.
@export var decay_rate:             float = 0.28
## Eye height offset above entity origin used for line-of-sight ray origin.
@export var eye_height:             float = 0.8

var suspicion: float = 0.0
## Assign before calling update(). SecurityBot sets this in setup().
var target: Node3D = null

var _forced_alert: bool = false

# ── Public API ────────────────────────────────────────────────────────────────

## Call every physics frame. parent is the owning AI body.
## Returns 0 (unseen), 1 (noticed), 2 (alerted).
func update(delta: float, tgt: Node3D, parent: Node3D) -> int:
	if tgt == null:
		tgt = target
	if tgt == null:
		return 0

	if _forced_alert:
		suspicion = alert_threshold
		return 2

	var dist := parent.global_position.distance_to(tgt.global_position)
	if dist > detection_range:
		_decay(delta)
		return _perception_level()

	# ── FOV check ────────────────────────────────────────────────────────────
	var in_fov        := _in_fov(tgt, parent, fov_degrees)
	var in_peripheral := _in_fov(tgt, parent, peripheral_fov_degrees)

	if not in_peripheral:
		_decay(delta)
		return _perception_level()

	# ── Line-of-sight raycast ─────────────────────────────────────────────────
	var origin := parent.global_position + Vector3(0.0, eye_height, 0.0)
	if not _has_line_of_sight(tgt, origin, parent):
		_decay(delta)
		return _perception_level()

	# ── Suspicion gain ────────────────────────────────────────────────────────
	var expo_val    := tgt.get_exposure_score() if tgt.has_method("get_exposure_score") else 1.0
	var range_factor := maxf(0.15, 1.0 - dist / detection_range)

	var gain: float
	if in_fov:
		gain = gain_rate * expo_val * (0.5 + range_factor * 0.5)
	else:
		gain = peripheral_gain_rate * expo_val * range_factor

	suspicion = clampf(suspicion + gain * delta, 0.0, alert_threshold + 0.35)
	return _perception_level()

## Force this perception component into full-alert state (e.g., damaged).
func force_alert() -> void:
	_forced_alert = true
	suspicion     = alert_threshold

func reset() -> void:
	suspicion     = 0.0
	_forced_alert = false

# ── Internals ─────────────────────────────────────────────────────────────────

func _perception_level() -> int:
	if suspicion >= alert_threshold:
		return 2
	if suspicion >= notice_threshold:
		return 1
	return 0

func _decay(delta: float) -> void:
	suspicion = maxf(0.0, suspicion - decay_rate * delta)

func _in_fov(tgt: Node3D, parent: Node3D, half_angle_degrees: float) -> bool:
	var to_target := (tgt.global_position - parent.global_position).normalized()
	var forward   := -parent.global_transform.basis.z
	var dot       := forward.dot(to_target)
	return dot >= cos(deg_to_rad(half_angle_degrees * 0.5))

func _has_line_of_sight(tgt: Node3D, origin: Vector3, parent: Node3D) -> bool:
	var space  := parent.get_world_3d().direct_space_state
	var query  := PhysicsRayQueryParameters3D.create(origin, tgt.global_position)
	query.exclude = [parent]
	var result := space.intersect_ray(query)
	if not result.has("collider"):
		return true   # Open space — assume visible
	return (result["collider"] as Node).is_in_group("player")
