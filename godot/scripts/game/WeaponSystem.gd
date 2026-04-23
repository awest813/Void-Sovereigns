extends Node
## WeaponSystem — raycast shooting, reload, melee, grenade. Ports WeaponSystem.ts.
## Add as a child of the player node.

signal ammo_changed(current_mag: int, reserve: int)
signal weapon_changed(weapon_type: String)

enum Rarity { COMMON, RARE, EPIC, LEGENDARY }

@export var hud: Node = null

@onready var _player: CharacterBody3D = get_parent()
@onready var _camera: Camera3D = _player.get_node("Camera3D")
@onready var _muzzle_light: OmniLight3D = _player.get_node_or_null("Camera3D/MuzzleLight")
@onready var _anim_player: AnimationPlayer = _player.get_node_or_null("AnimationPlayer")

## Weapon model pivot parented to camera
@onready var _weapon_pivot: Node3D = _player.get_node_or_null("Camera3D/WeaponPivot")

var _current_weapon: String = "pistol"
var _is_reloading: bool = false
var _last_fire_time: float = 0.0
var _bob_time: float = 0.0
var _recoil_offset: Vector3 = Vector3.ZERO

var _rarity: Rarity = Rarity.COMMON
var _damage: float = 10.0

var _current_mag: Dictionary = {"pistol": 12, "shotgun": 4, "smg": 30, "rifle": 10}
var _max_mag:     Dictionary = {"pistol": 12, "shotgun": 4, "smg": 30, "rifle": 10}

const FIRE_RATES: Dictionary = {"pistol": 0.25, "shotgun": 0.70, "smg": 0.10, "rifle": 0.45}
const SPREADS:   Dictionary = {"pistol": 0.01, "shotgun": 0.15, "smg": 0.08, "rifle": 0.02}

@export var grenade_scene: PackedScene = null

func _ready() -> void:
	_current_weapon = LoadoutState.equipped_weapon
	_refresh_stats()
	LoadoutState.weapon_changed.connect(_on_weapon_changed)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("shoot"):
		fire()
	if event.is_action_pressed("reload"):
		reload()
	if event.is_action_pressed("melee"):
		melee()
	if event.is_action_pressed("grenade"):
		throw_grenade()
	if event.is_action_pressed("weapon_1"):
		LoadoutState.equip_weapon("pistol")
	if event.is_action_pressed("weapon_2"):
		LoadoutState.equip_weapon("shotgun")
	if event.is_action_pressed("weapon_3"):
		LoadoutState.equip_weapon("smg")

func _process(delta: float) -> void:
	_apply_sway_and_recoil(delta)
	if _muzzle_light:
		_muzzle_light.light_energy = maxf(0.0, _muzzle_light.light_energy - 8.0 * delta)

# ── Public API ────────────────────────────────────────────────────────────────

func fire() -> void:
	var now := Time.get_ticks_msec() / 1000.0
	if _is_reloading:
		return
	if _current_mag.get(_current_weapon, 0) <= 0:
		reload()
		return
	var def := _current_weapon_def()
	var rate: float = FIRE_RATES.get(_current_weapon, 0.25)
	if def:
		rate = def.fire_rate
	if now - _last_fire_time < rate:
		return
	_last_fire_time = now
	_current_mag[_current_weapon] -= 1

	# Recoil
	_recoil_offset = Vector3(0.0, 0.0, -0.15)
	_shake_camera(_current_weapon == "shotgun")

	# Fire pellets — prefer definition values over the hard-coded tables.
	var spread: float = SPREADS.get(_current_weapon, 0.01)
	var pellets: int = 10 if _current_weapon == "shotgun" else 1
	if def:
		spread = def.recoil
		pellets = def.pellets
	for _i in pellets:
		_perform_raycast(spread)

	_create_muzzle_flash()
	_emit_ammo_changed()

	# Broadcast gunshot to nearby PerceptionEars AI nodes
	PerceptionEars.emit_sound_at(_camera.global_position, 1.0, get_tree())

	if _anim_player and _anim_player.has_animation("shoot"):
		_anim_player.stop()
		_anim_player.play("shoot")

func melee() -> void:
	var space  := get_world_3d().direct_space_state
	var origin := _camera.global_position
	var fwd    := -_camera.global_transform.basis.z
	var query  := PhysicsRayQueryParameters3D.create(origin, origin + fwd * 2.0)
	var result := space.intersect_ray(query)
	if result.has("collider"):
		var c = result["collider"]
		var dmg := _damage * 2.0
		if ProgressionState.has_perk("DEVASTATOR MELEE"):
			dmg *= 2.0
		var packet := DamagePacket.make(dmg, DamagePacket.Type.MELEE, _player)
		HitPipeline.resolve(packet, c)

func throw_grenade() -> void:
	if grenade_scene == null:
		return
	var g := grenade_scene.instantiate()
	g.global_position = _camera.global_position
	g.apply_impulse(-_camera.global_transform.basis.z * 12.0)
	get_tree().current_scene.add_child(g)

