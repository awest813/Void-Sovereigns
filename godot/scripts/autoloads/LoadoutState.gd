extends Node
## LoadoutState — autoload persisting loadout slice.
## Ports LoadoutSlice from GameState.ts.
##
## New model (v2): three weapon slots (primary / secondary / melee) addressed
## by WeaponDefinition id, plus an armor dict keyed by slot name, plus a rig id.
## The legacy `equipped_weapon` / `weapon_damage` fields are preserved as thin
## facades so WeaponSystem.gd, ShopUI, etc. continue to work without change.

signal weapon_changed(weapon_type: String)            # legacy payload
signal loadout_changed()                              # emitted on any change
signal ammo_changed(weapon_type: String, current: int)
signal equipment_changed()
signal armor_changed(slot: String, item_id: String)

# ── Legacy fields (still read by WeaponSystem, HUD, InventoryUI) ──────────────

var weapon_damage: int = 10
var armor_durability: int = 100
var equipped_weapon: String = "pistol"
var ammo: Dictionary = {
	"pistol":  60,
	"shotgun": 12,
	"smg":     120,
	"rifle":   40,
}

# ── New fields (Tarkov-style slotted loadout) ─────────────────────────────────

## Weapon slot ids point at WeaponDefinition ids (StringName stored as String
## for save-file friendliness).
var equipped_primary:   String = "kestrel_pistol"
var equipped_secondary: String = ""
var equipped_melee:     String = "void_maul"
## Keyed by ArmorDefinition slot name: "head"/"chest"/"legs"/"arms"/"backpack"/"rig"
var equipped_armor: Dictionary = {}
## Convenience alias (equipped_armor["rig"] duplicated for easy access).
var equipped_rig: String = ""
## Durability per equipped armor id (id → int remaining).
var armor_durabilities: Dictionary = {}

const _CFG_SECTION := "loadout"

# Slots expected in equipped_armor.
const ARMOR_SLOTS := ["head", "chest", "legs", "arms", "backpack", "rig"]

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())

# ── Weapon mutations (legacy + new) ───────────────────────────────────────────

## Legacy API — equip by weapon TYPE string ("pistol"/"shotgun"/"smg"). The
## type is mapped to the first matching WeaponDefinition.
func equip_weapon(weapon_type: String) -> void:
	equipped_weapon = weapon_type
	# Attempt to sync `equipped_primary` with the first weapon of that class.
	var def := _first_weapon_of_type(weapon_type)
	if def:
		equipped_primary = String(def.id)
	weapon_changed.emit(equipped_weapon)
	loadout_changed.emit()
	save_state()

## New API — equip a WeaponDefinition by id to a specific slot.
## slot ∈ {"primary", "secondary", "melee"}.
func equip_weapon_id(slot: String, weapon_id: String) -> void:
	match slot:
		"primary":
			equipped_primary = weapon_id
			var def := ContentRegistry.get_weapon(StringName(weapon_id))
			if def:
				equipped_weapon = def.legacy_weapon_type()
				weapon_changed.emit(equipped_weapon)
		"secondary":
			equipped_secondary = weapon_id
		"melee":
			equipped_melee = weapon_id
		_:
			return
	loadout_changed.emit()
	save_state()

func get_primary_weapon() -> WeaponDefinition:
	return ContentRegistry.get_weapon(StringName(equipped_primary))

func get_secondary_weapon() -> WeaponDefinition:
	return ContentRegistry.get_weapon(StringName(equipped_secondary))

func get_melee_weapon() -> WeaponDefinition:
	return ContentRegistry.get_weapon(StringName(equipped_melee))

# ── Ammo (legacy) ─────────────────────────────────────────────────────────────

func spend_ammo(weapon_type: String, amount: int) -> void:
	ammo[weapon_type] = maxi(0, ammo.get(weapon_type, 0) - amount)
	ammo_changed.emit(weapon_type, ammo[weapon_type])
	save_state()

func add_ammo(weapon_type: String, amount: int) -> void:
	ammo[weapon_type] = ammo.get(weapon_type, 0) + amount
	ammo_changed.emit(weapon_type, ammo[weapon_type])
	save_state()

func upgrade_weapon_damage(amount: int) -> void:
	weapon_damage += amount
	equipment_changed.emit()
	save_state()

