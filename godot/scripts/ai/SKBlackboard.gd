class_name SKBlackboard
extends RefCounted
## Shared typed key-value store for AI coordination within an encounter.
## Create one per encounter group (mission.gd) and pass to each bot via set_blackboard().
## Values are stored as Variant; typed accessors validate at get time.

var _data: Dictionary = {}

# ── Typed accessors ───────────────────────────────────────────────────────────

func set_vec3(key: String, value: Vector3) -> void:
	_data[key] = value

func get_vec3(key: String, default: Vector3 = Vector3.ZERO) -> Vector3:
	var v = _data.get(key, default)
	return v if v is Vector3 else default

func set_bool(key: String, value: bool) -> void:
	_data[key] = value

func get_bool(key: String, default: bool = false) -> bool:
	var v = _data.get(key, default)
	return v if v is bool else default

func set_float(key: String, value: float) -> void:
	_data[key] = value

func get_float(key: String, default: float = 0.0) -> float:
	var v = _data.get(key, default)
	return float(v) if v != null else default

func set_int(key: String, value: int) -> void:
	_data[key] = value

func get_int(key: String, default: int = 0) -> int:
	var v = _data.get(key, default)
	return int(v) if v != null else default

func set_node(key: String, value: Node) -> void:
	_data[key] = value

func get_node(key: String) -> Node:
	var v = _data.get(key, null)
	return v if v is Node else null

func set_string(key: String, value: String) -> void:
	_data[key] = value

func get_string(key: String, default: String = "") -> String:
	return str(_data.get(key, default))

# ── Generic access ────────────────────────────────────────────────────────────

func has(key: String) -> bool:
	return _data.has(key)

func erase(key: String) -> void:
	_data.erase(key)

func clear() -> void:
	_data.clear()

func keys() -> Array:
	return _data.keys()
