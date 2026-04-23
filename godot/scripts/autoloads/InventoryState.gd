extends Node
## InventoryState — autoload. Grid-aware stackable inventory.
##
## Stacks: Array of Dictionaries:
##   { id: String, count: int, durability: int, mods: Array, grid_pos: Vector2i }
## `grid_pos` is (-1, -1) when an item is unplaced (auto-sorted by capacity check).
##
## Capacity is derived from the equipped RIG + BACKPACK container grid
## (ArmorDefinition.container_w × container_h). When no containers are equipped,
## a default 4×4 stash is available so early-game pickups still work.
##
## `EconomyState.inventory` is preserved as a thin facade (see EconomyState.gd).

signal inventory_changed()
signal item_added(stack: Dictionary)
signal item_removed(stack: Dictionary)
signal capacity_changed(cells: int)

const _CFG_SECTION := "inventory"
const DEFAULT_FALLBACK_W: int = 4
const DEFAULT_FALLBACK_H: int = 4

## Array[Dictionary] — one entry per stack.
var stacks: Array = []

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())
	if LoadoutState.has_signal("equipment_changed"):
		LoadoutState.equipment_changed.connect(_on_capacity_dirty)

# ── Public API ────────────────────────────────────────────────────────────────

## Total grid cells available from equipped containers.
func total_capacity() -> int:
	var cells := 0
	var rig := LoadoutState.get_equipped_armor("rig")
	if rig:
		cells += rig.container_cells()
	var back := LoadoutState.get_equipped_armor("backpack")
	if back:
		cells += back.container_cells()
	if cells == 0:
		cells = DEFAULT_FALLBACK_W * DEFAULT_FALLBACK_H
	return cells

## Cells used by current stacks.
func used_capacity() -> int:
	var used := 0
	for s in stacks:
		var def := _resolve_def(s.get("id", ""))
		if def:
			used += def.grid_cells() * maxi(1, _stack_slots_for(s, def))
		else:
			used += 1
	return used

func remaining_capacity() -> int:
	return maxi(0, total_capacity() - used_capacity())

## Does at least one more unit of `item_id` fit?
func can_fit(item_id: String, count: int = 1) -> bool:
	var def := _resolve_def(item_id)
	var cells := 1
	if def:
		cells = def.grid_cells()
		# Fits into existing stack?
		if def.stack_size > 1:
			for s in stacks:
				if s.get("id") == item_id:
					var free_in_stack: int = def.stack_size - int(s.get("count", 0))
					if free_in_stack >= count:
						return true
					count -= free_in_stack
	return remaining_capacity() >= cells * maxi(1, count)

## Add an item by id (and optional count). Returns true when successful.
func add_item(item_id: String, count: int = 1, durability: int = -1) -> bool:
	if count <= 0:
		return false
	var def := _resolve_def(item_id)
	# Try to top up existing stacks first.
	if def and def.stack_size > 1:
		for s in stacks:
			if s.get("id") == item_id and int(s.get("count", 0)) < def.stack_size:
				var free: int = def.stack_size - int(s["count"])
				var to_add: int = mini(free, count)
				s["count"] = int(s["count"]) + to_add
				count -= to_add
				item_added.emit(s)
				if count == 0:
					inventory_changed.emit()
					save_state()
					return true
	# Create a new stack for the remainder.
	if count > 0:
		if not can_fit(item_id, count):
			inventory_changed.emit()
			save_state()
			return false
		var new_stack := {
			"id": item_id,
			"count": count,
			"durability": durability,
			"mods": [],
			"grid_pos": Vector2i(-1, -1),
		}
		stacks.append(new_stack)
		item_added.emit(new_stack)
	inventory_changed.emit()
	save_state()
	return true

## Legacy: accept a dict shaped {id, name, value, category}. Used during
## migration from EconomyState.
func add_item_dict(item: Dictionary) -> bool:
	if item.is_empty():
		return false
	return add_item(String(item.get("id", "")), int(item.get("count", 1)), -1)

func remove_stack(stack: Dictionary) -> bool:
	var idx := stacks.find(stack)
	if idx == -1:
		return false
	stacks.remove_at(idx)
	item_removed.emit(stack)
	inventory_changed.emit()
	save_state()
	return true

func remove_item(item_id: String, count: int = 1) -> int:
	var removed := 0
	for i in range(stacks.size() - 1, -1, -1):
		if count <= 0:
			break
		var s: Dictionary = stacks[i]
		if s.get("id") != item_id:
			continue
		var have: int = int(s.get("count", 0))
		var take: int = mini(have, count)
		s["count"] = have - take
		removed += take
		count -= take
		if s["count"] <= 0:
			stacks.remove_at(i)
			item_removed.emit(s)
	if removed > 0:
		inventory_changed.emit()
		save_state()
	return removed

