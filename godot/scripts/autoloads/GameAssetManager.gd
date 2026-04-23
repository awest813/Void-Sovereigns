extends Node
## GameAssetManager — caches PackedScene instances keyed by res:// path.
## Mirrors BabylonAssetLoader.ts container-cache pattern.

var _cache: Dictionary = {}

## Return cached PackedScene, loading it on first access.
func get_scene(path: String) -> PackedScene:
	if not _cache.has(path):
		var res = load(path)
		if res == null:
			push_error("GameAssetManager: could not load '%s'" % path)
			return null
		_cache[path] = res
	return _cache[path]

## Instantiate from cache. Returns null if path is invalid.
func spawn(path: String) -> Node:
	var packed: PackedScene = get_scene(path)
	if packed == null:
		return null
	return packed.instantiate()

## Pre-warm a list of paths (call during loading screen).
func preload_paths(paths: Array) -> void:
	for path in paths:
		get_scene(path)
