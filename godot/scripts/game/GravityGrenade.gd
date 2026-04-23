extends RigidBody3D
## GravityGrenade — pulls nearby physics bodies toward centre on detonation.
## Ports GravityGrenade.ts.

@export var fuse_time: float  = 2.5
@export var radius: float     = 8.0
@export var pull_force: float = 25.0
@export var damage: float     = 40.0

var _detonated: bool = false

func _ready() -> void:
	await get_tree().create_timer(fuse_time).timeout
	_detonate()

func _detonate() -> void:
	if _detonated:
		return
	_detonated = true

	var space  := get_world_3d().direct_space_state
	var params := PhysicsShapeQueryParameters3D.new()
	var shape  := SphereShape3D.new()
	shape.radius = radius
	params.shape          = shape
	params.transform      = global_transform
	params.collision_mask = 0xFFFFFFFF

	var hits := space.intersect_shape(params)
	var packet := DamagePacket.make(damage, DamagePacket.Type.EXPLOSIVE)
	for hit in hits:
		var body = hit.get("collider")
		if body == null or body == self:
			continue
		var to_centre := global_position - body.global_position
		if body is RigidBody3D:
			body.apply_central_impulse(to_centre.normalized() * pull_force)
		HitPipeline.resolve(packet, body)

	queue_free()
