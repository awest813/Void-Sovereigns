extends Area3D
## EnvironmentalHazards — area that applies periodic damage with typed DamagePackets.
## Ports EnvironmentalHazards.ts. Place in mission rooms.

@export var damage_per_second: float = 5.0
@export var tick_interval: float     = 0.5
@export var hazard_type: String      = "fire"  # fire | acid | radiation | void
## Set to true to also apply a matching StatusEffect each tick.
@export var apply_status: bool       = true

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
		var dmg    := damage_per_second * tick_interval
		var packet := DamagePacket.make(dmg, _hazard_damage_type())
		var status := _hazard_status_effect() if apply_status else null
		for body in _bodies_inside:
			if not is_instance_valid(body):
				continue
			HitPipeline.resolve(packet, body)
			if status != null:
				var cc := body.get_node_or_null("CombatantComponent")
				if cc and cc.has_method("apply_status"):
					cc.apply_status(status)

func _on_body_entered(body: Node3D) -> void:
	if not _bodies_inside.has(body):
		_bodies_inside.append(body)
		if body.is_in_group("player"):
			_show_warning()

func _on_body_exited(body: Node3D) -> void:
	_bodies_inside.erase(body)

func _hazard_damage_type() -> DamagePacket.Type:
	match hazard_type:
		"fire":      return DamagePacket.Type.THERMAL
		"acid":      return DamagePacket.Type.HAZARD
		"radiation": return DamagePacket.Type.HAZARD
		"void":      return DamagePacket.Type.VOID
	return DamagePacket.Type.HAZARD

func _hazard_status_effect() -> StatusEffect:
	match hazard_type:
		"fire":      return StatusEffect.burn(4.0, damage_per_second)
		"void":      return StatusEffect.void_exposure(4.0, damage_per_second * 0.5)
		"radiation": return StatusEffect.radiation(6.0, damage_per_second * 0.3)
	return null

func _show_warning() -> void:
	var msg := _hazard_message()
	if msg.is_empty():
		return
	var hud := get_tree().get_first_node_in_group("hud")
	if hud and hud.has_method("show_message"):
		hud.show_message(msg, 2.5)

func _hazard_message() -> String:
	match hazard_type:
		"fire":      return "WARNING: FIRE HAZARD"
		"acid":      return "WARNING: CORROSIVE ATMOSPHERE"
		"radiation": return "WARNING: RADIATION DETECTED"
		"void":      return "WARNING: VOID ENERGY PRESENT"
	return ""
