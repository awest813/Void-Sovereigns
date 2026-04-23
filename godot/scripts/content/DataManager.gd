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
	# Prefer ContentRegistry (typed PerkDefinitions) when available; fall
	# back to the static PERKS array for any environment that doesn't have
	# the registry loaded yet.
	if Engine.has_singleton("ContentRegistry") or (get_tree() and get_tree().root.has_node("ContentRegistry")):
		var cr := _registry()
		if cr:
			var perks: Array = []
			for p in cr.perks():
				perks.append(p.to_dict())
			if not perks.is_empty():
				return perks
	return PERKS

func get_perk(id: String) -> Dictionary:
	var cr := _registry()
	if cr:
		var def := cr.get_perk(StringName(id))
		if def:
			return def.to_dict()
	for p in PERKS:
		if p["id"] == id:
			return p
	return {}

func _registry() -> Node:
	if get_tree() == null:
		return null
	return get_tree().root.get_node_or_null("ContentRegistry")

func get_loot_table(tier: String) -> Array:
	match tier:
		"RARE": return LootData.TABLE_RARE
		"BOSS": return LootData.TABLE_BOSS
		_:      return LootData.TABLE_COMMON
