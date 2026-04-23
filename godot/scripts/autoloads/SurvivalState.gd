extends Node
## SurvivalState — autoload persisting oxygen slice.
## Ports SurvivalSlice from GameState.ts.

signal oxygen_changed(current: float, max_val: float)

var oxygen: float = 100.0
var max_oxygen: float = 100.0

const _CFG_SECTION := "survival"

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())

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
	SaveSystem.set_value(_CFG_SECTION, "max_oxygen", max_oxygen)
	SaveSystem.flush()

func load_state() -> void:
	max_oxygen = SaveSystem.get_value(_CFG_SECTION, "max_oxygen", 100.0)
	oxygen     = max_oxygen
