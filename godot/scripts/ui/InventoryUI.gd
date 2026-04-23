extends Control
## InventoryUI — loot management. Ports InventoryUI.ts.

@onready var items_list: VBoxContainer = $Panel/ItemsList
@onready var credits_label: Label      = $Panel/CreditsLabel
@onready var close_btn: Button         = $Panel/CloseButton

func _ready() -> void:
	close_btn.pressed.connect(func(): hide())
	EconomyState.inventory_changed.connect(func(_inv): refresh())
	EconomyState.credits_changed.connect(func(c): _update_credits(c))
	hide()

func refresh() -> void:
	_update_credits(EconomyState.credits)
	for child in items_list.get_children():
		child.queue_free()
	for item in EconomyState.inventory:
		var market_val := EconomyState.get_market_value(item["id"], item.get("base_value", 0))
		var row := HBoxContainer.new()
		var lbl := Label.new()
		lbl.text = "%-20s [Market: %d cr]" % [item.get("name", "?"), market_val]
		lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		var sell_btn := Button.new()
		sell_btn.text = "SELL"
		sell_btn.pressed.connect(func(i=item): _sell(i))
		row.add_child(lbl)
		row.add_child(sell_btn)
		items_list.add_child(row)
	if EconomyState.inventory.is_empty():
		var lbl := Label.new()
		lbl.text = "No items"
		items_list.add_child(lbl)

func _sell(item: Dictionary) -> void:
	var val := EconomyState.sell_item(item)
	var hud := get_tree().get_first_node_in_group("hud")
	if hud and hud.has_method("show_message"):
		hud.show_message("Sold %s for %d credits" % [item.get("name","?"), val], 2.5)

func _update_credits(amount: int) -> void:
	if credits_label:
		credits_label.text = "Credits: %d" % amount
