class_name ItemDefinition
extends Resource
## Base item resource. Weapons / Armor / Ammo / Consumables all extend this.
## Tarkov-style grid_w × grid_h drive inventory cell footprint; rarity
## drives tile border colour in the hub UI.

enum Rarity { COMMON, UNCOMMON, RARE, EPIC, LEGENDARY }
enum Category { MISC, WEAPON, ARMOR, AMMO, CONSUMABLE, MOD, KEY, RELIC }

@export var id:            StringName  = &""
@export var display_name:  String      = "Unknown Item"
@export_multiline var description: String = ""
## Placeholder glyph (e.g. "SH") or path to a texture — UI decides.
@export var icon:          String      = "??"
@export var rarity:        Rarity      = Rarity.COMMON
@export var base_value:    int         = 0
@export_range(1, 999, 1) var stack_size: int = 1
@export_range(1, 10, 1) var grid_w:      int = 1
@export_range(1, 10, 1) var grid_h:      int = 1
@export var category:      Category    = Category.MISC
## Free-form tag list used for filters and perk/skill conditions.
@export var tags: Array[StringName] = []

## Legacy-compatible dictionary emitted to code/UI that still expects dicts
## (SKLootTable, EconomyState.sell_item, DroppedItem, etc.).
func to_dict() -> Dictionary:
	return {
		"id":         String(id),
		"name":       display_name,
		"base_value": base_value,
		"value":      base_value,
		"category":   category_to_string(),
		"rarity":     rarity_to_string(),
		"grid_w":     grid_w,
		"grid_h":     grid_h,
		"stack_size": stack_size,
		"icon":       icon,
	}

func grid_cells() -> int:
	return grid_w * grid_h

func rarity_to_string() -> String:
	match rarity:
		Rarity.COMMON:    return "common"
		Rarity.UNCOMMON:  return "uncommon"
		Rarity.RARE:      return "rare"
		Rarity.EPIC:      return "epic"
		Rarity.LEGENDARY: return "legendary"
	return "common"

func category_to_string() -> String:
	match category:
		Category.WEAPON:     return "weapon"
		Category.ARMOR:      return "armor"
		Category.AMMO:       return "ammo"
		Category.CONSUMABLE: return "consumable"
		Category.MOD:        return "mod"
		Category.KEY:        return "key"
		Category.RELIC:      return "relic"
		_:                   return "misc"

static func rarity_color(r: int) -> Color:
	match r:
		Rarity.UNCOMMON:  return Color("#6cbf5a")
		Rarity.RARE:      return Color("#4aa7e0")
		Rarity.EPIC:      return Color("#a368e0")
		Rarity.LEGENDARY: return Color("#e0b23a")
	return Color("#7c8894")
