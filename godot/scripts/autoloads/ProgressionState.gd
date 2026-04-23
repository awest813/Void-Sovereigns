extends Node
## ProgressionState — autoload persisting XP, level, perks, skills.
## Ports ProgressionSlice from GameState.ts.
##
## Perk unlocking now respects PerkDefinition.requires (prerequisite perks)
## and tier gating (character level >= tier * TIER_LEVEL_STEP).
## Skills are a parallel pool earned at a different cadence (1 skill point
## every 2 character levels).

signal xp_changed(xp: int, level: int)
signal level_up(new_level: int)
signal perk_unlocked(perk_id: String)
signal perk_points_changed(points: int)
signal skill_unlocked(skill_id: String)
signal skill_points_changed(points: int)
signal skill_bound(slot: int, skill_id: String)

var xp: int = 0
var level: int = 1
var perks: Array = []              # Array[String]
var perk_points: int = 0
var skills: Array = []             # Array[String]
var skill_points: int = 0
## Hotbar bindings for active skills (slots 0..2 → Z / X / V).
var skill_hotbar: Array = ["", "", ""]

const _CFG_SECTION := "progression"
const _SKILL_POINTS_PER_N_LEVELS: int = 2

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())

# ── XP & Leveling ─────────────────────────────────────────────────────────────

## Returns true if a level-up occurred.
func add_xp(amount: int) -> bool:
	xp += amount
	var leveled := false
	while xp >= level * 1000:
		xp -= level * 1000
		level += 1
		perk_points += 1
		# Award a skill point every N levels.
		if level % _SKILL_POINTS_PER_N_LEVELS == 0:
			skill_points += 1
			skill_points_changed.emit(skill_points)
		leveled = true
		level_up.emit(level)
		perk_points_changed.emit(perk_points)
	xp_changed.emit(xp, level)
	save_state()
	return leveled

# ── Perks ─────────────────────────────────────────────────────────────────────

func has_perk(perk_id: String) -> bool:
	if perks.has(perk_id):
		return true
	# Legacy→new id aliases (TITAN SHIELDS → titan_shields, etc.).
	var alias: String = _LEGACY_ALIASES.get(perk_id, "")
	if alias != "" and perks.has(alias):
		return true
	# Also check reverse: caller passed new id but save holds legacy id.
	for legacy in _LEGACY_ALIASES.keys():
		if _LEGACY_ALIASES[legacy] == perk_id and perks.has(legacy):
			return true
	return false

## Legacy perk-id → new perk-id map. Keeps older savegames and call-sites
## working while the codebase migrates to the PerkDefinition ids.
const _LEGACY_ALIASES := {
	"TITAN SHIELDS":    "titan_shields",
	"MARATHONER":       "marathoner",
	"OXY-EFFICIENCY":   "oxy_efficiency",
	"DEVASTATOR MELEE": "devastator_melee",
	"OVERDRIVE":        "overdrive",
	"IRON SOLES":       "iron_soles",
	"SCAVENGER":        "scavenger",
}

## Check all gating rules for a perk id (level, prereqs, not already owned,
## enough points). Uses ContentRegistry definitions when present; falls back
## to DataManager.PERKS dicts.
func can_unlock_perk(perk_id: String) -> bool:
	if perks.has(perk_id):
		return false
	var def := _perk_data(perk_id)
	if def.is_empty():
		return false
	var cost: int = def.get("cost", 1)
	if perk_points < cost:
		return false
	var tier: int = def.get("tier", 1)
	if level < tier * PerkDefinition.TIER_LEVEL_STEP:
		return false
	var requires: Array = def.get("requires", [])
	for req in requires:
		if not perks.has(String(req)):
			return false
	return true

## Returns true if the perk was successfully unlocked.
func unlock_perk(perk_id: String) -> bool:
	if not can_unlock_perk(perk_id):
		return false
	var def := _perk_data(perk_id)
	perk_points -= int(def.get("cost", 1))
	perks.append(perk_id)
	perk_unlocked.emit(perk_id)
	perk_points_changed.emit(perk_points)
	save_state()
	return true

