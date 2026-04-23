extends Node
## OxygenSystem — drains oxygen during missions; ports OxygenSystem.ts.
## Add as a child of the mission scene root.

signal oxygen_changed(current: float, max_val: float)
signal oxygen_critical()
signal oxygen_stabilized()
signal oxygen_depleted()

@export var drain_rate: float = 0.5  # units per second

var _is_critical: bool = false
var _hud: Node = null

func setup(hud: Node) -> void:
	_hud = hud
	SurvivalState.reset_oxygen()

func _process(delta: float) -> void:
	if MissionState.current_scene != "mission":
		return
	if MissionState.mission_status == "failed":
		return

	var actual_rate := drain_rate
	if ProgressionState.has_perk("OXY-EFFICIENCY"):
		actual_rate *= 0.6

	var new_oxy := maxf(0.0, SurvivalState.oxygen - actual_rate * delta)
	SurvivalState.set_oxygen(new_oxy)
	oxygen_changed.emit(new_oxy, SurvivalState.max_oxygen)

	var percent := new_oxy / SurvivalState.max_oxygen
	if percent < 0.25 and not _is_critical:
		_is_critical = true
		oxygen_critical.emit()
		if _hud and _hud.has_method("show_message"):
			_hud.show_message("WARNING: OXYGEN LEVELS CRITICAL", 5.0)
	elif percent >= 0.25 and _is_critical:
		_is_critical = false
		oxygen_stabilized.emit()
		if _hud and _hud.has_method("show_message"):
			_hud.show_message("OXYGEN LEVELS STABILIZED", 3.0)

	if new_oxy <= 0.0:
		oxygen_depleted.emit()
		if _hud and _hud.has_method("show_message"):
			_hud.show_message("OXYGEN DEPLETED: MISSION FAILED", 5.0)
		MissionState.transition("failed")
