extends Node
## AssetManifest — mirrors AssetManifest.ts.
## Maps logical keys to res:// paths for all GLB assets.

const ASSETS: Dictionary = {
	"ENVIRONMENT": {
		"HUB":            "res://assets/environment/hub_station.glb",
		"CORRIDOR":       "res://assets/environment/corridor.glb",
		"ROOM":           "res://assets/environment/room.glb",
	},
	"ENEMIES": {
		"SECURITY_MECH":  "res://assets/enemies/security_mech.glb",
		"TURRET":         "res://assets/enemies/turret.glb",
		"BOSS_CENTURION": "res://assets/enemies/boss_centurion.glb",
	},
	"WEAPONS": {
		"PISTOL":         "res://assets/weapons/pistol.glb",
		"SHOTGUN":        "res://assets/weapons/shotgun.glb",
		"SMG":            "res://assets/weapons/smg.glb",
	},
	"PICKUPS": {
		"HEALTH":         "res://assets/pickups/health_pickup.glb",
		"AMMO":           "res://assets/pickups/ammo_pickup.glb",
		"CRATE":          "res://assets/pickups/crate.glb",
		"OBJECTIVE":      "res://assets/pickups/data_core.glb",
	},
	"PROPS": {
		"DROPSHIP":       "res://assets/props/dropship.glb",
	},
}
