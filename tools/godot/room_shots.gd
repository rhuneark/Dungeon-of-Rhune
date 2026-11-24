extends Node
## Shoots every dungeon room shape: a zoomed-out overview of the whole room
## and a play-zoom view from the middle and from the north wall. Monsters are
## held back so the room itself is visible. Handy after a wall/tile/prop pass.
## Run via run.gd:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution 1600x900 \
##     -s tools/godot/run.gd -- res://tools/godot/room_shots.gd <out_dir>

var frame := 0
var out := "/tmp"
var steps: Array = []


func _ready() -> void:
	var args: Array = get_meta("args", [])
	if args.size() > 0:
		out = args[0]
	SaveIO.dir = "user://room_shot_saves"
	steps = [[60, func(): _menu()._name = "Tester"; _menu()._start()]]
	var f := 120
	for fl in [1, 2, 3]:
		var floor_n: int = fl
		steps.append([f, func(): Game.hero().bestFloor = floor_n; Game.enter_dungeon(floor_n)])
		steps.append([f + 30, func(): _hold()])
		steps.append([f + 40, func(): _view(1.0, "center")])
		steps.append([f + 60, func(): _shot("room_%d_overview" % floor_n)])
		steps.append([f + 62, func(): _view(0.0, "center")])
		steps.append([f + 80, func(): _shot("room_%d_center" % floor_n)])
		steps.append([f + 82, func(): _view(0.0, "door")])
		steps.append([f + 100, func(): _shot("room_%d_door" % floor_n)])
		f += 140
	steps.append([f, func(): get_tree().quit()])


## Keep the waves from starting so the shots show the room.
func _hold() -> void:
	var a := Arena.current
	if a:
		a.state = "intro"
		a.t = -9999.0
		for m in a.mobs:
			m.queue_free()
		a.mobs.clear()


func _view(overview: float, at: String) -> void:
	var rt := _find(get_tree().root, "ZoneRuntime")
	var z: Zone = rt.zone
	var p: Vector2 = z.get_meta("center")
	if at == "door":
		p = z.get_meta("door").position + Vector2(0, 150)
	rt.player.pos = p
	rt.player.path = []
	rt.camera.position = p
	if overview > 0:
		rt.camera.zoom = rt.camera.zoom * 0.5
	elif rt.has_method("_apply_zoom"):
		rt._apply_zoom()
	else:
		rt.camera.zoom = Vector2(View.world_zoom, View.world_zoom)
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
	get_viewport().get_texture().get_image().save_png("%s/%s.png" % [out, name])
	print("SHOT ", name)


func _process(_d: float) -> void:
	frame += 1
	while not steps.is_empty() and frame >= steps[0][0]:
		var s = steps.pop_front()
		s[1].call()
