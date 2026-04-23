class_name DialogueSession
extends RefCounted
## Manages the runtime state of an active dialogue.
## Create a new session for each conversation; sessions are not reused.
##
## Usage:
##   var session := DialogueSession.new()
##   session.node_changed.connect(_on_dialogue_node)
##   session.dialogue_ended.connect(_on_dialogue_ended)
##   session.start(my_dialogue_definition)
##   # Later, to advance (no choices):
##   session.advance()
##   # Or to pick a choice:
##   session.choose(0)

signal node_changed(node_data: Dictionary)
signal dialogue_ended()

var _definition: DialogueDefinition = null
var _current_id: String             = ""

# ── Public API ────────────────────────────────────────────────────────────────

func start(def: DialogueDefinition) -> void:
	_definition = def
	_goto(def.start_node_id)

func current_node() -> Dictionary:
	if _definition == null:
		return {}
	return _definition.get_node_data(_current_id)

## All choices whose condition is satisfied (or has no condition).
func valid_choices() -> Array:
	return _filtered_choices(current_node().get("choices", []))

## Select a choice by its index in valid_choices().
func choose(index: int) -> void:
	var choices := valid_choices()
	if index < 0 or index >= choices.size():
		return
	_apply_effects(current_node().get("effects", []))
	var next_id: String = choices[index].get("next_id", "")
	if next_id.is_empty():
		dialogue_ended.emit()
		return
	_goto(next_id)

## Advance through a node that has no choices (auto_next or end).
func advance() -> void:
	var node    := current_node()
	var effects := node.get("effects", [])
	var choices := valid_choices()
	if not choices.is_empty():
		return   # Must use choose() when choices are present
	_apply_effects(effects)
	var next: String = node.get("auto_next", "")
	if next.is_empty():
		dialogue_ended.emit()
	else:
		_goto(next)

func is_finished() -> bool:
	return _current_id.is_empty() or current_node().is_empty()

# ── Internals ─────────────────────────────────────────────────────────────────

func _goto(node_id: String) -> void:
	_current_id = node_id
	var node := current_node()
	if node.is_empty():
		dialogue_ended.emit()
		return
	node_changed.emit(node)
	# If no choices and no auto_next, apply effects and end automatically
	var choices  := _filtered_choices(node.get("choices", []))
	var auto_nxt := node.get("auto_next", "")
	if choices.is_empty() and auto_nxt.is_empty():
		_apply_effects(node.get("effects", []))
		dialogue_ended.emit()

func _filtered_choices(choices: Array) -> Array:
	var result: Array = []
	for c in choices:
		var cond: String = c.get("condition", "")
		if cond.is_empty() or MissionState.get_flag(cond):
			result.append(c)
	return result

func _apply_effects(effects: Array) -> void:
	for e in effects:
		match e.get("type", ""):
			"set_flag":
				MissionState.set_flag(e.get("key", ""), e.get("value", true))
				QuestGraphEngine.notify_flag(e.get("key", ""), e.get("value", true))
			"give_xp":
				ProgressionState.add_xp(e.get("amount", 0))
			"give_credits":
				EconomyState.add_credits(e.get("amount", 0))
			"start_quest":
				pass   # Caller loads the QuestDefinition resource and calls start_quest()
