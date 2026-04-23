extends Area3D
## EnvironmentalHazards — area that applies periodic damage.
## Ports EnvironmentalHazards.ts. Place in mission rooms.

@export var damage_per_second: float = 5.0
@export var tick_interval: float     = 0.5
@export var hazard_type: String      = "fire"  # fire | acid | radiation | void

var _bodies_inside: Array[Node] = []
var _tick_timer: float = 0.0

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

func _process(delta: float) -> void:
	if _bodies_inside.is_empty():
		return
	_tick_timer += delta
	if _tick_timer >= tick_interval:
		_tick_timer = 0.0
		var dmg := damage_per_second * tick_interval
		for body in _bodies_inside:
			if is_instance_valid(body) and body.has_method("take_damage"):
				body.take_damage(dmg)

func _on_body_entered(body: Node3D) -> void:
	if not _bodies_inside.has(body):
		_bodies_inside.append(body)
		if body.is_in_group("player"):
			_show_warning()

func _on_body_exited(body: Node3D) -> void:
	_bodies_inside.erase(body)

func _show_warning() -> void:
	var msg := match_hazard_message()
	if msg == "":
		return
	# Find HUD in the scene tree
	var hud := get_tree().get_first_node_in_group("hud")
	if hud and hud.has_method("show_message"):
		hud.show_message(msg, 2.5)

func match_hazard_message() -> String:
	match hazard_type:
		"fire":      return "WARNING: FIRE HAZARD"
		"acid":      return "WARNING: CORROSIVE ATMOSPHERE"
		"radiation": return "WARNING: RADIATION DETECTED"
		"void":      return "WARNING: VOID ENERGY PRESENT"
	return ""
