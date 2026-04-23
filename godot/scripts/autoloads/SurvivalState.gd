extends Node
## SurvivalState — autoload persisting oxygen slice.
## Ports SurvivalSlice from GameState.ts.

signal oxygen_changed(current: float, max_val: float)

var oxygen: float = 100.0
var max_oxygen: float = 100.0

const _CFG_SECTION := "survival"

func _ready() -> void:
	load_state()

func reset_oxygen() -> void:
	oxygen = max_oxygen
	oxygen_changed.emit(oxygen, max_oxygen)

func set_oxygen(val: float) -> void:
	oxygen = clampf(val, 0.0, max_oxygen)
	oxygen_changed.emit(oxygen, max_oxygen)

func set_max_oxygen(val: float) -> void:
	max_oxygen = val
	oxygen_changed.emit(oxygen, max_oxygen)
	save_state()

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	var cfg := ConfigFile.new()
	cfg.load("user://save.cfg")
	cfg.set_value(_CFG_SECTION, "max_oxygen", max_oxygen)
	cfg.save("user://save.cfg")

func load_state() -> void:
	var cfg := ConfigFile.new()
	if cfg.load("user://save.cfg") != OK:
		return
	max_oxygen = cfg.get_value(_CFG_SECTION, "max_oxygen", 100.0)
	oxygen     = max_oxygen
