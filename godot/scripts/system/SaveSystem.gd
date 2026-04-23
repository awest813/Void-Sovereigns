extends Node
## SaveSystem — centralized, slot-based persistence with schema versioning,
## migration hooks, and crash-safe atomic writes (write to .tmp, rename to .cfg).
## Must be the first autoload so all other autoloads can read from it in _ready().

const SAVE_VERSION := 1
const SAVE_DIR     := "user://saves/"
const SLOT_COUNT   := 3

signal save_completed(slot: int)
signal load_completed(slot: int)

var _active_slot: int = 0
## Nested Dictionary: { section -> { key -> value } }
var _data: Dictionary = {}

# ── Migration table — add callables keyed by the version they produce. ─────────
## Example: MIGRATIONS[2] = _migrate_v1_to_v2 migrates data from v1 → v2.
const MIGRATIONS: Dictionary = {
	# 2: _migrate_v1_to_v2,
}

# ── Lifecycle ─────────────────────────────────────────────────────────────────

func _ready() -> void:
	var err := DirAccess.make_dir_recursive_absolute(SAVE_DIR)
	if err != OK and err != ERR_ALREADY_EXISTS:
		push_error("SaveSystem: failed to create save dir '%s' (err %d)" % [SAVE_DIR, err])
	load_slot(0)   # Auto-load slot 0; other autoloads read from this in their _ready()

# ── Public API ─────────────────────────────────────────────────────────────────

## Load a save slot into memory. Returns false when no save file exists yet.
func load_slot(slot: int) -> bool:
	_active_slot = slot
	_data = {}
	var path := _slot_path(slot)
	if not FileAccess.file_exists(path):
		return false

	var cfg := ConfigFile.new()
	var err  := cfg.load(path)
	if err != OK:
		push_error("SaveSystem: load failed slot=%d err=%d" % [slot, err])
		return false

	for section in cfg.get_sections():
		_data[section] = {}
		for key in cfg.get_section_keys(section):
			_data[section][key] = cfg.get_value(section, key)

	# Schema migration
	var version: int = _data.get("__meta", {}).get("version", 0)
	if version < SAVE_VERSION:
		_data = _run_migrations(_data, version)
		_data.get_or_add("__meta", {})["version"] = SAVE_VERSION
		flush()   # Persist migrated data immediately

	load_completed.emit(slot)
	return true

## Write in-memory data atomically to disk (write .tmp then rename → .cfg).
func flush() -> void:
	var slot_file := "slot_%d.cfg" % _active_slot
	var tmp_file  := "slot_%d.cfg.tmp" % _active_slot
	var slot_path := SAVE_DIR + slot_file
	var tmp_path  := SAVE_DIR + tmp_file

	# Stamp metadata
	_data.get_or_add("__meta", {}).merge({
		"version":  SAVE_VERSION,
		"saved_at": int(Time.get_unix_time_from_system()),
		"slot":     _active_slot,
	}, true)

	var cfg := ConfigFile.new()
	for section in _data:
		var section_data = _data[section]
		if section_data is Dictionary:
			for key in section_data:
				cfg.set_value(section, key, section_data[key])

	var write_err := cfg.save(tmp_path)
	if write_err != OK:
		push_error("SaveSystem: tmp write failed slot=%d err=%d" % [_active_slot, write_err])
		return

	# Atomic replace: remove old file, rename tmp → slot
	var dir := DirAccess.open(SAVE_DIR)
	if dir == null:
		push_error("SaveSystem: cannot open save dir during flush")
		return
	if dir.file_exists(slot_file):
		var rm_err := dir.remove(slot_file)
		if rm_err != OK:
			push_error("SaveSystem: remove old save failed (err %d)" % rm_err)
			return
	var mv_err := dir.rename(tmp_file, slot_file)
	if mv_err != OK:
		push_error("SaveSystem: rename .tmp→.cfg failed (err %d)" % mv_err)
		return

	save_completed.emit(_active_slot)

## Read a value from the in-memory cache.
func get_value(section: String, key: String, default = null):
	return _data.get(section, {}).get(key, default)

## Write a value to the in-memory cache. Call flush() to persist.
func set_value(section: String, key: String, value) -> void:
	_data.get_or_add(section, {})[key] = value

## Convenience: set + flush in one call.
func save_value(section: String, key: String, value) -> void:
	set_value(section, key, value)
	flush()

## Return per-slot metadata (timestamp, version) without loading full data.
func slot_info(slot: int) -> Dictionary:
	var path := _slot_path(slot)
	if not FileAccess.file_exists(path):
		return {}
	var cfg := ConfigFile.new()
	if cfg.load(path) != OK:
		return {}
	return {
		"slot":     slot,
		"version":  cfg.get_value("__meta", "version",  0),
		"saved_at": cfg.get_value("__meta", "saved_at", 0),
	}

## List metadata for all slots (empty dict = no save in that slot).
func list_slots() -> Array:
	var result: Array = []
	for i in SLOT_COUNT:
		result.append(slot_info(i))
	return result

## Delete a save slot from disk.
func delete_slot(slot: int) -> void:
	var path := _slot_path(slot)
	if FileAccess.file_exists(path):
		var dir := DirAccess.open(SAVE_DIR)
		if dir:
			dir.remove("slot_%d.cfg" % slot)
	if _active_slot == slot:
		_data = {}

## Switch to a different slot (loads it into memory).
func switch_slot(slot: int) -> bool:
	return load_slot(slot)

# ── Migrations ────────────────────────────────────────────────────────────────

func _run_migrations(data: Dictionary, from_version: int) -> Dictionary:
	for v in range(from_version + 1, SAVE_VERSION + 1):
		if MIGRATIONS.has(v):
			data = MIGRATIONS[v].call(data)
	return data

# ── Helpers ───────────────────────────────────────────────────────────────────

func _slot_path(slot: int) -> String:
	return SAVE_DIR + "slot_%d.cfg" % slot
