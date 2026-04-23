class_name WeaponDefinition
extends ItemDefinition
## Weapon resource consumed by WeaponSystem and the Loadout tab.
## `damage_type` should be a value from DamagePacket.Type (int).

enum WeaponClass { PISTOL, SMG, SHOTGUN, RIFLE, HEAVY, MELEE }

@export var weapon_class: WeaponClass = WeaponClass.PISTOL
@export_range(0.0, 9999.0, 0.1) var damage:    float  = 10.0
## Seconds between shots (lower is faster).
@export_range(0.01, 5.0, 0.01)   var fire_rate: float = 0.25
@export_range(0, 999, 1)         var mag_size:  int   = 12
@export var ammo_type: StringName = &"pistol"
## 0.0 = pinpoint accuracy, higher = more cone spread (used as per-shot spread).
@export_range(0.0, 0.5, 0.001)   var recoil:    float = 0.01
@export_range(0.0, 500.0, 0.5)   var range:     float = 50.0
## Maps to DamagePacket.Type (0=BALLISTIC, 1=VOID, 2=THERMAL, 3=MELEE, 4=EXPLOSIVE, 5=HAZARD).
@export_range(0, 5, 1)           var damage_type: int = 0
## Pellets fired per trigger pull (shotguns > 1).
@export_range(1, 32, 1)          var pellets:   int   = 1
@export var mod_slots: Array[StringName] = []

func _init() -> void:
	category = Category.WEAPON

## DPS = damage * pellets / fire_rate. Used by tooltips.
func dps() -> float:
	if fire_rate <= 0.0:
		return 0.0
	return damage * float(pellets) / fire_rate

## Legacy weapon-type string expected by LoadoutState / WeaponSystem.
func legacy_weapon_type() -> String:
	match weapon_class:
		WeaponClass.PISTOL:  return "pistol"
		WeaponClass.SHOTGUN: return "shotgun"
		WeaponClass.SMG:     return "smg"
		WeaponClass.RIFLE:   return "rifle"
		WeaponClass.HEAVY:   return "heavy"
		WeaponClass.MELEE:   return "melee"
	return "pistol"
