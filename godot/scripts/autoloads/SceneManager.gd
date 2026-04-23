extends Node
## SceneManager — single-player scene switching with optional async preload.
## Wraps get_tree().change_scene_to_file() and emits scene_changed so UI can react.

const SCENES: Dictionary = {
	"hub": "res://scenes/hub.tscn",
	"mission": "res://scenes/mission.tscn",
}

signal scene_changed(scene_id: String)

func switch_to(scene_id: String) -> void:
	if not SCENES.has(scene_id):
		push_error("SceneManager: unknown scene '%s'" % scene_id)
		return
	get_tree().change_scene_to_file(SCENES[scene_id])
	scene_changed.emit(scene_id)

## Preload a scene in the background (call before switching for smooth loading).
func preload_scene(scene_id: String) -> void:
	if not SCENES.has(scene_id):
		return
	ResourceLoader.load_threaded_request(SCENES[scene_id])