func xp_to_next_level() -> int:
	return level * 1000

# ── Skills ────────────────────────────────────────────────────────────────────

func has_skill(skill_id: String) -> bool:
	return skills.has(skill_id)

func can_unlock_skill(skill_id: String) -> bool:
	if skills.has(skill_id):
		return false
	var def: SkillDefinition = _skill_def(skill_id)
	if def == null:
		return false
	if skill_points < def.cost:
		return false
	if level < def.required_level():
		return false
	for req in def.requires:
		if not skills.has(String(req)):
			return false
	return true

func unlock_skill(skill_id: String) -> bool:
	if not can_unlock_skill(skill_id):
		return false
	var def: SkillDefinition = _skill_def(skill_id)
	skill_points -= def.cost
	skills.append(skill_id)
	skill_unlocked.emit(skill_id)
	skill_points_changed.emit(skill_points)
	save_state()
	return true

## Bind an unlocked active skill to hotbar slot 0..2. Pass "" to clear.
func bind_skill_to_slot(slot: int, skill_id: String) -> bool:
	if slot < 0 or slot >= skill_hotbar.size():
		return false
	if skill_id != "" and not skills.has(skill_id):
		return false
	# Ensure no duplicate binding across slots.
	for i in skill_hotbar.size():
		if i != slot and skill_hotbar[i] == skill_id and skill_id != "":
			skill_hotbar[i] = ""
	skill_hotbar[slot] = skill_id
	skill_bound.emit(slot, skill_id)
	save_state()
	return true

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	SaveSystem.set_value(_CFG_SECTION, "xp",           xp)
	SaveSystem.set_value(_CFG_SECTION, "level",        level)
	SaveSystem.set_value(_CFG_SECTION, "perks",        perks)
	SaveSystem.set_value(_CFG_SECTION, "perk_points",  perk_points)
	SaveSystem.set_value(_CFG_SECTION, "skills",       skills)
	SaveSystem.set_value(_CFG_SECTION, "skill_points", skill_points)
	SaveSystem.set_value(_CFG_SECTION, "skill_hotbar", skill_hotbar)
	SaveSystem.flush()

func load_state() -> void:
	xp           = SaveSystem.get_value(_CFG_SECTION, "xp",           0)
	level        = SaveSystem.get_value(_CFG_SECTION, "level",        1)
	perks        = SaveSystem.get_value(_CFG_SECTION, "perks",        [])
	perk_points  = SaveSystem.get_value(_CFG_SECTION, "perk_points",  0)
	skills       = SaveSystem.get_value(_CFG_SECTION, "skills",       [])
	skill_points = SaveSystem.get_value(_CFG_SECTION, "skill_points", 0)
	var raw_hotbar: Variant = SaveSystem.get_value(_CFG_SECTION, "skill_hotbar", ["", "", ""])
	if raw_hotbar is Array and raw_hotbar.size() == 3:
		skill_hotbar = raw_hotbar
	else:
		skill_hotbar = ["", "", ""]

# ── Internal ──────────────────────────────────────────────────────────────────

## Returns a perk's data dict, preferring ContentRegistry when available.
func _perk_data(perk_id: String) -> Dictionary:
	var cr := get_node_or_null("/root/ContentRegistry")
	if cr:
		var def: PerkDefinition = cr.get_perk(StringName(perk_id))
		if def:
			return def.to_dict()
	# Fallback to static DataManager.PERKS
	for p in DataManager.PERKS:
		if p.get("id", "") == perk_id:
			var merged: Dictionary = p.duplicate()
			merged["tier"]     = p.get("tier", 1)
			merged["requires"] = p.get("requires", [])
			merged["cost"]     = p.get("cost", 1)
			return merged
	return {}

func _skill_def(skill_id: String) -> SkillDefinition:
	var cr := get_node_or_null("/root/ContentRegistry")
	if cr == null:
		return null
	return cr.get_skill(StringName(skill_id))
