class_name QuestDefinition
extends Resource
## A single quest definition stored as a Resource (.tres / .res).
## Quests are DAGs: multiple objectives, branching paths, and per-objective flags.
##
## Each entry in `objective_data` is a Dictionary with these keys:
##   id                  : String  — unique within this quest
##   title               : String  — short display name
##   description         : String  — longer description shown in journal
##   conditions          : Array   — Array[String] flag keys that must ALL be true
##   on_complete_flags   : Array   — Array[String] flags set when this obj completes
##   next_objectives     : Array   — Array[String] objective IDs to activate on complete
##   is_terminal         : bool    — true = completing this objective finishes the quest

@export var quest_id:           String = ""
@export var title:              String = ""
@export var description:        String = ""
@export var start_objective_id: String = "start"
@export var objective_data:     Array  = []   # Array[Dictionary] — see schema above
@export var prerequisite_quests: Array[String] = []
@export var reward_xp:          int    = 0
@export var reward_credits:     int    = 0
@export var reward_loot_tier:   String = ""

## Build an id→objective_dict lookup from objective_data.
func build_objective_map() -> Dictionary:
	var map := {}
	for d in objective_data:
		map[d.get("id", "")] = d
	return map

## Convenience — create a minimal two-objective linear quest in code.
static func simple(
		id:          String,
		title_text:  String,
		start_id:    String = "start",
		end_id:      String = "end",
		reward_xp_v: int    = 500) -> QuestDefinition:
	var q := QuestDefinition.new()
	q.quest_id           = id
	q.title              = title_text
	q.start_objective_id = start_id
	q.reward_xp          = reward_xp_v
	q.objective_data     = [
		{
			"id":               start_id,
			"title":            "Begin",
			"description":      "",
			"conditions":       [],
			"on_complete_flags": [id + "_started"],
			"next_objectives":  [end_id],
			"is_terminal":      false,
		},
		{
			"id":               end_id,
			"title":            "Complete",
			"description":      "",
			"conditions":       [id + "_started"],
			"on_complete_flags": [id + "_done"],
			"next_objectives":  [],
			"is_terminal":      true,
		},
	]
	return q
