extends RefCounted
## DungeonGenerator — direct port of DungeonGenerator.ts
## Generates a seeded grid-based dungeon: critical path + branch rooms.
## Returns Array of RoomNode dictionaries.

# ── Constants ─────────────────────────────────────────────────────────────────

const GRID_UNIT := 10
const DIRECTIONS := {
	"N": {"x":  0, "y": -1, "opposite": "S"},
	"E": {"x":  1, "y":  0, "opposite": "W"},
	"S": {"x":  0, "y":  1, "opposite": "N"},
	"W": {"x": -1, "y":  0, "opposite": "E"},
}

# Room types
const ROOM_TYPES    := ["Spawn","Corridor","Junction","Loot","Engine","Objective","Extraction","Airlock"]
const TILE_SHAPES   := ["dead-end","straight","corner","t-junction","cross","room"]

# ── Mulberry32 PRNG ───────────────────────────────────────────────────────────

var _seed_state: int = 0

func _mulberry32_next() -> float:
	_seed_state += 0x6d2b79f5
	var t: int = _seed_state
	t = (t ^ (t >> 15)) * (t | 1) & 0xFFFFFFFF
	t = (t ^ (t + ((t ^ (t >> 7)) * (t | 61) & 0xFFFFFFFF))) & 0xFFFFFFFF
	return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0

func _seed(s: int) -> void:
	_seed_state = (s * 1_000_000) & 0xFFFFFFFF
	if _seed_state == 0:
		_seed_state = 1

# ── Public API ────────────────────────────────────────────────────────────────

func generate(seed_val: float) -> Array:
	_seed(int(seed_val * 1_000_000))
	var cells := {}
	var critical_path := _build_critical_path(9)

	for depth in critical_path.size():
		var pt := critical_path[depth]
		_ensure_cell(cells, pt.x, pt.y, true, depth)
		if depth > 0:
			var prev := critical_path[depth - 1]
			_connect_cells(cells, prev.x, prev.y, pt.x, pt.y)

	for i in range(1, critical_path.size() - 2):
		if _mulberry32_next() > 0.55:
			continue
		var pt := critical_path[i]
		_build_branch(cells, pt.x, pt.y, 1 + int(_mulberry32_next() * 3), i + 1)

	var max_depth := critical_path.size() - 1
	var rooms := []
	for cell in cells.values():
		rooms.append(_to_room_node(cell, cells, max_depth))
	return rooms

# ── Private ───────────────────────────────────────────────────────────────────

func _build_critical_path(length: int) -> Array:
	var path := [{"x": 0, "y": 0}]
	var heading := "E" if _mulberry32_next() > 0.5 else "S"

	while path.size() < length:
		var current := path[path.size() - 1]
		var choices := _weighted_directions(heading)
		var chosen := ""
		for dir in choices:
			var step: Dictionary = DIRECTIONS[dir]
			var nxt := {"x": current.x + step.x, "y": current.y + step.y}
			var found := false
			for p in path:
				if p.x == nxt.x and p.y == nxt.y:
					found = true
					break
			if not found:
				chosen = dir
				break
		if chosen == "":
			break
		var s: Dictionary = DIRECTIONS[chosen]
		path.append({"x": current.x + s.x, "y": current.y + s.y})
		heading = chosen

	return path

func _weighted_directions(heading: String) -> Array:
	var all_dirs := DIRECTIONS.keys()
	var lateral := []
	for d in all_dirs:
		if d != heading and d != DIRECTIONS[heading]["opposite"]:
			lateral.append(d)
	_shuffle_array(lateral)
	if _mulberry32_next() > 0.28:
		return [heading] + lateral + [DIRECTIONS[heading]["opposite"]]
	else:
		return lateral + [heading, DIRECTIONS[heading]["opposite"]]

func _build_branch(cells: Dictionary, sx: int, sy: int, length: int, depth: int) -> void:
	var x := sx
	var y := sy
	var last_dir := ""
	for _i in length:
		var dirs := DIRECTIONS.keys()
		_shuffle_array(dirs)
		var chosen := ""
		for d in dirs:
			if last_dir != "" and d == DIRECTIONS[last_dir]["opposite"]:
				continue
			var step: Dictionary = DIRECTIONS[d]
			var k := _key(x + step.x, y + step.y)
			if not cells.has(k):
				chosen = d
				break
		if chosen == "":
			return
		var s: Dictionary = DIRECTIONS[chosen]
		var nx := x + s.x
		var ny := y + s.y
		_ensure_cell(cells, nx, ny, false, depth + _i + 1)
		_connect_cells(cells, x, y, nx, ny)
		x = nx
		y = ny
		last_dir = chosen

