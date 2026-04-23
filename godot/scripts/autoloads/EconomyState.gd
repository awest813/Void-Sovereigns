extends Node
## EconomyState — autoload persisting economy slice.
## Ports EconomySlice from GameState.ts.

signal credits_changed(amount: int)
signal inventory_changed(inventory: Array)
signal item_sold(item: Dictionary, sale_value: int)

var credits: int = 0
var inventory: Array = []          # Array of {id, name, value}
var market_saturation: Dictionary = {}

const _CFG_SECTION := "economy"

func _ready() -> void:
	load_state()

# ── Market ────────────────────────────────────────────────────────────────────

func get_market_value(item_id: String, base_value: int) -> int:
	var sat: float = market_saturation.get(item_id, 0.0)
	return int(base_value * (1.0 - sat * 0.6))

func sell_item(item: Dictionary) -> int:
	var sale_val := get_market_value(item["id"], item["value"])
	var new_sat: float = minf(1.0, market_saturation.get(item["id"], 0.0) + 0.15)
	market_saturation[item["id"]] = new_sat
	credits += sale_val
	inventory.erase(item)
	credits_changed.emit(credits)
	inventory_changed.emit(inventory)
	item_sold.emit(item, sale_val)
	save_state()
	return sale_val

func add_loot(item: Dictionary) -> void:
	inventory.append(item)
	inventory_changed.emit(inventory)
	save_state()

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
	var cfg := ConfigFile.new()
	cfg.load("user://save.cfg")
	cfg.set_value(_CFG_SECTION, "credits",            credits)
	cfg.set_value(_CFG_SECTION, "inventory",          inventory)
	cfg.set_value(_CFG_SECTION, "market_saturation",  market_saturation)
	cfg.save("user://save.cfg")

func load_state() -> void:
	var cfg := ConfigFile.new()
	if cfg.load("user://save.cfg") != OK:
		return
	credits           = cfg.get_value(_CFG_SECTION, "credits",           0)
	inventory         = cfg.get_value(_CFG_SECTION, "inventory",         [])
	market_saturation = cfg.get_value(_CFG_SECTION, "market_saturation", {})
