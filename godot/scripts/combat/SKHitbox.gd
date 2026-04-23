extends Area3D
class_name SKHitbox
## Attacker-side hitbox for melee and physical attacks.
## Activate with a DamagePacket to begin detecting SKHurtbox overlaps.
## Deactivates automatically after one swing or on explicit deactivate().

signal hit_landed(packet: DamagePacket, hurtbox: SKHurtbox)

## Default values used when activate() is called without a packet.
@export var default_damage:      float            = 10.0
@export var default_damage_type: DamagePacket.Type = DamagePacket.Type.MELEE

var active_packet: DamagePacket = null
## Instance IDs of hurtboxes already hit this swing (deduplication).
var _hit_ids: Array[int] = []

func _ready() -> void:
	monitoring = false
	area_entered.connect(_on_area_entered)

# ── Public API ────────────────────────────────────────────────────────────────

## Begin a swing. Pass a pre-built packet or null to use exported defaults.
func activate(packet: DamagePacket = null) -> void:
	if packet == null:
		packet = DamagePacket.make(default_damage, default_damage_type)
	active_packet = packet
	_hit_ids.clear()
	monitoring = true

## End a swing and reset state.
func deactivate() -> void:
	monitoring    = false
	active_packet = null
	_hit_ids.clear()

func is_active() -> bool:
	return monitoring and active_packet != null

# ── Internals ─────────────────────────────────────────────────────────────────

func _on_area_entered(area: Area3D) -> void:
	if active_packet == null:
		return
	if not area is SKHurtbox:
		return
	var hb := area as SKHurtbox
	var hb_id := hb.get_instance_id()
	if _hit_ids.has(hb_id):
		return    # Already hit this hurtbox in the current swing
	_hit_ids.append(hb_id)
	hit_landed.emit(active_packet, hb)
	hb.receive_hit(active_packet)
