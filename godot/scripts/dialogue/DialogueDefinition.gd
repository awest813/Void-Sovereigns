class_name DialogueDefinition
extends Resource
## Branching dialogue tree definition stored as a Resource.
##
## `nodes` Dictionary: id → node_data Dictionary with keys:
##   speaker     : String   — display name of the speaker
##   text        : String   — the line of dialogue
##   portrait    : String   — optional portrait key / texture path
##   choices     : Array    — Array[Dictionary] {label, next_id, condition}
##                           condition: a MissionState flag key (must be true) or ""
##   effects     : Array    — Array[Dictionary] applied when leaving this node
##                           effect types: set_flag, give_xp, give_credits, start_quest
##   auto_next   : String   — if set (and no choices), jump here automatically
##
## Build dialogue data via code or the Godot inspector (as a .tres resource).

@export var start_node_id: String     = "start"
@export var nodes:         Dictionary = {}

## Convenience factory: build a linear single-speaker dialogue from a text array.
static func from_lines(speaker: String, lines: Array[String]) -> DialogueDefinition:
	var def          := DialogueDefinition.new()
	def.start_node_id = "line_0"
	for i in lines.size():
		var nid      := "line_%d" % i
		var next_nid := "line_%d" % (i + 1) if i + 1 < lines.size() else ""
		def.nodes[nid] = {
			"speaker":   speaker,
			"text":      lines[i],
			"choices":   [],
			"effects":   [],
			"auto_next": next_nid,
		}
	return def

## Return a node dict or empty dict if not found.
func get_node_data(id: String) -> Dictionary:
	return nodes.get(id, {})
