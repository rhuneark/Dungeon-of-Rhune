extends Node
## Walks the hero around Thornwick and saves a screenshot at each stop, at the
## normal play zoom (lighting, fog and all). Handy after an art or layout pass.
## Run via run.gd:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution 1600x900 \
##     -s tools/godot/run.gd -- res://tools/godot/tour.gd <out_dir>

const STOPS := [
	["tour_1_square", Vector2(17, 18)],
	["tour_2_sealed_stair", Vector2(17, 12)],
	["tour_3_varn", Vector2(10, 14)],
	["tour_4_forge", Vector2(24, 14.5)],
	["tour_5_ysolde", Vector2(10, 22)],
	["tour_6_pell", Vector2(24, 22)],
	["tour_7_gate_odo", Vector2(18, 24)],
]

var frame := 0
var out := "/tmp"
var game: Node
var steps: Array = []


func _ready() -> void:
	var args: Array = get_meta("args", [])
	if args.size() > 0:
		out = args[0]
	SaveIO.dir = "user://tour_saves"
	steps = [[90, func(): _menu()._name = "Tester"; _menu()._start()]]
	var f := 150
	for s in STOPS:
		var stop: Array = s
		steps.append([f, func(): _go(stop[1])])
		steps.append([f + 40, func(): _shot(stop[0])])
		f += 50
	steps.append([f, func(): get_tree().quit()])


func _go(tile: Vector2) -> void:
	var rt := _find(get_tree().root, "ZoneRuntime")
	rt.player.pos = tile * 32.0
	rt.player.path = []
	rt.camera.position = rt.player.pos
	rt.camera.reset_smoothing()


func _menu() -> Node:
	return _find(get_tree().root, "MainMenu")


func _find(n: Node, cls: String) -> Node:
	for c in n.get_children():
		if c.get_script() and c.get_script().get_global_name() == cls:
			return c
		var r := _find(c, cls)
		if r:
			return r
	return null


func _shot(name: String) -> void:
	var img := get_viewport().get_texture().get_image()
	img.save_png("%s/%s.png" % [out, name])
	print("SHOT ", name)


func _process(_d: float) -> void:
	frame += 1
	if game == null:
		game = get_node("/root/Game")
	while not steps.is_empty() and frame >= steps[0][0]:
		var s = steps.pop_front()
		s[1].call()
