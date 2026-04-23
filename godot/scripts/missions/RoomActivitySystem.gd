extends Node
## RoomActivitySystem — enables/disables MeshInstance3D and OmniLight3D nodes
## in rooms that are not adjacent to the player's current room.
## Attach as a child of MissionZone. Call setup(rooms_root) after build().

var _rooms: Array[Node3D] = []
var _player: Node3D = null
var _current_room_id: String = ""

func setup(rooms_root: Node3D, player: Node3D) -> void:
	_player = player
	for child in rooms_root.get_children():
		if child.has_meta("room_data"):
			_rooms.append(child)

func _process(_delta: float) -> void:
	if _player == null or _rooms.is_empty():
		return
	_update_visibility()

func _update_visibility() -> void:
	# Find which room the player is in.
	var closest_id := ""
	var closest_dist := INF
	for room in _rooms:
		var d := _player.global_position.distance_to(room.global_position)
		if d < closest_dist:
			closest_dist = d
			closest_id = room.name.replace("Room_", "")

	if closest_id == _current_room_id:
		return
	_current_room_id = closest_id

	# Build active set: current room + its direct neighbours.
	var active_set := {}
	for room in _rooms:
		var data: Dictionary = room.get_meta("room_data")
		if data["id"] == closest_id:
			active_set[closest_id] = true
			for conn in data["connections"]:
				active_set[conn] = true
			break

	# Enable/disable child nodes accordingly.
	for room in _rooms:
		var data: Dictionary = room.get_meta("room_data")
		var visible := active_set.has(data["id"])
		_set_room_active(room, visible)

func _set_room_active(room: Node3D, active: bool) -> void:
	for child in room.get_children():
		if child is MeshInstance3D or child is OmniLight3D or child is SpotLight3D:
			child.visible = active
