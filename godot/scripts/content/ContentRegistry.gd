extends Node
## ContentRegistry — autoload. Loads typed .tres Resources from
## `res://content/{weapons,armor,perks,skills}/` into per-category dictionaries
## keyed by id (StringName).
##
## Falls back to built-in seeded content if the folders are empty (so the
## project runs headless in CI-style environments without authored .tres).
## Call `refresh()` to reload after runtime changes.

signal content_reloaded()

const CONTENT_ROOT := "res://content"

var _weapons: Dictionary = {}   # StringName id → WeaponDefinition
var _armor:   Dictionary = {}   # StringName id → ArmorDefinition
var _perks:   Dictionary = {}   # StringName id → PerkDefinition
var _skills:  Dictionary = {}   # StringName id → SkillDefinition

func _ready() -> void:
	refresh()

# ── Public API ────────────────────────────────────────────────────────────────

func refresh() -> void:
	_weapons = _load_dir("%s/weapons" % CONTENT_ROOT, "WeaponDefinition")
	_armor   = _load_dir("%s/armor"   % CONTENT_ROOT, "ArmorDefinition")
	_perks   = _load_dir("%s/perks"   % CONTENT_ROOT, "PerkDefinition")
	_skills  = _load_dir("%s/skills"  % CONTENT_ROOT, "SkillDefinition")

	# Merge in seeded defaults so the project always has runnable content.
	for entry in ContentSeeds.weapons():
		if not _weapons.has(entry.id):
			_weapons[entry.id] = entry
	for entry in ContentSeeds.armor():
		if not _armor.has(entry.id):
			_armor[entry.id] = entry
	for entry in ContentSeeds.perks():
		if not _perks.has(entry.id):
			_perks[entry.id] = entry
	for entry in ContentSeeds.skills():
		if not _skills.has(entry.id):
			_skills[entry.id] = entry

	content_reloaded.emit()

func weapons() -> Array:
	return _weapons.values()

func armors() -> Array:
	return _armor.values()

func perks() -> Array:
	return _perks.values()

func skills() -> Array:
	return _skills.values()

func get_weapon(id: StringName) -> WeaponDefinition:
	return _weapons.get(id)

func get_armor(id: StringName) -> ArmorDefinition:
	return _armor.get(id)

func get_perk(id: StringName) -> PerkDefinition:
	return _perks.get(id)

func get_skill(id: StringName) -> SkillDefinition:
	return _skills.get(id)

## Resolve any item id to its definition (searches weapons + armor).
func get_item(id: StringName) -> ItemDefinition:
	if _weapons.has(id):
		return _weapons[id]
	if _armor.has(id):
		return _armor[id]
	return null

func has_item(id: StringName) -> bool:
	return _weapons.has(id) or _armor.has(id)

# ── Internal ──────────────────────────────────────────────────────────────────

func _load_dir(path: String, _class_name: String) -> Dictionary:
	var out: Dictionary = {}
	var dir := DirAccess.open(path)
	if dir == null:
		return out
	dir.list_dir_begin()
	var file_name := dir.get_next()
	while file_name != "":
		if not dir.current_is_dir() and (file_name.ends_with(".tres") or file_name.ends_with(".res")):
			var res := ResourceLoader.load(path + "/" + file_name)
			if res and "id" in res and StringName(res.id) != &"":
				out[StringName(res.id)] = res
		file_name = dir.get_next()
	dir.list_dir_end()
	return out
