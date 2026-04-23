extends Node3D
## MissionZone — instantiates dungeon rooms from DungeonGenerator output.
## Attach to the mission scene root; call build(seed) from mission.gd.

const ROOM_SCENE := "res://scenes/entities/room_placeholder.tscn"

## Called by the mission scene after the player is spawned.
func build(seed_val: float) -> Dictionary:
	var gen := DungeonGenerator.new()
	var rooms: Array = gen.generate(seed_val)

	var spawn_pos    := Vector3.ZERO
	var objective_node: Node3D = null
	var extraction_node: Node3D = null

	for room in rooms:
		var node := _spawn_room(room)
		if node == null:
			continue

		match room["type"]:
			"Spawn":
				spawn_pos = room["position"] + Vector3(0.0, 1.7, 0.0)
			"Objective":
				objective_node = node
			"Extraction":
				extraction_node = node

	return {
		"spawn_position":   spawn_pos,
		"objective_node":   objective_node,
		"extraction_node":  extraction_node,
		"rooms":            rooms,
	}

func _spawn_room(room: Dictionary) -> Node3D:
	# Try to load a typed scene; fall back to a coloured box placeholder.
	var scene_path := "res://scenes/rooms/%s.tscn" % room["type"].to_lower()
	var packed: PackedScene = null
	if ResourceLoader.exists(scene_path):
		packed = load(scene_path)

	var node: Node3D
	if packed:
		node = packed.instantiate()
	else:
		node = _make_placeholder(room)

	node.position = room["position"]
	node.name     = "Room_%s" % room["id"]
	node.set_meta("room_data", room)
	add_child(node)
	return node

## Coloured CSG box placeholder used when a proper room scene doesn't exist yet.
func _make_placeholder(room: Dictionary) -> Node3D:
	var n := Node3D.new()
	var mesh := MeshInstance3D.new()
	var box  := BoxMesh.new()
	var sz: Vector3 = room["size"]
	box.size = sz
	mesh.mesh = box
	mesh.position = Vector3(0.0, sz.y * 0.5, 0.0)

	var mat := StandardMaterial3D.new()
	mat.albedo_color = _room_color(room["type"])
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.albedo_color.a = 0.35
	mesh.material_override = mat

	n.add_child(mesh)

	# Collision floor for the placeholder
	var body  := StaticBody3D.new()
	var coll  := CollisionShape3D.new()
	var shape := BoxShape3D.new()
	shape.size = Vector3(sz.x, 0.2, sz.z)
	coll.shape = shape
	body.position = Vector3(0.0, 0.1, 0.0)
	body.add_child(coll)
	n.add_child(body)

	return n

func _room_color(room_type: String) -> Color:
	match room_type:
		"Spawn":      return Color(0.2, 0.8, 0.2)
		"Objective":  return Color(1.0, 0.8, 0.0)
		"Extraction": return Color(0.2, 0.6, 1.0)
		"Loot":       return Color(0.8, 0.4, 0.0)
		"Engine":     return Color(0.8, 0.2, 0.2)
		"Junction":   return Color(0.6, 0.2, 0.8)
		"Airlock":    return Color(0.4, 0.4, 0.4)
		_:            return Color(0.3, 0.3, 0.3)