# ── Armor mutations ───────────────────────────────────────────────────────────

func equip_armor(item_id: String) -> void:
	var def := ContentRegistry.get_armor(StringName(item_id))
	if def == null:
		return
	var slot_key := def.slot_to_string()
	equipped_armor[slot_key] = item_id
	if slot_key == "rig":
		equipped_rig = item_id
	armor_durabilities[item_id] = def.durability_max
	armor_changed.emit(slot_key, item_id)
	loadout_changed.emit()
	equipment_changed.emit()
	save_state()

func unequip_armor(slot_key: String) -> void:
	if equipped_armor.has(slot_key):
		var id: String = equipped_armor[slot_key]
		armor_durabilities.erase(id)
		equipped_armor.erase(slot_key)
		if slot_key == "rig":
			equipped_rig = ""
		armor_changed.emit(slot_key, "")
		loadout_changed.emit()
		equipment_changed.emit()
		save_state()

func get_equipped_armor(slot_key: String) -> ArmorDefinition:
	if not equipped_armor.has(slot_key):
		return null
	return ContentRegistry.get_armor(StringName(equipped_armor[slot_key]))

## Aggregate damage multiplier across all equipped armor for a given
## DamagePacket.Type (int). Returns 1.0 (no reduction) when nothing applies.
func aggregate_resistance(damage_type: int) -> float:
	var mult := 1.0
	for slot_key in equipped_armor.keys():
		var def := get_equipped_armor(slot_key)
		if def and def.resistances.has(damage_type):
			mult *= float(def.resistances[damage_type])
	return mult

func set_armor_durability(val: int) -> void:
	armor_durability = val
	equipment_changed.emit()
	save_state()

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	# Legacy fields
	SaveSystem.set_value(_CFG_SECTION, "weapon_damage",    weapon_damage)
	SaveSystem.set_value(_CFG_SECTION, "armor_durability", armor_durability)
	SaveSystem.set_value(_CFG_SECTION, "equipped_weapon",  equipped_weapon)
	SaveSystem.set_value(_CFG_SECTION, "ammo",             ammo)
	# New fields
	SaveSystem.set_value(_CFG_SECTION, "equipped_primary",   equipped_primary)
	SaveSystem.set_value(_CFG_SECTION, "equipped_secondary", equipped_secondary)
	SaveSystem.set_value(_CFG_SECTION, "equipped_melee",     equipped_melee)
	SaveSystem.set_value(_CFG_SECTION, "equipped_armor",     equipped_armor)
	SaveSystem.set_value(_CFG_SECTION, "equipped_rig",       equipped_rig)
	SaveSystem.set_value(_CFG_SECTION, "armor_durabilities", armor_durabilities)
	SaveSystem.flush()

func load_state() -> void:
	weapon_damage    = SaveSystem.get_value(_CFG_SECTION, "weapon_damage",    10)
	armor_durability = SaveSystem.get_value(_CFG_SECTION, "armor_durability", 100)
	equipped_weapon  = SaveSystem.get_value(_CFG_SECTION, "equipped_weapon",  "pistol")
	ammo             = SaveSystem.get_value(_CFG_SECTION, "ammo",             {"pistol":60,"shotgun":12,"smg":120,"rifle":40})
	equipped_primary   = SaveSystem.get_value(_CFG_SECTION, "equipped_primary",   "kestrel_pistol")
	equipped_secondary = SaveSystem.get_value(_CFG_SECTION, "equipped_secondary", "")
	equipped_melee     = SaveSystem.get_value(_CFG_SECTION, "equipped_melee",     "void_maul")
	equipped_armor     = SaveSystem.get_value(_CFG_SECTION, "equipped_armor",     {})
	equipped_rig       = SaveSystem.get_value(_CFG_SECTION, "equipped_rig",       "")
	armor_durabilities = SaveSystem.get_value(_CFG_SECTION, "armor_durabilities", {})

# ── Internal ──────────────────────────────────────────────────────────────────

func _first_weapon_of_type(weapon_type: String) -> WeaponDefinition:
	var cr := get_node_or_null("/root/ContentRegistry")
	if cr == null:
		return null
	for def in cr.weapons():
		if def.legacy_weapon_type() == weapon_type:
			return def
	return null
