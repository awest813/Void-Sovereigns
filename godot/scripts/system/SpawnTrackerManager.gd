extends Node
## SpawnTrackerManager — autoload that tracks which spawn IDs have been activated
## and persists that state via SaveSystem.
##
## Usage in a spawn point:
##   if not SpawnTrackerManager.is_activated(my_spawn_id):
##       SpawnTrackerManager.activate(my_spawn_id)
##       # instantiate enemies / loot here
##
## To reset a zone on mission start (so enemies respawn):
##   SpawnTrackerManager.reset_zone("mission_1/")

signal spawn_activated(spawn_id: String)

const _CFG_SECTION := "spawns"

## activated: { spawn_id: String → true }
var _activated: Dictionary = {}

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())

# ── Public API ────────────────────────────────────────────────────────────────

func is_activated(spawn_id: String) -> bool:
	return _activated.get(spawn_id, false)

func activate(spawn_id: String) -> void:
	if _activated.get(spawn_id, false):
		return
	_activated[spawn_id] = true
	spawn_activated.emit(spawn_id)
	_flush()

## Deactivate (un-clear) a specific spawn so it can trigger again.
func deactivate(spawn_id: String) -> void:
	if _activated.erase(spawn_id):
		_flush()

## Reset all spawns whose ID begins with prefix (e.g., "mission_id/").
## Call before entering a mission zone that should have fresh enemies.
func reset_zone(prefix: String) -> void:
	var changed := false
	for key in _activated.keys():
		if key.begins_with(prefix):
			_activated.erase(key)
			changed = true
	if changed:
		_flush()

## Reset every tracked spawn (full wipe).
func reset_all() -> void:
	if not _activated.is_empty():
		_activated.clear()
		_flush()

## How many spawns are currently activated.
func activated_count() -> int:
	return _activated.size()

# ── Persistence ───────────────────────────────────────────────────────────────

func _flush() -> void:
	SaveSystem.set_value(_CFG_SECTION, "activated", _activated)
	SaveSystem.flush()

func load_state() -> void:
	_activated = SaveSystem.get_value(_CFG_SECTION, "activated", {})
