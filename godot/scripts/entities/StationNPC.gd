extends Area3D
## StationNPC — hub NPC interaction trigger. Ports StationNPC.ts.
## When dialogue_definition is assigned, uses DialogueSession for branching dialogue.
## Falls back to the legacy random dialog_lines array if no definition is set.

signal interaction_triggered(npc_id: String)
signal dialogue_node_changed(node_data: Dictionary)
signal dialogue_ended()

@export var npc_id: String       = "vendor"
@export var prompt_text: String  = "Talk"
## Assign a DialogueDefinition resource for branching dialogue.
## Leave null to use the legacy dialog_lines array.
@export var dialogue_definition: DialogueDefinition = null
@export var dialog_lines: Array  = [
	"Welcome, operative. The Void doesn't forgive weakness.",
	"Stay sharp out there.",
]

var _player_nearby: bool        = false
var _hud: Node                  = null
var _active_session: DialogueSession = null

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

func setup(hud: Node) -> void:
	_hud = hud

func _process(_delta: float) -> void:
	if _player_nearby and Input.is_action_just_pressed("interact"):
		if _active_session != null and not _active_session.is_finished():
			# Advance current conversation
			if _active_session.valid_choices().is_empty():
				_active_session.advance()
		else:
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
		_active_session = null

func _interact() -> void:
	interaction_triggered.emit(npc_id)

	if dialogue_definition != null:
		_active_session = DialogueSession.new()
		_active_session.node_changed.connect(_on_session_node_changed)
		_active_session.dialogue_ended.connect(_on_session_ended)
		_active_session.start(dialogue_definition)
	else:
		# Legacy fallback
		var line := dialog_lines[randi() % dialog_lines.size()] if dialog_lines.size() > 0 else ""
		if _hud and _hud.has_method("show_message"):
			_hud.show_message(line, 4.0)

func _on_session_node_changed(node_data: Dictionary) -> void:
	dialogue_node_changed.emit(node_data)
	var text: String = node_data.get("text", "")
	if _hud and _hud.has_method("show_message") and not text.is_empty():
		_hud.show_message(text, 4.0)

func _on_session_ended() -> void:
	_active_session = null
	dialogue_ended.emit()

## Programmatic choice selection (for UI-driven dialogue panels).
func choose(index: int) -> void:
	if _active_session != null:
		_active_session.choose(index)
