extends Area3D
class_name DroppedItem
## World-pickup entity — place in a scene or instantiate from SKLootTable.roll().
## When the player enters range and presses "interact", the item is collected.
## Ammo-category items credit LoadoutState; all others go to EconomyState.inventory.

signal item_collected(item: Dictionary)

## Item dictionary produced by SKLootTable.roll(): {id, name, value, category}
## Set via the Inspector or via set_item() before adding to the scene.
@export var item_data: Dictionary = {}

## Sphere radius (metres) in which the interact prompt becomes visible.
@export var prompt_radius: float = 1.5

# ── Internals ─────────────────────────────────────────────────────────────────

var _player_nearby: bool = false
var _label: Label3D = null

func _ready() -> void:
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)

	# Self-contained Label3D — no HUD dependency.
	_label = Label3D.new()
	_label.position = Vector3(0.0, 0.9, 0.0)
	_label.pixel_size = 0.005
	_label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	_label.modulate = Color(0.95, 0.88, 0.45)
	_label.visible = false
	add_child(_label)
	_refresh_label()

## Assign an item dict after instantiating but before (or after) adding to scene.
func set_item(data: Dictionary) -> void:
	item_data = data
	_refresh_label()

# ── Interaction ───────────────────────────────────────────────────────────────

func _process(_delta: float) -> void:
	if _player_nearby and Input.is_action_just_pressed("interact"):
		_collect()

func _on_body_entered(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_nearby = true
		if _label:
			_label.visible = true

func _on_body_exited(body: Node3D) -> void:
	if body.is_in_group("player"):
		_player_nearby = false
		if _label:
			_label.visible = false

func _collect() -> void:
	if item_data.is_empty():
		return

	var category: String = item_data.get("category", "misc")

	if category == "ammo":
		# LootData ammo entries (e.g. "ammo_pack") carry no per-weapon-type
		# metadata, so we distribute a fixed bonus across all weapon types.
		# If future loot entries gain a "weapon" field, route them here instead.
		LoadoutState.add_ammo("pistol",  10)
		LoadoutState.add_ammo("shotgun",  2)
		LoadoutState.add_ammo("smg",     20)
	else:
		# Route through the grid-aware inventory. EconomyState.add_loot()
		# proxies to InventoryState.add_item_dict() and preserves the
		# legacy inventory_changed signal for any existing UI.
		EconomyState.add_loot(item_data)

	item_collected.emit(item_data)
	queue_free()

# ── Helpers ───────────────────────────────────────────────────────────────────

func _refresh_label() -> void:
	if _label == null:
		return
	var display_name: String = item_data.get("name", "Unknown Item")
	_label.text = "[E]  %s" % display_name
