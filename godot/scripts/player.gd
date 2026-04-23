extends CharacterBody3D
## Void Sovereigns — FirstPersonController
## Extends the Void-Sovereigns-FPS template player with:
##   sprint, crouch, impulse dash, flashlight, footsteps,
##   exposure/accuracy scoring, dodge window, FoV sway.

# ── Node References ───────────────────────────────────────────────────────────
@onready var camera: Camera3D         = $Camera3D
@onready var anim_player: AnimationPlayer = $AnimationPlayer
@onready var collision_shape: CollisionShape3D = $CollisionShape3D
@onready var flashlight: SpotLight3D  = $Camera3D/Flashlight
@onready var footstep_audio: AudioStreamPlayer3D = $FootstepAudio
@onready var weapon_node: Node3D      = $Camera3D/WeaponPivot

# ── Exported Tunables ─────────────────────────────────────────────────────────
@export var base_speed: float           = 5.5
@export var sprint_multiplier: float    = 1.8
@export var jump_velocity: float        = 4.5
@export var normal_fov: float           = 75.0
@export var sprint_fov: float           = 82.0
@export var impulse_strength: float     = 9.5
@export var impulse_cooldown_sec: float = 1.8
@export var max_impulse_charges: int    = 2

# ── Signals ───────────────────────────────────────────────────────────────────
signal impulse_changed(percent: float, ready: bool, charges: int, max_charges: int)
signal player_died()

# ── State ─────────────────────────────────────────────────────────────────────
var sensitivity: float          = 0.005
var controller_sensitivity: float = 0.010
var axis_vector: Vector2

var _is_sprint_held: bool       = false
var _is_crouch_held: bool       = false
var _flashlight_on: bool        = false
var _impulse_charges: int
var _last_impulse_time: float   = -99.0
var _dodge_window_until: float  = -1.0
var _step_accumulator: float    = 0.0

# Fall damage tracking
var _was_on_floor: bool         = true
var _pre_land_y_velocity: float = 0.0

# Crouch shape tweak
var _normal_shape_height: float = 2.0
var _crouch_shape_height: float = 1.2

func _ready() -> void:
	_impulse_charges = max_impulse_charges
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	camera.fov = normal_fov

	# Apply MARATHONER perk speed bonus
	if ProgressionState.has_perk("MARATHONER"):
		base_speed *= 1.25

	impulse_changed.emit(1.0, true, _impulse_charges, max_impulse_charges)

# ── Input ─────────────────────────────────────────────────────────────────────

func _unhandled_input(event: InputEvent) -> void:
	# Mouse look
	if event is InputEventMouseMotion:
		rotate_y(-event.relative.x * sensitivity)
		camera.rotate_x(-event.relative.y * sensitivity)
		camera.rotation.x = clamp(camera.rotation.x, -PI / 2.0, PI / 2.0)

	# Gamepad look
	axis_vector = Input.get_vector("look_left", "look_right", "look_up", "look_down")

	if event.is_action_pressed("sprint"):
		_is_sprint_held = true
	if event.is_action_released("sprint"):
		_is_sprint_held = false

	if event.is_action_pressed("crouch"):
		_is_crouch_held = true
		_apply_crouch(true)
	if event.is_action_released("crouch"):
		_is_crouch_held = false
		_apply_crouch(false)

	if event.is_action_pressed("impulse_dash"):
		_try_impulse_dash()

	if event.is_action_pressed("flashlight"):
		_flashlight_on = !_flashlight_on
		flashlight.visible = _flashlight_on

# ── Physics Process ───────────────────────────────────────────────────────────

func _physics_process(delta: float) -> void:
	sensitivity           = Global.sensitivity
	controller_sensitivity = Global.controller_sensitivity

	# Gamepad look
	if axis_vector.length_squared() > 0.01:
		rotate_y(-axis_vector.x * controller_sensitivity)
		camera.rotate_x(-axis_vector.y * controller_sensitivity)
		camera.rotation.x = clamp(camera.rotation.x, -PI / 2.0, PI / 2.0)

	# Gravity
	if not is_on_floor():
		velocity += get_gravity() * delta

	# Jump
	if Input.is_action_just_pressed("jump") and is_on_floor():
		velocity.y = jump_velocity

	# Horizontal movement
	var move_speed := _get_move_speed()
	var input_dir  := Input.get_vector("left", "right", "up", "down")
	var direction  := (transform.basis * Vector3(input_dir.x, 0.0, input_dir.y))
	if direction.length_squared() > 0.0:
		velocity.x = direction.x * move_speed
		velocity.z = direction.z * move_speed
	else:
		velocity.x = move_toward(velocity.x, 0.0, move_speed)
		velocity.z = move_toward(velocity.z, 0.0, move_speed)

	# Capture downward speed immediately before collision resolution.
	# This must be after gravity/jump velocity is applied so the full
	# impact velocity is measured — capturing earlier would undercount it.
	_pre_land_y_velocity = velocity.y

	move_and_slide()

	# ── Fall damage ───────────────────────────────────────────────────────────
	var on_floor_now := is_on_floor()
	if on_floor_now and not _was_on_floor:
		_apply_fall_damage()
	_was_on_floor = on_floor_now

	# Footsteps
	if is_on_floor() and direction.length_squared() > 0.0:
		_step_accumulator += delta
		var threshold := 0.65 if _is_crouch_held else (0.25 if _is_sprinting() else 0.4)
		if _step_accumulator >= threshold:
			_step_accumulator = 0.0
			if footstep_audio:
				footstep_audio.play()
	else:
		_step_accumulator = 0.0

	# FoV sway
	_update_fov(delta)

	# Impulse recharge
	_update_impulse_charges(delta)

	# Animations
	_update_animation(input_dir)

