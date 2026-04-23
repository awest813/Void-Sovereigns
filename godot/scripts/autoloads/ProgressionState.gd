extends Node
## ProgressionState — autoload persisting XP, level, perks.
## Ports ProgressionSlice from GameState.ts.

signal xp_changed(xp: int, level: int)
signal level_up(new_level: int)
signal perk_unlocked(perk_id: String)
signal perk_points_changed(points: int)

var xp: int = 0
var level: int = 1
var perks: Array = []
var perk_points: int = 0

const _CFG_SECTION := "progression"

func _ready() -> void:
	load_state()

# ── XP & Leveling ─────────────────────────────────────────────────────────────

## Returns true if a level-up occurred.
func add_xp(amount: int) -> bool:
	xp += amount
	var leveled := false
	while xp >= level * 1000:
		xp -= level * 1000
		level += 1
		perk_points += 1
		leveled = true
		level_up.emit(level)
		perk_points_changed.emit(perk_points)
	xp_changed.emit(xp, level)
	save_state()
	return leveled

# ── Perks ─────────────────────────────────────────────────────────────────────

func has_perk(perk_id: String) -> bool:
	return perks.has(perk_id)

## Returns true if the perk was successfully unlocked.
func unlock_perk(perk_id: String) -> bool:
	if perk_points <= 0 or perks.has(perk_id):
		return false
	perk_points -= 1
	perks.append(perk_id)
	perk_unlocked.emit(perk_id)
	perk_points_changed.emit(perk_points)
	save_state()
	return true

func xp_to_next_level() -> int:
	return level * 1000

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	var cfg := ConfigFile.new()
	cfg.load("user://save.cfg")
	cfg.set_value(_CFG_SECTION, "xp",          xp)
	cfg.set_value(_CFG_SECTION, "level",        level)
	cfg.set_value(_CFG_SECTION, "perks",        perks)
	cfg.set_value(_CFG_SECTION, "perk_points",  perk_points)
	cfg.save("user://save.cfg")

func load_state() -> void:
	var cfg := ConfigFile.new()
	if cfg.load("user://save.cfg") != OK:
		return
	xp          = cfg.get_value(_CFG_SECTION, "xp",         0)
	level       = cfg.get_value(_CFG_SECTION, "level",       1)
	perks       = cfg.get_value(_CFG_SECTION, "perks",       [])
	perk_points = cfg.get_value(_CFG_SECTION, "perk_points", 0)
