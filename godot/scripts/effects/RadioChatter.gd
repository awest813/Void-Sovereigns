extends AudioStreamPlayer
## RadioChatter — ambient radio chatter audio. Ports RadioChatter.ts.
## Plays random clips at random intervals while in a mission.

@export var clips: Array[AudioStream] = []
@export var min_interval: float = 8.0
@export var max_interval: float = 30.0

var _next_play_at: float = 0.0

func _ready() -> void:
	_schedule_next()
	finished.connect(_schedule_next)

func _process(_delta: float) -> void:
	if MissionState.current_scene != "mission":
		return
	var now := Time.get_ticks_msec() / 1000.0
	if not playing and now >= _next_play_at and clips.size() > 0:
		stream = clips[randi() % clips.size()]
		play()

func _schedule_next() -> void:
	var delay := randf_range(min_interval, max_interval)
	_next_play_at = Time.get_ticks_msec() / 1000.0 + delay
