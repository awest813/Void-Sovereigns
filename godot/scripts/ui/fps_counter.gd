extends Label

var fps_bool := false

func _process(_delta: float) -> void:
	text = "FPS " + str(Engine.get_frames_per_second()) if fps_bool else ""

func set_visible_fps(on: bool) -> void:
	fps_bool = on
