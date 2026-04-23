class_name SkillDefinition
extends Resource
## Skill resource — active/passive abilities authored as .tres files under
## `res://content/skills/`. Skills are separate from perks: they consume
## skill_points (earned every 2 levels) and active skills can be bound to the
## player hotbar (Z/X/V) for in-mission use.

enum Kind { ACTIVE, PASSIVE }
enum Branch { COMBAT, SURVIVAL, TECH, VOID }

const TIER_LEVEL_STEP: int = 4

@export var id:            StringName  = &""
@export var display_name:  String      = "Unnamed Skill"
@export_multiline var description: String = ""
@export var icon:          String      = "??"
@export var kind:          Kind        = Kind.PASSIVE
@export var branch:        Branch      = Branch.COMBAT
@export_range(1, 5, 1) var tier:  int  = 1
@export_range(1, 5, 1) var cost:  int  = 1
## Cooldown in seconds (active skills only).
@export_range(0.0, 300.0, 0.5) var cooldown: float = 0.0
## Energy / resource cost per activation (active skills only).
@export_range(0.0, 999.0, 0.5) var energy_cost: float = 0.0
@export var requires: Array[StringName] = []
## Optional script path implementing `activate(player: Node, context: Dictionary)`.
@export_file("*.gd") var script_path: String = ""
## Stat mods applied while owned (passive skills).
@export var stat_mods: Dictionary = {}

func required_level() -> int:
	return tier * TIER_LEVEL_STEP

func branch_to_string() -> String:
	match branch:
		Branch.COMBAT:   return "combat"
		Branch.SURVIVAL: return "survival"
		Branch.TECH:     return "tech"
		Branch.VOID:     return "void"
	return "combat"

func is_active() -> bool:
	return kind == Kind.ACTIVE

## Instantiate the script hook for active skills. Returns null if none set.
func load_script() -> Script:
	if script_path.is_empty():
		return null
	return load(script_path) as Script
