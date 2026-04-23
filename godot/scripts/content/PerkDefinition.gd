class_name PerkDefinition
extends Resource
## Perk resource — passive stat modifiers arranged on a branch × tier grid.
## Trees are authored as .tres files under `res://content/perks/`.
##
## `requires` holds perk ids that must already be owned before this perk can
## be unlocked. `tier` gates by character level (level >= tier * TIER_LEVEL_STEP).

enum Branch { COMBAT, SURVIVAL, TECH, VOID }

const TIER_LEVEL_STEP: int = 5

@export var id:            StringName  = &""
@export var display_name:  String      = "Unnamed Perk"
@export_multiline var description: String = ""
@export var icon:          String      = "??"
@export_range(1, 5, 1) var tier:  int  = 1
@export var branch:        Branch      = Branch.COMBAT
@export_range(1, 5, 1) var cost:  int  = 1
@export var requires:      Array[StringName] = []
## Arbitrary stat multipliers/additions read by consumers (e.g. player.gd).
## Example: {"move_speed_mult": 1.25, "max_shield_mult": 2.0}
@export var stat_mods:     Dictionary = {}

## Minimum character level required to unlock this perk.
func required_level() -> int:
	return tier * TIER_LEVEL_STEP

func branch_to_string() -> String:
	match branch:
		Branch.COMBAT:   return "combat"
		Branch.SURVIVAL: return "survival"
		Branch.TECH:     return "tech"
		Branch.VOID:     return "void"
	return "combat"

## Back-compat dict shape used by `DataManager.get_perks()` and PerkMenuUI.
func to_dict() -> Dictionary:
	return {
		"id":          String(id),
		"name":        display_name,
		"description": description,
		"icon":        icon,
		"cost":        cost,
		"tier":        tier,
		"branch":      branch_to_string(),
		"requires":    requires.duplicate(),
		"stat_mods":   stat_mods.duplicate(),
	}
