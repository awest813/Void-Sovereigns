extends Node
## QuestGraphEngine — autoload managing the active quest DAG.
## Complements (does not replace) MissionState's linear deployment FSM.
## Usage:
##   QuestGraphEngine.start_quest(my_definition)
##   QuestGraphEngine.notify_flag("boss_killed", true)  # advances objectives
##   QuestGraphEngine.quest_completed.connect(my_callback)

signal quest_started(quest_id: String)
signal objective_started(quest_id: String, obj_id: String)
signal objective_completed(quest_id: String, obj_id: String)
signal quest_completed(quest_id: String)
signal quest_failed(quest_id: String)

## Live quest states: quest_id → { definition, obj_map, active_obj_ids, completed_obj_ids, flags }
var _active_quests:    Dictionary = {}
var _completed_quests: Array      = []

func _ready() -> void:
	load_state()

# ── Public API ────────────────────────────────────────────────────────────────

## Start a quest. Returns false if already active or prerequisites not met.
func start_quest(def: QuestDefinition) -> bool:
	if def == null:
		push_warning("QuestGraphEngine: null definition passed to start_quest()")
		return false
	if _active_quests.has(def.quest_id):
		return false

	for prereq in def.prerequisite_quests:
		if not _completed_quests.has(prereq):
			push_warning("QuestGraphEngine: prerequisite '%s' not met for '%s'" % [prereq, def.quest_id])
			return false

	var state := {
		"definition":        def,
		"obj_map":           def.build_objective_map(),
		"active_obj_ids":    [def.start_objective_id],
		"completed_obj_ids": [],
		"flags":             {},
	}
	_active_quests[def.quest_id] = state
	quest_started.emit(def.quest_id)
	objective_started.emit(def.quest_id, def.start_objective_id)
	return true

## Notify that a named flag changed. Checks all active quests for objective completion.
## Also mirrors to MissionState.set_flag() so legacy systems stay in sync.
func notify_flag(flag_key: String, value: bool = true) -> void:
	MissionState.set_flag(flag_key, value)
	for quest_id in _active_quests.keys():
		var state = _active_quests[quest_id]
		state["flags"][flag_key] = value
		_check_objectives(quest_id, state)

## Returns the active objective dictionaries for a quest.
func get_active_objectives(quest_id: String) -> Array:
	if not _active_quests.has(quest_id):
		return []
	var state = _active_quests[quest_id]
	var result: Array = []
	for obj_id in state["active_obj_ids"]:
		result.append(state["obj_map"].get(obj_id, {}))
	return result

func is_quest_active(quest_id: String) -> bool:
	return _active_quests.has(quest_id)

func is_quest_completed(quest_id: String) -> bool:
	return _completed_quests.has(quest_id)

## Manually fail a quest (removes from active, does not grant rewards).
func fail_quest(quest_id: String) -> void:
	if _active_quests.erase(quest_id):
		quest_failed.emit(quest_id)
		save_state()

# ── Internals ─────────────────────────────────────────────────────────────────

func _check_objectives(quest_id: String, state: Dictionary) -> void:
	# Use a queue so immediately-met follow-up objectives don't recurse.
	var pending: Array[String] = []
	for obj_id in state["active_obj_ids"]:
		var obj: Dictionary = state["obj_map"].get(obj_id, {})
		if _conditions_met(obj.get("conditions", []), state["flags"]):
			pending.append(obj_id)

	for obj_id in pending:
		_complete_objective(quest_id, obj_id, state)
		# Stop early if the quest was completed inside _complete_objective
		if not _active_quests.has(quest_id):
			return

func _complete_objective(quest_id: String, obj_id: String, state: Dictionary) -> void:
	state["active_obj_ids"].erase(obj_id)
	state["completed_obj_ids"].append(obj_id)
	objective_completed.emit(quest_id, obj_id)

	var obj: Dictionary = state["obj_map"].get(obj_id, {})
	# Set on-complete flags
	for flag in obj.get("on_complete_flags", []):
		state["flags"][flag] = true
		MissionState.set_flag(flag, true)

	if obj.get("is_terminal", false):
		_complete_quest(quest_id, state)
		return

	# Activate next objectives
	for next_id in obj.get("next_objectives", []):
		if not state["completed_obj_ids"].has(next_id) and not state["active_obj_ids"].has(next_id):
			state["active_obj_ids"].append(next_id)
			objective_started.emit(quest_id, next_id)

	# Re-check all newly-active objectives in one pass (non-recursive)
	if not _active_quests.has(quest_id):
		return
	var newly_met: Array[String] = []
	for active_id in state["active_obj_ids"]:
		var ao: Dictionary = state["obj_map"].get(active_id, {})
		if _conditions_met(ao.get("conditions", []), state["flags"]):
			newly_met.append(active_id)
	for mid in newly_met:
		if not _active_quests.has(quest_id):
			return
		_complete_objective(quest_id, mid, state)

	if state["active_obj_ids"].is_empty() and _active_quests.has(quest_id):
		_complete_quest(quest_id, state)

func _complete_quest(quest_id: String, state: Dictionary) -> void:
	_active_quests.erase(quest_id)
	_completed_quests.append(quest_id)
	quest_completed.emit(quest_id)

	var def: QuestDefinition = state["definition"]
	if def.reward_xp > 0:
		ProgressionState.add_xp(def.reward_xp)
	if def.reward_credits > 0:
		EconomyState.add_credits(def.reward_credits)
	if def.reward_loot_tier != "":
		var item := LootData.roll_tier(def.reward_loot_tier)
		if not item.is_empty():
			EconomyState.add_loot(item)

	save_state()

func _conditions_met(conditions: Array, flags: Dictionary) -> bool:
	for cond in conditions:
		if not flags.get(cond, false):
			return false
	return true

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	SaveSystem.set_value("quests", "completed", _completed_quests)
	# Active quest IDs only — definitions must be re-provided on load
	var active_ids: Array = _active_quests.keys()
	SaveSystem.set_value("quests", "active_flags", _serialize_active_flags())
	SaveSystem.set_value("quests", "active_ids",   active_ids)
	SaveSystem.flush()

func load_state() -> void:
	_completed_quests = SaveSystem.get_value("quests", "completed", [])
	# Active quest state (without definitions) is kept for informational purposes;
	# call start_quest() again after load to restore with full definitions.

func _serialize_active_flags() -> Dictionary:
	var result := {}
	for qid in _active_quests:
		result[qid] = _active_quests[qid]["flags"].duplicate()
	return result
