extends Node
## SceneManager — single-player scene switching with optional async preload.
## Wraps get_tree().change_scene_to_file() and emits scene_changed so UI can react.

const SCENES: Dictionary = {
	"main_menu": "res://scenes/main_menu.tscn",
	"hub": "res://scenes/hub.tscn",
	"mission": "res://scenes/mission.tscn",
}

signal scene_changed(scene_id: String)

var current_scene_id: String = "main_menu"

func switch_to(scene_id: String) -> void:
	if not SCENES.has(scene_id):
		push_error("SceneManager: unknown scene '%s'" % scene_id)
		return
	# Scene changes while paused never finish loading.
	get_tree().paused = false
	current_scene_id = scene_id
	get_tree().change_scene_to_file(SCENES[scene_id])
	scene_changed.emit(scene_id)

## Preload a scene in the background (call before switching for smooth loading).
func preload_scene(scene_id: String) -> void:
	if not SCENES.has(scene_id):
		return
	ResourceLoader.load_threaded_request(SCENES[scene_id])