func _ensure_cell(cells: Dictionary, x: int, y: int, critical: bool, depth: int) -> Dictionary:
	var k := _key(x, y)
	if cells.has(k):
		var c: Dictionary = cells[k]
		if critical and not c.get("critical_path", false):
			c["critical_path"] = true
		if critical:
			c["depth"] = mini(c["depth"], depth)
		return c
	var cell := {
		"x":            x,
		"y":            y,
		"critical_path":critical,
		"depth":        depth,
		"connections":  [],
	}
	cells[k] = cell
	return cell

func _connect_cells(cells: Dictionary, ax: int, ay: int, bx: int, by: int) -> void:
	var a := _ensure_cell(cells, ax, ay, false, 0)
	var b := _ensure_cell(cells, bx, by, false, 0)
	var kb := _key(bx, by)
	var ka := _key(ax, ay)
	if not (a["connections"] as Array).has(kb):
		(a["connections"] as Array).append(kb)
	if not (b["connections"] as Array).has(ka):
		(b["connections"] as Array).append(ka)

func _to_room_node(cell: Dictionary, cells: Dictionary, max_critical_depth: int) -> Dictionary:
	var id      := _key(cell.x, cell.y)
	var conns   := cell["connections"] as Array
	var exits   := _resolve_exits(cell)
	var shape   := _resolve_shape(exits.size(), exits)
	var is_dead_end   := conns.size() == 1
	var is_extraction := cell["critical_path"] and cell["depth"] == max_critical_depth
	var is_objective  := cell["critical_path"] and cell["depth"] == maxi(2, max_critical_depth - 2)

	var room_type := "Spawn"
	if cell.x == 0 and cell.y == 0:
		room_type = "Spawn"
	elif is_extraction:
		room_type = "Extraction"
	elif is_objective:
		room_type = "Objective"
	elif is_dead_end and not cell["critical_path"]:
		room_type = "Loot" if cell["depth"] % 2 == 0 else "Airlock"
	elif exits.size() >= 3:
		room_type = "Junction"
	elif cell["depth"] % 5 == 0:
		room_type = "Engine"
	else:
		room_type = "Corridor"

	var big := room_type in ["Loot", "Objective", "Extraction", "Airlock"]
	var room_scale := 1.4 if big else 1.0
	var final_shape := "room" if big else shape
	var height := 5.0 if room_type == "Engine" else 3.5

	return {
		"id":            id,
		"type":          room_type,
		"shape":         final_shape,
		"position":      Vector3(cell.x * GRID_UNIT, 0.0, cell.y * GRID_UNIT),
		"size":          Vector3(GRID_UNIT * room_scale, height, GRID_UNIT * room_scale),
		"grid":          {"x": cell.x, "y": cell.y},
		"depth":         cell["depth"],
		"critical_path": cell["critical_path"],
		"connections":   conns,
		"exits":         exits,
	}

func _resolve_exits(cell: Dictionary) -> Array:
	var exits := []
	for k in cell["connections"]:
		var parts := (k as String).split(",")
		var cx := int(parts[0])
		var cy := int(parts[1])
		var dx := cx - cell.x
		var dy := cy - cell.y
		for d in DIRECTIONS.keys():
			var step: Dictionary = DIRECTIONS[d]
			if step.x == dx and step.y == dy:
				exits.append(d)
				break
	return exits

func _resolve_shape(exit_count: int, exits: Array) -> String:
	if exit_count <= 1: return "dead-end"
	if exit_count == 4: return "cross"
	if exit_count == 3: return "t-junction"
	var a: String = exits[0]
	var b: String = exits[1]
	return "straight" if DIRECTIONS[a]["opposite"] == b else "corner"

func _key(x: int, y: int) -> String:
	return "%d,%d" % [x, y]

func _shuffle_array(arr: Array) -> void:
	for i in range(arr.size() - 1, 0, -1):
		var j := int(_mulberry32_next() * (i + 1))
		var tmp = arr[i]
		arr[i] = arr[j]
		arr[j] = tmp
