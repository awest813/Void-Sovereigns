extends Control
## ShopUI — requisitions shop. Ports ShopUI.ts.

@onready var credits_label: Label    = $Panel/CreditsLabel
@onready var items_list: VBoxContainer = $Panel/ItemsList
@onready var close_btn: Button       = $Panel/CloseButton

const SHOP_ITEMS: Array = [
	{"id": "ammo_pistol",  "name": "Pistol Ammo",   "type": "ammo",   "weapon": "pistol",  "amount": 24, "price": 120},
	{"id": "ammo_shotgun", "name": "Shotgun Shells", "type": "ammo",   "weapon": "shotgun", "amount": 8,  "price": 180},
	{"id": "ammo_smg",     "name": "SMG Magazine",   "type": "ammo",   "weapon": "smg",     "amount": 60, "price": 150},
	{"id": "medkit",       "name": "Med-Kit",        "type": "health", "amount": 50,        "price": 250},
]

func _ready() -> void:
	close_btn.pressed.connect(func(): hide())
	EconomyState.credits_changed.connect(func(c): _update_credits(c))
	hide()

func refresh() -> void:
	_update_credits(EconomyState.credits)
	for child in items_list.get_children():
		child.queue_free()
	for item in SHOP_ITEMS:
		var row := HBoxContainer.new()
		var lbl := Label.new()
		lbl.text = "%-20s %d cr" % [item["name"], item["price"]]
		lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var btn := Button.new()
		btn.text = "BUY"
		btn.pressed.connect(func(i=item): _buy(i))
		row.add_child(lbl)
		row.add_child(btn)
		items_list.add_child(row)

func _buy(item: Dictionary) -> void:
	if EconomyState.credits < item["price"]:
		return
	EconomyState.credits -= item["price"]
	EconomyState.credits_changed.emit(EconomyState.credits)
	EconomyState.save_state()
	match item["type"]:
		"ammo":
			LoadoutState.add_ammo(item["weapon"], item["amount"])
		"health":
			var hud := get_tree().get_first_node_in_group("hud")
			if hud and hud.has_method("show_message"):
				hud.show_message("Med-Kit ready — heal on next damage", 3.0)

func _update_credits(amount: int) -> void:
	if credits_label:
		credits_label.text = "Credits: %d" % amount
