extends Node
## LoadoutState — autoload persisting loadout slice.
## Ports LoadoutSlice from GameState.ts.

signal weapon_changed(weapon_type: String)
signal ammo_changed(weapon_type: String, current: int)
signal equipment_changed()

var weapon_damage: int = 10
var armor_durability: int = 100
var equipped_weapon: String = "pistol"
var ammo: Dictionary = {
	"pistol":  60,
	"shotgun": 12,
	"smg":     120,
}

const _CFG_SECTION := "loadout"

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())

# ── Mutations ─────────────────────────────────────────────────────────────────

func equip_weapon(weapon_type: String) -> void:
	equipped_weapon = weapon_type
	weapon_changed.emit(equipped_weapon)
	save_state()

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

func set_armor_durability(val: int) -> void:
	armor_durability = val
	equipment_changed.emit()
	save_state()

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	SaveSystem.set_value(_CFG_SECTION, "weapon_damage",    weapon_damage)
	SaveSystem.set_value(_CFG_SECTION, "armor_durability", armor_durability)
	SaveSystem.set_value(_CFG_SECTION, "equipped_weapon",  equipped_weapon)
	SaveSystem.set_value(_CFG_SECTION, "ammo",             ammo)
	SaveSystem.flush()

func load_state() -> void:
	weapon_damage    = SaveSystem.get_value(_CFG_SECTION, "weapon_damage",    10)
	armor_durability = SaveSystem.get_value(_CFG_SECTION, "armor_durability", 100)
	equipped_weapon  = SaveSystem.get_value(_CFG_SECTION, "equipped_weapon",  "pistol")
	ammo             = SaveSystem.get_value(_CFG_SECTION, "ammo",             {"pistol":60,"shotgun":12,"smg":120})
