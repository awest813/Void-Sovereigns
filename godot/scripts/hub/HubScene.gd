extends Node3D
## HubScene — manages 6 terminal interaction areas and NPC.
## Attach to the hub.tscn root. Ports HubScene.ts.
## Expects Area3D children named: TerminalMissionBoard, TerminalShop,
## TerminalPerks, TerminalDecryption, TerminalDeployment, StationNPCArea.

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

func _ready() -> void:
	_close_all_uis()
	_connect_terminal(area_mission_board, _open_mission_board)
	_connect_terminal(area_shop,          _open_shop)
	_connect_terminal(area_perks,         _open_perks)
	_connect_terminal(area_decryption,    _open_decryption)
	_connect_terminal(area_deploy,        _prompt_deploy)
	_connect_terminal(area_npc,           _interact_npc)

	Input.mouse_mode = Input.MOUSE_MODE_CONFINED

func _connect_terminal(area: Area3D, callback: Callable) -> void:
	if area == null:
		return
	area.body_entered.connect(func(_b): callback.call())

# ── Terminal handlers ─────────────────────────────────────────────────────────

func _open_mission_board() -> void:
	_close_all_uis()
	if mission_board_ui:
		mission_board_ui.show()
		mission_board_ui.refresh()

func _open_shop() -> void:
	_close_all_uis()
	if shop_ui:
		shop_ui.show()
		shop_ui.refresh()

func _open_perks() -> void:
	_close_all_uis()
	if perk_menu_ui:
		perk_menu_ui.show()
		perk_menu_ui.refresh()

func _open_decryption() -> void:
	_close_all_uis()
	if decryption_ui:
		decryption_ui.show()

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