func reload() -> void:
	if _is_reloading:
		return
	var reserve := LoadoutState.ammo.get(_current_weapon, 0)
	var needed  := _max_mag.get(_current_weapon, 0) - _current_mag.get(_current_weapon, 0)
	if needed <= 0 or reserve <= 0:
		return
	_is_reloading = true

	await get_tree().create_timer(1.5).timeout
	var to_reload := mini(needed, reserve)
	LoadoutState.spend_ammo(_current_weapon, to_reload)
	_current_mag[_current_weapon] += to_reload
	_is_reloading = false
	_emit_ammo_changed()

# ── Private ───────────────────────────────────────────────────────────────────

func _perform_raycast(spread: float) -> void:
	if not _player.has_method("get_accuracy_penalty"):
		return
	var adjusted_spread := spread * _player.get_accuracy_penalty()
	var origin := _camera.global_position
	var fwd    := -_camera.global_transform.basis.z
	fwd.x += randf_range(-adjusted_spread, adjusted_spread)
	fwd.y += randf_range(-adjusted_spread, adjusted_spread)
	fwd.z += randf_range(-adjusted_spread, adjusted_spread)
	fwd    = fwd.normalized()

	var space  := get_world_3d().direct_space_state
	var query  := PhysicsRayQueryParameters3D.create(origin, origin + fwd * 50.0)
	var result := space.intersect_ray(query)
	if result.has("collider"):
		var c = result["collider"]
		var def := _current_weapon_def()
		var dmg_type: int = int(DamagePacket.Type.BALLISTIC)
		if def:
			dmg_type = int(def.damage_type)
		var packet := DamagePacket.make(_damage, dmg_type, _player)
		HitPipeline.resolve(packet, c)
		if result.has("position"):
			_spawn_impact_particles(result["position"])

func _refresh_stats() -> void:
	var lvl := ProgressionState.level
	if lvl > 10:   _rarity = Rarity.LEGENDARY
	elif lvl > 5:  _rarity = Rarity.EPIC
	elif lvl > 2:  _rarity = Rarity.RARE
	else:          _rarity = Rarity.COMMON

	var rarity_mod := 1.0
	match _rarity:
		Rarity.LEGENDARY: rarity_mod = 2.5
		Rarity.EPIC:      rarity_mod = 1.8
		Rarity.RARE:      rarity_mod = 1.2

	# Prefer the typed WeaponDefinition for the currently equipped primary.
	var def := _current_weapon_def()
	if def:
		_damage = def.damage * rarity_mod
		_max_mag[def.legacy_weapon_type()]     = def.mag_size
		if not _current_mag.has(def.legacy_weapon_type()):
			_current_mag[def.legacy_weapon_type()] = def.mag_size
	else:
		_damage = LoadoutState.weapon_damage * rarity_mod

## Returns the WeaponDefinition matching _current_weapon, or null when no
## ContentRegistry entry exists for the equipped primary.
func _current_weapon_def() -> WeaponDefinition:
	var cr := get_node_or_null("/root/ContentRegistry")
	if cr == null:
		return null
	# Prefer explicit equipped_primary id; otherwise match by legacy type.
	var primary: WeaponDefinition = cr.get_weapon(StringName(LoadoutState.equipped_primary))
	if primary and primary.legacy_weapon_type() == _current_weapon:
		return primary
	for w in cr.weapons():
		if w.legacy_weapon_type() == _current_weapon:
			return w
	return null

func _apply_sway_and_recoil(delta: float) -> void:
	if _weapon_pivot == null:
		return
	_bob_time += delta * 8.0
	var is_moving := _player.velocity.length_squared() > 0.01
	var bob_y := sin(_bob_time) * 0.005 if is_moving else 0.0
	var bob_x := cos(_bob_time * 0.5) * 0.003 if is_moving else 0.0
	var target := Vector3(0.25 + bob_x, -0.4 + bob_y, 0.6) + _recoil_offset
	_weapon_pivot.position = _weapon_pivot.position.lerp(target, 0.1)
	_recoil_offset = _recoil_offset.lerp(Vector3.ZERO, 0.15)

func _create_muzzle_flash() -> void:
	if _muzzle_light:
		_muzzle_light.light_energy = 3.0

func _shake_camera(heavy: bool) -> void:
	var intensity := 0.08 if heavy else 0.03
	_camera.rotation.x += randf_range(-intensity, intensity) * 0.1
	_camera.rotation.y += randf_range(-intensity, intensity) * 0.1

func _spawn_impact_particles(pos: Vector3) -> void:
	# Placeholder — instantiate a GPUParticles3D if desired
	pass

func _emit_ammo_changed() -> void:
	ammo_changed.emit(
		_current_mag.get(_current_weapon, 0),
		LoadoutState.ammo.get(_current_weapon, 0)
	)
	if hud and hud.has_method("update_ammo"):
		hud.update_ammo(_current_mag[_current_weapon], LoadoutState.ammo.get(_current_weapon, 0))

func _on_weapon_changed(weapon_type: String) -> void:
	_current_weapon = weapon_type
	_refresh_stats()
	_emit_ammo_changed()
	weapon_changed.emit(weapon_type)
