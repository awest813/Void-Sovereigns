extends Node
## MissionState — autoload persisting mission slice to user://save.cfg
## Ports MissionSlice + MissionState.ts FSM.

signal mission_status_changed(status: String)
signal current_scene_changed(scene: String)
signal mission_completed(mission_id: String)
signal flag_changed(key: String, value: bool)

# Valid FSM transitions (mirrors MissionState.ts)
const VALID_TRANSITIONS: Dictionary = {
	"none":               ["accepted"],
	"accepted":           ["deployed", "none"],
	"deployed":           ["objectiveActive"],
	"objectiveActive":    ["objectiveComplete"],
	"objectiveComplete":  ["extractionAvailable"],
	"extractionAvailable":["success"],
	"success":            ["returnedToHub"],
	"failed":             ["returnedToHub", "none"],
	"returnedToHub":      ["none"],
}

var current_scene: String = "hub"
var active_mission_id: String = ""
var mission_status: String = "none"
var completed_missions: Array = []
var flags: Dictionary = {}

const _CFG_SECTION := "mission"

func _ready() -> void:
	load_state()

# ── FSM ──────────────────────────────────────────────────────────────────────

func can_transition(from: String, to: String) -> bool:
	if not VALID_TRANSITIONS.has(from):
		return false
	return (VALID_TRANSITIONS[from] as Array).has(to)

func transition(next: String) -> bool:
	if not can_transition(mission_status, next):
		push_warning("MissionState: invalid transition %s → %s" % [mission_status, next])
		return false
	mission_status = next
	mission_status_changed.emit(mission_status)
	save_state()
	return true

# ── Mutations ─────────────────────────────────────────────────────────────────

func set_scene(scene: String) -> void:
	current_scene = scene
	current_scene_changed.emit(scene)
	save_state()

func accept_mission(mission_id: String) -> void:
	active_mission_id = mission_id
	transition("accepted")

func clear_mission() -> void:
	active_mission_id = ""
	mission_status = "none"
	mission_status_changed.emit(mission_status)
	save_state()

func complete_mission(mission_id: String) -> void:
	if not completed_missions.has(mission_id):
		completed_missions.append(mission_id)
	mission_completed.emit(mission_id)
	save_state()

func set_flag(key: String, value: bool) -> void:
	flags[key] = value
	flag_changed.emit(key, value)
	save_state()

func get_flag(key: String) -> bool:
	return flags.get(key, false)

func status_label() -> String:
	match mission_status:
		"accepted":           return "Accepted"
		"deployed":           return "Deployed"
		"objectiveActive":    return "Find Objective"
		"objectiveComplete":  return "Objective Secured"
		"extractionAvailable":return "Hold Zone"
		"success":            return "Extracting..."
		_:                    return mission_status

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value(_CFG_SECTION, "current_scene",      current_scene)
	cfg.set_value(_CFG_SECTION, "active_mission_id",  active_mission_id)
	cfg.set_value(_CFG_SECTION, "mission_status",     mission_status)
	cfg.set_value(_CFG_SECTION, "completed_missions", completed_missions)
	cfg.set_value(_CFG_SECTION, "flags",              flags)
	cfg.save("user://save.cfg")

func load_state() -> void:
	var cfg := ConfigFile.new()
	if cfg.load("user://save.cfg") != OK:
		return
	current_scene       = cfg.get_value(_CFG_SECTION, "current_scene",      "hub")
	active_mission_id   = cfg.get_value(_CFG_SECTION, "active_mission_id",  "")
	mission_status      = cfg.get_value(_CFG_SECTION, "mission_status",     "none")
	completed_missions  = cfg.get_value(_CFG_SECTION, "completed_missions", [])
	flags               = cfg.get_value(_CFG_SECTION, "flags",              {})

func reset() -> void:
	current_scene      = "hub"
	active_mission_id  = ""
	mission_status     = "none"
	completed_missions = []
	flags              = {}
	var cfg := ConfigFile.new()
	cfg.save("user://save.cfg")
