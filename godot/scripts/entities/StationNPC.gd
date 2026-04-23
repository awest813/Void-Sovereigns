extends Area3D
## StationNPC — hub NPC interaction trigger. Ports StationNPC.ts.

signal interaction_triggered(npc_id: String)

@export var npc_id: String   = "vendor"
@export var prompt_text: String = "Talk"
@export var dialog_lines: Array = [
	"Welcome, operative. The Void doesn't forgive weakness.",
	"Stay sharp out there.",
]

var _player_nearby: bool = false
var _hud: Node = null

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

func setup(hud: Node) -> void:
	_hud = hud

func _process(_delta: float) -> void:
	if _player_nearby and Input.is_action_just_pressed("interact"):
		_interact()

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_nearby = true
		if _hud and _hud.has_method("show_interact_prompt"):
			_hud.show_interact_prompt(prompt_text)

func _on_body_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_nearby = false
		if _hud and _hud.has_method("hide_interact_prompt"):
			_hud.hide_interact_prompt()

func _interact() -> void:
	var line := dialog_lines[randi() % dialog_lines.size()] if dialog_lines.size() > 0 else ""
	if _hud and _hud.has_method("show_message"):
		_hud.show_message(line, 4.0)
	interaction_triggered.emit(npc_id)
