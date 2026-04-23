extends Node3D
## Turret — static auto-turret. Ports Turret.ts.

@export var detection_range: float = 12.0
@export var fire_rate: float       = 1.2
@export var damage: float          = 8.0
@export var rotation_speed: float  = 2.5

@onready var muzzle_light: OmniLight3D = $MuzzleLight

var _player: Node3D = null
var _player_health: Node = null
var _last_fire_time: float = 0.0
var _active: bool = true

func setup(player: Node3D, player_health: Node) -> void:
	_player        = player
	_player_health = player_health

func take_damage(amount: float) -> void:
	# Turrets are indestructible by default; override in subclass if needed
	pass

func _physics_process(delta: float) -> void:
	if not _active or _player == null:
		return

	var dist := global_position.distance_to(_player.global_position)
	if dist > detection_range:
		return

	# Rotate toward player
	var target_dir := (_player.global_position - global_position).normalized()
	target_dir.y   = 0.0
	if target_dir.length_squared() > 0.001:
		var target_basis := Basis.looking_at(target_dir, Vector3.UP)
		global_transform.basis = global_transform.basis.slerp(target_basis, delta * rotation_speed)

	_try_fire()

func _try_fire() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if now - _last_fire_time < fire_rate:
		return
	_last_fire_time = now

	if not _has_line_of_sight():
		return

	if _player_health and _player_health.has_method("take_damage"):
		_player_health.take_damage(damage)
	_trigger_muzzle_flash()

func _has_line_of_sight() -> bool:
	if _player == null:
		return false
	var space  := get_world_3d().direct_space_state
	var origin := global_position + Vector3(0.0, 0.5, 0.0)
	var query  := PhysicsRayQueryParameters3D.create(origin, _player.global_position)
	var result := space.intersect_ray(query)
	return result.has("collider") and (result["collider"] as Node).is_in_group("player")

func _trigger_muzzle_flash() -> void:
	if muzzle_light == null:
		return
	muzzle_light.light_energy = 4.0
	await get_tree().create_timer(0.05).timeout
	if is_instance_valid(muzzle_light):
		muzzle_light.light_energy = 0.0
