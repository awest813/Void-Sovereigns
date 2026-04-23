class_name SKLootTable
extends Resource
## Weighted loot table with per-item min/max counts and optional conditions.
## Replaces hardcoded LootData.roll_tier() calls on enemies.
## Each entry in `entries` is a Dictionary with these keys:
##   item_id    : String  — unique identifier
##   item_name  : String  — display name
##   base_value : int     — credits value
##   category   : String  — "ammo" | "valuable" | "relic" | "scrap"
##   weight     : int     — relative pick probability (higher = more likely)
##   min_count  : int     — minimum items dropped (default 1)
##   max_count  : int     — maximum items dropped (default 1)
##   condition  : String  — optional requirement, e.g. "level>=5" (empty = always)

@export var entries:   Array    = []   # Array of Dictionaries (see schema above)
@export var min_rolls: int      = 1    # Minimum number of roll passes
@export var max_rolls: int      = 1    # Maximum number of roll passes

# ── Public API ────────────────────────────────────────────────────────────────

## Roll loot and return an Array of item Dictionaries {id, name, value, category}.
## context may contain "level", "mission_id", etc. for condition evaluation.
func roll(context: Dictionary = {}) -> Array:
	var eligible := _eligible_entries(context)
	if eligible.is_empty():
		return []

	var result: Array = []
	var count := randi_range(min_rolls, max_rolls)
	for _i in count:
		var entry := _weighted_pick(eligible)
		if entry.is_empty():
			continue
		var qty := randi_range(entry.get("min_count", 1), entry.get("max_count", 1))
		for _q in qty:
			result.append({
				"id":       entry.get("item_id",    "unknown"),
				"name":     entry.get("item_name",  "Unknown Item"),
				"value":    entry.get("base_value", 0),
				"category": entry.get("category",   "misc"),
			})
	return result

## Build an SKLootTable from one of the legacy LootData tier constants.
## Useful as a migration bridge until tier tables are converted to Resources.
static func from_array(tier_array: Array, min_r: int = 1, max_r: int = 1) -> SKLootTable:
	var tbl := SKLootTable.new()
	tbl.min_rolls = min_r
	tbl.max_rolls = max_r
	for item in tier_array:
		var entry := item.duplicate()
		if not entry.has("item_id"):
			entry["item_id"] = entry.get("id", "")
		if not entry.has("item_name"):
			entry["item_name"] = entry.get("name", "")
		if not entry.has("base_value"):
			entry["base_value"] = entry.get("value", 0)
		tbl.entries.append(entry)
	return tbl

# ── Internals ─────────────────────────────────────────────────────────────────

func _eligible_entries(context: Dictionary) -> Array:
	var result: Array = []
	for entry in entries:
		if _condition_met(entry.get("condition", ""), context):
			result.append(entry)
	return result

func _weighted_pick(eligible: Array) -> Dictionary:
	var total := 0
	for e in eligible:
		total += e.get("weight", 1)
	if total == 0:
		return {}
	var r := randi() % total
	for e in eligible:
		r -= e.get("weight", 1)
		if r < 0:
			return e
	return eligible[-1]

## Evaluate a simple condition string against a context dictionary.
## Supported operators: >=, <=, ==, >, <
## Example conditions: "level>=5", "level<10"
func _condition_met(cond: String, context: Dictionary) -> bool:
	if cond.is_empty():
		return true
	for op in [">=", "<=", "==", ">", "<"]:
		if cond.contains(op):
			var parts := cond.split(op)
			if parts.size() != 2:
				return true
			var key     := parts[0].strip_edges()
			var val     := parts[1].strip_edges().to_int()
			var ctx_val := int(context.get(key, 0))
			match op:
				">=": return ctx_val >= val
				"<=": return ctx_val <= val
				"==": return ctx_val == val
				">":  return ctx_val > val
				"<":  return ctx_val < val
	return true
