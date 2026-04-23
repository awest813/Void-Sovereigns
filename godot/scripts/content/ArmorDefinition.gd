class_name ArmorDefinition
extends ItemDefinition
## Armor resource consumed by CharacterTab / LoadoutState.
## Resistances: Dictionary keyed by DamagePacket.Type (int) → multiplier (0.0–1.0
## where 0 = full absorption, 1 = no reduction).
##
## Slot BACKPACK / RIG grant additional inventory grid capacity via `grid_w/h`.

enum Slot { HEAD, CHEST, LEGS, ARMS, BACKPACK, RIG }

@export var slot:            Slot  = Slot.CHEST
@export_range(0, 1000, 1)    var armor_value:    int   = 0
@export_range(0, 9999, 1)    var durability_max: int   = 100
## Keyed by DamagePacket.Type (int) → damage multiplier (0.0–1.0).
@export var resistances:     Dictionary = {}
@export_range(0.1, 2.0, 0.01) var move_speed_mult: float = 1.0
@export_range(0.1, 2.0, 0.01) var stealth_mult:    float = 1.0
## For RIG/BACKPACK: extra inventory cells granted by this container.
@export_range(0, 10, 1) var container_w: int = 0
@export_range(0, 10, 1) var container_h: int = 0

func _init() -> void:
	category = Category.ARMOR

func slot_to_string() -> String:
	match slot:
		Slot.HEAD:     return "head"
		Slot.CHEST:    return "chest"
		Slot.LEGS:     return "legs"
		Slot.ARMS:     return "arms"
		Slot.BACKPACK: return "backpack"
		Slot.RIG:      return "rig"
	return "chest"

## Apply this armor's resistances to an incoming raw damage amount.
## `damage_type` should match DamagePacket.Type.
func mitigate(raw_amount: float, damage_type: int) -> float:
	var mult: float = resistances.get(damage_type, 1.0)
	return raw_amount * mult

## Container capacity in cells. Rigs/backpacks grant extra inventory grid.
func container_cells() -> int:
	return container_w * container_h
