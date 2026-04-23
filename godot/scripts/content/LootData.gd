extends Node
## LootData — ports LootTable.ts tables into GDScript.
## Each entry: {id, name, base_value, weight, category}

const TABLE_COMMON: Array = [
	{"id": "scrap_metal",   "name": "Industrial Scrap",     "base_value": 50,  "weight": 50, "category": "scrap"},
	{"id": "sensor_array",  "name": "Damaged Sensor",       "base_value": 120, "weight": 20, "category": "valuable"},
	{"id": "ammo_pack",     "name": "Standard Ammo Crate",  "base_value": 25,  "weight": 30, "category": "ammo"},
]

const TABLE_RARE: Array = [
	{"id": "data_drive",    "name": "Encrypted Data Drive", "base_value": 450,  "weight": 60, "category": "valuable"},
	{"id": "neural_link",   "name": "Neural Link Module",   "base_value": 800,  "weight": 20, "category": "relic"},
	{"id": "ammo_supply",   "name": "Bulk Ammo Supply",     "base_value": 100,  "weight": 20, "category": "ammo"},
]

const TABLE_BOSS: Array = [
	{"id": "boss_shard",    "name": "Centurion Core Shard", "base_value": 5000,  "weight": 85, "category": "relic"},
	{"id": "relic_weapon",  "name": "Void-Touched Relic",   "base_value": 15000, "weight": 10, "category": "relic"},
	{"id": "apex_nanites",  "name": "Apex Nanite Cluster",  "base_value": 25000, "weight": 5,  "category": "relic"},
]

## Roll one item from the given table array.
static func roll(table: Array) -> Dictionary:
	var total_weight := 0
	for entry in table:
		total_weight += entry["weight"]
	if total_weight == 0:
		return {}
	var rand := randi() % total_weight
	for entry in table:
		if rand < entry["weight"]:
			return entry
		rand -= entry["weight"]
	return table[table.size() - 1]

## Roll multiple items.
static func roll_many(table: Array, count: int) -> Array:
	var results := []
	for i in count:
		var item := roll(table)
		if not item.is_empty():
			results.append(item)
	return results

## Convenience — roll by tier name.
static func roll_tier(tier: String) -> Dictionary:
	match tier:
		"RARE":  return roll(TABLE_RARE)
		"BOSS":  return roll(TABLE_BOSS)
		_:       return roll(TABLE_COMMON)
