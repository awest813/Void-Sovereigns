extends Node
## EconomyState — autoload persisting economy slice (credits + market saturation).
## Ports EconomySlice from GameState.ts.
##
## Inventory storage now lives in `InventoryState`. `EconomyState.inventory`
## stays as a read-mostly facade that emits the legacy `inventory_changed`
## signal so existing UIs (InventoryUI.gd, ShopUI.gd) keep working without
## needing to know about the new grid system.

signal credits_changed(amount: int)
signal inventory_changed(inventory: Array)
signal item_sold(item: Dictionary, sale_value: int)

var credits: int = 0
var market_saturation: Dictionary = {}

## Legacy inventory facade — populated from InventoryState.as_legacy_array()
## whenever the underlying grid changes.
var inventory: Array = []

const _CFG_SECTION := "economy"

func _ready() -> void:
	load_state()
	SaveSystem.load_completed.connect(func(_s): load_state())
	if InventoryState.has_signal("inventory_changed"):
		InventoryState.inventory_changed.connect(_refresh_legacy_inventory)
	_refresh_legacy_inventory()

# ── Market ────────────────────────────────────────────────────────────────────

func get_market_value(item_id: String, base_value: int) -> int:
	var sat: float = market_saturation.get(item_id, 0.0)
	var val: int = int(base_value * (1.0 - sat * 0.6))
	# Scavenger perk: +15% sell value.
	if ProgressionState.has_perk("scavenger") or ProgressionState.has_perk("SCAVENGER"):
		val = int(val * 1.15)
	return val

func sell_item(item: Dictionary) -> int:
	var item_id: String = String(item.get("id", ""))
	var base: int = int(item.get("base_value", item.get("value", 0)))
	var sale_val := get_market_value(item_id, base)
	var new_sat: float = minf(1.0, market_saturation.get(item_id, 0.0) + 0.15)
	market_saturation[item_id] = new_sat
	credits += sale_val
	# Remove one unit from the underlying stack (prefer an explicit stack
	# reference if we have one).
	var stack_ref: Variant = item.get("_stack_ref", null)
	if stack_ref is Dictionary:
		var have: int = int(stack_ref.get("count", 0))
		if have <= 1:
			InventoryState.remove_stack(stack_ref)
		else:
			stack_ref["count"] = have - 1
			InventoryState.inventory_changed.emit()
	else:
		InventoryState.remove_item(item_id, 1)
	credits_changed.emit(credits)
	item_sold.emit(item, sale_val)
	save_state()
	return sale_val

func add_loot(item: Dictionary) -> void:
	# Legacy API — route into InventoryState.
	InventoryState.add_item_dict(item)

func add_credits(amount: int) -> void:
	credits += amount
	credits_changed.emit(credits)
	save_state()

func decay_saturations() -> void:
	for key in market_saturation.keys():
		market_saturation[key] = maxf(0.0, market_saturation[key] - 0.2)
	save_state()

# ── Persistence ───────────────────────────────────────────────────────────────

func save_state() -> void:
	SaveSystem.set_value(_CFG_SECTION, "credits",           credits)
	SaveSystem.set_value(_CFG_SECTION, "market_saturation", market_saturation)
	SaveSystem.flush()

func load_state() -> void:
	credits           = SaveSystem.get_value(_CFG_SECTION, "credits",           0)
	market_saturation = SaveSystem.get_value(_CFG_SECTION, "market_saturation", {})
	_refresh_legacy_inventory()

# ── Internal ──────────────────────────────────────────────────────────────────

func _refresh_legacy_inventory() -> void:
	# Some autoload orderings can fire this before InventoryState is ready.
	if InventoryState == null:
		return
	inventory = InventoryState.as_legacy_array()
	inventory_changed.emit(inventory)
