extends Node
## DataManager — autoload singleton for mission/perk data.
## Ports DataManager.ts; accessible globally as DataManager.

const PERKS: Array = [
	{
		"id": "TITAN SHIELDS",
		"name": "TITAN SHIELDS",
		"description": "Double maximum shield capacity (200 units).",
		"icon": "SH",
		"cost": 1,
	},
	{
		"id": "MARATHONER",
		"name": "MARATHONER",
		"description": "+25% base movement speed.",
		"icon": "SP",
		"cost": 1,
	},
	{
		"id": "OXY-EFFICIENCY",
		"name": "OXY-EFFICIENCY",
		"description": "-40% oxygen consumption rate.",
		"icon": "OX",
		"cost": 1,
	},
	{
		"id": "DEVASTATOR MELEE",
		"name": "DEVASTATOR MELEE",
		"description": "Double melee bash damage.",
		"icon": "ME",
		"cost": 1,
	},
	{
		"id": "OVERDRIVE",
		"name": "OVERDRIVE",
		"description": "+50% sprint speed multiplier.",
		"icon": "OD",
		"cost": 1,
	},
]

func get_missions() -> Array:
	return MissionData.MISSIONS

func get_mission(id: String) -> Dictionary:
	for m in MissionData.MISSIONS:
		if m["id"] == id:
			return m
	return {}

func get_next_mission() -> Dictionary:
	var completed := MissionState.completed_missions
	for m in MissionData.MISSIONS:
		if not completed.has(m["id"]):
			return m
	return {}

func get_perks() -> Array:
	return PERKS

func get_perk(id: String) -> Dictionary:
	for p in PERKS:
		if p["id"] == id:
			return p
	return {}

func get_loot_table(tier: String) -> Array:
	match tier:
		"RARE": return LootData.TABLE_RARE
		"BOSS": return LootData.TABLE_BOSS
		_:      return LootData.TABLE_COMMON
