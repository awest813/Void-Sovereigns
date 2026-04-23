extends Control
## PerkMenuUI — perk tree. Ports PerkMenuUI.ts.

@onready var perk_points_label: Label = $Panel/PointsLabel
@onready var perks_grid: GridContainer = $Panel/PerksGrid
@onready var close_btn: Button         = $Panel/CloseButton

func _ready() -> void:
	close_btn.pressed.connect(func(): hide())
	ProgressionState.perk_unlocked.connect(func(_id): refresh())
	ProgressionState.perk_points_changed.connect(func(_p): _update_points())
	hide()

func refresh() -> void:
	_update_points()
	for child in perks_grid.get_children():
		child.queue_free()
	var perks := DataManager.get_perks()
	for perk in perks:
		var owned := ProgressionState.has_perk(perk["id"])
		var panel := PanelContainer.new()
		var vbox  := VBoxContainer.new()
		var icon_lbl := Label.new()
		icon_lbl.text = perk.get("icon", "??")
		icon_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		var name_lbl := Label.new()
		name_lbl.text = perk["name"]
		var desc_lbl := Label.new()
		desc_lbl.text = perk["description"]
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD
		var btn := Button.new()
		btn.text = "OWNED" if owned else "UNLOCK (%d pt)" % perk.get("cost", 1)
		btn.disabled = owned or ProgressionState.perk_points < perk.get("cost", 1)
		btn.pressed.connect(func(id=perk["id"]): _unlock(id))
		vbox.add_child(icon_lbl)
		vbox.add_child(name_lbl)
		vbox.add_child(desc_lbl)
		vbox.add_child(btn)
		panel.add_child(vbox)
		perks_grid.add_child(panel)

func _unlock(perk_id: String) -> void:
	ProgressionState.unlock_perk(perk_id)
	refresh()

func _update_points() -> void:
	if perk_points_label:
		perk_points_label.text = "Perk Points: %d" % ProgressionState.perk_points