func _process(_delta: float) -> void:
	# Keep wepaon pivot parented to camera so it follows look direction
	pass

# ── Private helpers ───────────────────────────────────────────────────────────

func _is_sprinting() -> bool:
	return _is_sprint_held and not _is_crouch_held and velocity.length_squared() > 0.01

func _get_move_speed() -> float:
	if _is_crouch_held:
		return base_speed * 0.38
	if _is_sprinting():
		var mult := sprint_multiplier
		if ProgressionState.has_perk("OVERDRIVE"):
			mult *= 1.5
		return base_speed * mult
	return base_speed

func _apply_crouch(crouching: bool) -> void:
	if collision_shape == null:
		return
	var shape := collision_shape.shape as CapsuleShape3D
	if shape == null:
		return
	shape.height = _crouch_shape_height if crouching else _normal_shape_height
	camera.position.y = 1.2 if crouching else 1.6

func _try_impulse_dash() -> void:
	if _impulse_charges <= 0:
		return
	_impulse_charges -= 1
	_last_impulse_time = Time.get_ticks_msec() / 1000.0
	_dodge_window_until = _last_impulse_time + 0.42

	# Direction from input, default to forward
	var forward := -transform.basis.z
	var right   :=  transform.basis.x
	var dir     := Vector3.ZERO
	if Input.is_physical_key_pressed(KEY_W): dir += forward
	if Input.is_physical_key_pressed(KEY_S): dir -= forward
	if Input.is_physical_key_pressed(KEY_D): dir += right
	if Input.is_physical_key_pressed(KEY_A): dir -= right
	if dir.length_squared() < 0.001:
		dir = forward
	dir = dir.normalized()

	velocity.x += dir.x * impulse_strength
	velocity.z += dir.z * impulse_strength

	# Brief FoV kick
	camera.fov = minf(sprint_fov * 1.08, camera.fov + 4.0)

	_notify_impulse()

func _update_fov(delta: float) -> void:
	var target_fov := sprint_fov if _is_sprinting() else normal_fov
	camera.fov = lerpf(camera.fov, target_fov, delta * 8.0)

func _update_impulse_charges(delta: float) -> void:
	if _impulse_charges < max_impulse_charges:
		var elapsed := Time.get_ticks_msec() / 1000.0 - _last_impulse_time
		var recovered := int(elapsed / impulse_cooldown_sec)
		if recovered > 0:
			_impulse_charges = mini(max_impulse_charges, _impulse_charges + recovered)
			_last_impulse_time = Time.get_ticks_msec() / 1000.0
	_notify_impulse()

func _notify_impulse() -> void:
	var elapsed := Time.get_ticks_msec() / 1000.0 - _last_impulse_time
	var percent := 1.0 if _impulse_charges >= max_impulse_charges \
		else clampf(elapsed / impulse_cooldown_sec, 0.0, 1.0)
	impulse_changed.emit(percent, _impulse_charges > 0, _impulse_charges, max_impulse_charges)

func _update_animation(input_dir: Vector2) -> void:
	if anim_player == null:
		return
	if anim_player.current_animation == "shoot":
		return
	if input_dir != Vector2.ZERO and is_on_floor():
		anim_player.play("move")
	else:
		anim_player.play("idle")

# ── Public API (used by WeaponSystem, SecurityBot, etc.) ─────────────────────

func get_exposure_score() -> float:
	var exposure := 1.0 if is_moving() else 0.45
	if _is_crouch_held:
		exposure *= 0.2
	if _is_sprinting():
		exposure *= 1.35
	if _flashlight_on:
		exposure += 1.25
	if is_dodging():
		exposure += 0.45
	return clampf(exposure, 0.05, 2.5)

func get_accuracy_penalty() -> float:
	var penalty := 1.0
	if is_moving():
		penalty += 1.85 if _is_sprinting() else 0.35
	if not is_on_floor():
		penalty += 0.65
	return penalty

func is_dodging() -> bool:
	return Time.get_ticks_msec() / 1000.0 < _dodge_window_until

func is_moving() -> bool:
	return velocity.length_squared() > 0.01

func is_crouching() -> bool:
	return _is_crouch_held

func is_flashlight_on() -> bool:
	return _flashlight_on

## Forward ray from camera centre for weapon raycasts.
func get_forward_ray_origin() -> Vector3:
	return camera.global_position

func get_forward_ray_direction() -> Vector3:
	return -camera.global_transform.basis.z

## Apply fall damage based on landing speed.
## A SAFE_FALL_SPEED of 7 m/s lets normal jumps through unharmed (~4.5 m/s).
## Each m/s beyond the threshold deals 5 HP. "IRON SOLES" perk halves this.
func _apply_fall_damage() -> void:
	const SAFE_FALL_SPEED := 7.0     # m/s — below this, no damage
	const DAMAGE_PER_MS   := 5.0     # HP per m/s over the safe threshold
	var impact := -_pre_land_y_velocity   # positive value = falling downward
	if impact <= SAFE_FALL_SPEED:
		return
	var damage := (impact - SAFE_FALL_SPEED) * DAMAGE_PER_MS
	if ProgressionState.has_perk("IRON SOLES"):
		damage *= 0.5
	var hs := get_node_or_null("HealthSystem")
	if hs and hs.has_method("take_damage"):
		hs.take_damage(damage)

func play_shoot_animation() -> void:
	if anim_player:
		anim_player.stop()
		anim_player.play("shoot")

func _on_animation_player_animation_finished(anim_name: StringName) -> void:
	if anim_name == "shoot":
		anim_player.play("idle")
