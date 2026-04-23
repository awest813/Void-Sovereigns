extends Node3D
## HubScene — manages 6 terminal interaction areas and NPC.
## Attach to the hub.tscn root. Ports HubScene.ts.
## Expects Area3D children named: TerminalMissionBoard, TerminalShop,
## TerminalPerks, TerminalDecryption, TerminalDeployment, StationNPCArea.
##
## A full-screen `HubShell` (Marathon × Tarkov UI) is instantiated on ready
## and toggled via `ui_inventory`/`ui_character`/`ui_perks`/`ui_skills`.
## Legacy terminal menus still work as before.

const HubShellScript := preload("res://scripts/ui/hub/HubShell.gd")

@onready var mission_board_ui: Control  = $UI/MissionBoardUI
@onready var shop_ui: Control           = $UI/ShopUI
@onready var perk_menu_ui: Control      = $UI/PerkMenuUI
@onready var decryption_ui: Control     = $UI/DecryptionUI
@onready var inventory_ui: Control      = $UI/InventoryUI

# Terminal areas (Area3D nodes)
@onready var area_mission_board: Area3D  = $TerminalMissionBoard
@onready var area_shop: Area3D           = $TerminalShop
@onready var area_perks: Area3D          = $TerminalPerks
@onready var area_decryption: Area3D     = $TerminalDecryption
@onready var area_deploy: Area3D         = $TerminalDeployment
@onready var area_npc: Area3D            = $StationNPCArea

var _hub_shell: Control = null

func _ready() -> void:
	_close_all_uis()
	_connect_terminal(area_mission_board, _open_mission_board)
	_connect_terminal(area_shop,          _open_shop)
	_connect_terminal(area_perks,         _open_perks)
	_connect_terminal(area_decryption,    _open_decryption)
	_connect_terminal(area_deploy,        _prompt_deploy)
	_connect_terminal(area_npc,           _interact_npc)

	_hub_shell = HubShellScript.new()
	var ui_parent: Node = get_node_or_null("UI")
	if ui_parent == null:
		ui_parent = self
	ui_parent.add_child(_hub_shell)

	Input.mouse_mode = Input.MOUSE_MODE_CONFINED

func _connect_terminal(area: Area3D, callback: Callable) -> void:
	if area == null:
		return
	area.body_entered.connect(func(_b): callback.call())

# ── Terminal handlers ─────────────────────────────────────────────────────────

func _open_mission_board() -> void:
	if _hub_shell:
		_hub_shell.open(HubShellScript.Tab.LAUNCH)
		return
	_close_all_uis()
	if mission_board_ui:
		mission_board_ui.show()
		mission_board_ui.refresh()

func _open_shop() -> void:
	if _hub_shell:
		_hub_shell.open(HubShellScript.Tab.TRADER)
		return
	_close_all_uis()
	if shop_ui:
		shop_ui.show()
		shop_ui.refresh()

func _open_perks() -> void:
	if _hub_shell:
		_hub_shell.open(HubShellScript.Tab.PERKS)
		return
	_close_all_uis()
	if perk_menu_ui:
		perk_menu_ui.show()
		perk_menu_ui.refresh()

func _open_decryption() -> void:
	_close_all_uis()
	if decryption_ui:
		decryption_ui.call("start_decryption")

func _prompt_deploy() -> void:
	var mission := MissionState.active_mission_id
	if mission == "":
		return
	if MissionState.can_transition(MissionState.mission_status, "deployed"):
		MissionState.transition("deployed")
		SceneManager.switch_to("mission")

func _interact_npc() -> void:
	pass  # StationNPC handles its own interaction

func _close_all_uis() -> void:
	for ui in [mission_board_ui, shop_ui, perk_menu_ui, decryption_ui, inventory_ui]:
		if ui:
			ui.hide()

func _unhandled_input(event: InputEvent) -> void:
	# HubShell consumes its own hotkeys; fall back to the legacy inventory
	# toggle when the shell isn't active (e.g. in a unit-test scene).
	if _hub_shell and _hub_shell.visible:
		return
	if event.is_action_pressed("inventory"):
		if inventory_ui and inventory_ui.visible:
			inventory_ui.hide()
			Input.mouse_mode = Input.MOUSE_MODE_CONFINED
		elif inventory_ui:
			_close_all_uis()
			inventory_ui.show()
			inventory_ui.call("refresh")
			Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
