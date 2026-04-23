extends Node
## InteractionSystem — raycast-based interaction prompt.
## Add as a child of the player; call register/unregister from interactable nodes.

signal interactable_found(label: String)
signal interactable_lost()

@export var interact_range: float = 3.0

@onready var _player: CharacterBody3D = get_parent()
@onready var _camera: Camera3D = _player.get_node("Camera3D")

## Registered interactables: {node: Node3D, label: String, callback: Callable}
var _interactables: Array = []
var _current: Dictionary = {}

func register(node: Node3D, label: String, callback: Callable) -> void:
	_interactables.append({"node": node, "label": label, "callback": callback})

func unregister(node: Node3D) -> void:
	_interactables = _interactables.filter(func(e): return e["node"] != node)

func _process(_delta: float) -> void:
	_check_interaction()
	if Input.is_action_just_pressed("interact") and not _current.is_empty():
		_current["callback"].call()

func _check_interaction() -> void:
	var space := get_world_3d().direct_space_state
	var origin := _camera.global_position
	var fwd    := -_camera.global_transform.basis.z
	var query  := PhysicsRayQueryParameters3D.create(origin, origin + fwd * interact_range)
	var result := space.intersect_ray(query)

	var found: Dictionary = {}
	if result.has("collider"):
		var c = result["collider"]
		for entry in _interactables:
			if entry["node"] == c or entry["node"].is_ancestor_of(c):
				found = entry
				break

	if found.is_empty() and not _current.is_empty():
		_current = {}
		interactable_lost.emit()
	elif not found.is_empty() and _current.get("node") != found.get("node"):
		_current = found
		interactable_found.emit(found["label"])