## Move a stack to a different explicit grid position (used by InventoryTab).
func move_item(stack: Dictionary, new_pos: Vector2i) -> bool:
	var idx := stacks.find(stack)
	if idx == -1:
		return false
	stacks[idx]["grid_pos"] = new_pos
	inventory_changed.emit()
	save_state()
	return true

## Group + sort stacks by category/rarity/name for the "SORT" button.
func sort() -> void:
	stacks.sort_custom(func(a, b):
		var da := _resolve_def(a.get("id", ""))
		var db := _resolve_def(b.get("id", ""))
		var ca := da.category if da else ItemDefinition.Category.MISC
		var cb := db.category if db else ItemDefinition.Category.MISC
		if ca != cb:
			return ca < cb
		var ra := da.rarity if da else 0
		var rb := db.rarity if db else 0
		if ra != rb:
			return ra > rb
		var na := da.display_name if da else String(a.get("id", ""))
		var nb := db.display_name if db else String(b.get("id", ""))
		return na < nb)
	inventory_changed.emit()
	save_state()

func count_of(item_id: String) -> int:
	var total := 0
	for s in stacks:
		if s.get("id") == item_id:
			total += int(s.get("count", 0))
	return total

func has_item(item_id: String) -> bool:
	return count_of(item_id) > 0

# ── Back-compat shim: emulate EconomyState.inventory as Array[Dict] ──────────

## Returns stacks as legacy-shaped dicts for UI that still uses the old format.
func as_legacy_array() -> Array:
	var out: Array = []
	for s in stacks:
		var def := _resolve_def(s.get("id", ""))
		var dict := {}
		if def:
			dict = def.to_dict()
		else:
			dict = {
				"id":         String(s.get("id", "")),
				"name":       String(s.get("id", "")),
				"base_value": 0,
				"value":      0,
				"category":   "misc",
			}
		dict["count"] = int(s.get("count", 1))
		dict["_stack_ref"] = s
		out.append(dict)
	return out

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	# Strip Vector2i grid_pos for config-file friendliness.
	var serialisable: Array = []
	for s in stacks:
		var gp: Vector2i = s.get("grid_pos", Vector2i(-1, -1))
		serialisable.append({
			"id":        s.get("id", ""),
			"count":     s.get("count", 1),
			"durability": s.get("durability", -1),
			"mods":      s.get("mods", []),
			"gx":        gp.x,
			"gy":        gp.y,
		})
	SaveSystem.set_value(_CFG_SECTION, "stacks", serialisable)
	SaveSystem.flush()

func load_state() -> void:
	stacks.clear()
	var raw: Variant = SaveSystem.get_value(_CFG_SECTION, "stacks", [])
	if raw is Array:
		for entry in raw:
			if entry is Dictionary:
				stacks.append({
					"id":        entry.get("id", ""),
					"count":     int(entry.get("count", 1)),
					"durability": int(entry.get("durability", -1)),
					"mods":      entry.get("mods", []),
					"grid_pos":  Vector2i(int(entry.get("gx", -1)), int(entry.get("gy", -1))),
				})
	# Migration: pull in EconomyState legacy inventory exactly once, the
	# first time we load into a save that still has the old shape. A sentinel
	# flag ensures we don't re-migrate every time the player empties their
	# inventory legitimately.
	var migrated: bool = SaveSystem.get_value(_CFG_SECTION, "legacy_migrated", false)
	if stacks.is_empty() and not migrated:
		var legacy: Variant = SaveSystem.get_value("economy", "inventory", [])
		if legacy is Array and not legacy.is_empty():
			for item in legacy:
				if item is Dictionary:
					add_item_dict(item)
			SaveSystem.set_value("economy", "inventory", [])
		SaveSystem.set_value(_CFG_SECTION, "legacy_migrated", true)
		SaveSystem.flush()
	inventory_changed.emit()

# ── Internal ──────────────────────────────────────────────────────────────────

func _resolve_def(item_id: String) -> ItemDefinition:
	if item_id == "":
		return null
	var cr := get_node_or_null("/root/ContentRegistry")
	if cr == null:
		return null
	return cr.get_item(StringName(item_id))

func _stack_slots_for(s: Dictionary, def: ItemDefinition) -> int:
	# Stackable items consume a single grid footprint regardless of count.
	if def.stack_size > 1:
		return 1
	return int(s.get("count", 1))

func _on_capacity_dirty() -> void:
	capacity_changed.emit(total_capacity())
