extends Control
## MainMenuUI — initial main menu. Ports MainMenuUI.ts.

@onready var start_button: Button  = $VBox/StartButton
@onready var quit_button: Button   = $VBox/QuitButton
@onready var title_label: Label    = $TitleLabel

func _ready() -> void:
	start_button.pressed.connect(_on_start)
	quit_button.pressed.connect(_on_quit)
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE

func _on_start() -> void:
	SceneManager.switch_to("hub")

func _on_quit() -> void:
	get_tree().quit()
