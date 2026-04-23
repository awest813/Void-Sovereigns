extends Control
## DecryptionUI — decryption minigame. Ports DecryptionUI.ts.
## Pattern: the correct sequence flashes, player must repeat it.

@onready var display: Label    = $Panel/Display
@onready var input_field: LineEdit = $Panel/InputField
@onready var submit_btn: Button    = $Panel/SubmitButton
@onready var close_btn: Button     = $Panel/CloseButton
@onready var timer_label: Label    = $Panel/TimerLabel

@export var code_length: int    = 6
@export var time_limit: float   = 30.0

var _code: String    = ""
var _time_left: float = 0.0
var _active: bool    = false

func _ready() -> void:
	submit_btn.pressed.connect(_on_submit)
	close_btn.pressed.connect(func(): hide())
	hide()

func start_decryption() -> void:
	_code      = _generate_code()
	_time_left = time_limit
	_active    = true
	display.text = "CODE: " + _code
	input_field.text = ""
	timer_label.text = ""
	show()
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	await get_tree().create_timer(2.5).timeout
	display.text = "CODE: " + "?".repeat(code_length)

func _process(delta: float) -> void:
	if not _active:
		return
	_time_left -= delta
	timer_label.text = "%.1fs" % _time_left
	if _time_left <= 0.0:
		_fail()

func _on_submit() -> void:
	if not _active:
		return
	var attempt := input_field.text.strip_edges().to_upper()
	if attempt == _code:
		_succeed()
	else:
		display.text = "WRONG — RETRY"
		input_field.text = ""

func _succeed() -> void:
	_active = false
	display.text = "ACCESS GRANTED"
	ProgressionState.add_xp(200)
	EconomyState.add_credits(300)
	await get_tree().create_timer(1.5).timeout
	hide()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _fail() -> void:
	_active = false
	display.text = "LOCKOUT — SECURITY NOTIFIED"
	await get_tree().create_timer(2.0).timeout
	hide()
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED

func _generate_code() -> String:
	const CHARS := "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	var code := ""
	for i in code_length:
		code += CHARS[randi() % CHARS.length()]
	return code
