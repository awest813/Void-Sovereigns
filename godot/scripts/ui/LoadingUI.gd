extends CanvasLayer
## LoadingUI — full-screen loading overlay. Ports LoadingUI.ts.

@onready var progress_bar: ProgressBar = $VBox/ProgressBar
@onready var status_label: Label       = $VBox/StatusLabel

var _target_scene: String = ""
var _loading: bool        = false

func load_scene(scene_id: String) -> void:
	_target_scene = scene_id
	show()
	status_label.text = "LOADING..."
	progress_bar.value = 0.0
	SceneManager.preload_scene(scene_id)
	_loading = true

func _process(_delta: float) -> void:
	if not _loading or _target_scene == "":
		return
	var path: String = SceneManager.SCENES.get(_target_scene, "")
	if path == "":
		return
	var progress := []
	var status := ResourceLoader.load_threaded_get_status(path, progress)
	if progress.size() > 0:
		progress_bar.value = progress[0] * 100.0
	match status:
		ResourceLoader.THREAD_LOAD_LOADED:
			_loading = false
			SceneManager.switch_to(_target_scene)
			hide()
		ResourceLoader.THREAD_LOAD_FAILED:
			status_label.text = "LOAD FAILED"
			_loading = false
		ResourceLoader.THREAD_LOAD_IN_PROGRESS:
			status_label.text = "LOADING... %d%%" % int(progress_bar.value)
