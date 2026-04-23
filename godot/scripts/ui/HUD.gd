extends CanvasLayer
## HUD — in-game heads-up display. Ports HUD.ts.
## Expects the following child nodes:

@onready var health_bar: ProgressBar    = $Bars/HealthBar
@onready var shield_bar: ProgressBar    = $Bars/ShieldBar
@onready var oxygen_bar: ProgressBar    = $Bars/OxygenBar
@onready var impulse_bar: ProgressBar   = $Bars/ImpulseBar
@onready var ammo_label: Label          = $Ammo/AmmoLabel
@onready var xp_bar: ProgressBar        = $XP/XPBar
@onready var level_label: Label         = $XP/LevelLabel
@onready var status_label: Label        = $StatusLabel
@onready var message_label: Label       = $MessageLabel
@onready var damage_flash: ColorRect    = $DamageFlash
@onready var damage_anim: AnimationPlayer = $DamageFlash/AnimationPlayer
@onready var interact_prompt: Label     = $InteractPrompt
@onready var crosshair: Control         = $Crosshair
@onready var weapon_label: Label        = $WeaponLabel

var _message_timer: SceneTreeTimer = null

func _ready() -> void:
	add_to_group("hud")
	_connect_signals()
	_refresh_all()

func _connect_signals() -> void:
	MissionState.mission_status_changed.connect(update_status)
	ProgressionState.xp_changed.connect(_on_xp_changed)
	SurvivalState.oxygen_changed.connect(update_oxygen)
	EconomyState.credits_changed.connect(func(_c): pass)
	LoadoutState.ammo_changed.connect(_on_ammo_changed)
	LoadoutState.weapon_changed.connect(_on_weapon_changed)

# ── Public API ─────────────────────────────────────────────────────────────────

func update_health(current: float, max_val: float) -> void:
	if health_bar:
		health_bar.value = (current / max_val) * 100.0

func update_shield(percent: float) -> void:
	if shield_bar:
		shield_bar.value = percent * 100.0

func update_oxygen(current: float, max_val: float) -> void:
	if oxygen_bar:
		oxygen_bar.value = (current / max_val) * 100.0

func update_ammo(current_mag: int, reserve: int) -> void:
	if ammo_label:
		ammo_label.text = "%d / %d" % [current_mag, reserve]

func update_impulse(percent: float, _ready: bool, charges: int, max_charges: int) -> void:
	if impulse_bar:
		impulse_bar.value = percent * 100.0
	if weapon_label:
		var charge_str := "■".repeat(charges) + "□".repeat(max_charges - charges)
		weapon_label.text = "DASH  " + charge_str

func update_status(status: String) -> void:
	if status_label:
		status_label.text = MissionState.status_label()

func show_message(msg: String, duration: float) -> void:
	if message_label:
		message_label.text  = msg
		message_label.visible = true
	if _message_timer:
		_message_timer.timeout.disconnect(_clear_message)
	_message_timer = get_tree().create_timer(duration)
	_message_timer.timeout.connect(_clear_message)

func show_level_up() -> void:
	show_message("LEVEL UP! PERK POINT AWARDED", 4.0)

func show_interact_prompt(label: String) -> void:
	if interact_prompt:
		interact_prompt.text = "[E] " + label
		interact_prompt.visible = true

func hide_interact_prompt() -> void:
	if interact_prompt:
		interact_prompt.visible = false

func flash_damage() -> void:
	if damage_anim:
		damage_anim.play("damage_flash")
	elif damage_flash:
		damage_flash.modulate.a = 0.5

# ── Private ─────────────────────────────────────────────────────────────────

func _clear_message() -> void:
	if message_label:
		message_label.visible = false

func _on_xp_changed(xp: int, level: int) -> void:
	if xp_bar:
		xp_bar.value = float(xp) / float(level * 1000) * 100.0
	if level_label:
		level_label.text = "LV %d" % level

func _on_ammo_changed(weapon_type: String, reserve: int) -> void:
	if ammo_label and weapon_type == LoadoutState.equipped_weapon:
		ammo_label.text = "? / %d" % reserve

func _on_weapon_changed(weapon_type: String) -> void:
	if weapon_label:
		weapon_label.text = weapon_type.to_upper()

func _refresh_all() -> void:
	update_status(MissionState.mission_status)
	_on_xp_changed(ProgressionState.xp, ProgressionState.level)
	update_oxygen(SurvivalState.oxygen, SurvivalState.max_oxygen)
