extends Node
## Shoots the Refuge and every expedition room type (play zoom from the middle
## and from the north wall, plus a zoomed-out overview) with the monsters held
## back, then the expedition map. Handy after a wall/tile/prop/theme pass.
## Run via run.gd:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution 1600x900 \
##     -s tools/godot/run.gd -- res://tools/godot/room_shots.gd <out_dir> [type,type...]

var frame := 0
var out := "/tmp"
var steps: Array = []


func _ready() -> void:
	var args: Array = get_meta("args", [])
	if args.size() > 0:
		out = args[0]
	var only: Array = String(args[1]).split(",") if args.size() > 1 else []
	SaveIO.dir = "user://room_shot_saves"
	steps = [[60, func(): SaveIO.wipe_save(); _menu()._name = "Tester"; _menu()._start()]]
	var f := 110
	steps.append([f, func(): _view(0.0, "center")])
	steps.append([f + 20, func(): _shot("refuge")])
	steps.append([f + 22, func(): _view(1.0, "center")])
	steps.append([f + 40, func(): _shot("refuge_overview")])
	f += 50
	for t in Expeditions.ROOMS:
		if not only.is_empty() and not t in only:
			continue
		var type: String = t
		steps.append([f, func(): _enter(type)])
		steps.append([f + 30, func(): _hold()])
		steps.append([f + 40, func(): _view(1.0, "center")])
		steps.append([f + 60, func(): _shot("%s_overview" % type)])
		steps.append([f + 62, func(): _view(0.0, "door")])
		steps.append([f + 80, func(): _shot("%s_door" % type)])
		f += 100
	steps.append([f, func():
		Game.return_to_refuge()
		Game.hero().expedition = Expedition.generate(2, 77)
		Game.set_ui({"overlay": "map"})])
	steps.append([f + 30, func(): _shot("map")])
	steps.append([f + 32, func(): get_tree().quit()])


## Walk into a room of this type (a fresh tier-2 map, its first room retyped).
func _enter(type: String) -> void:
	var h := Game.hero()
	h.expedition = Expedition.generate(2, 100 + frame)
	var e: Dictionary = h.expedition
	var id: String = Expedition.options(e)[0]
	if Expeditions.ROOMS[type].get("boss", false):
		id = Expedition.VAULT
		e.at = id
	else:
		e.nodes[id].type = type
		e.at = id
	Game.set_ui({"location": "room", "room": id, "dialog": {}, "overlay": ""})


## Keep the waves from starting so the shots show the room.
func _hold() -> void:
	var a := Arena.current
	if a:
		a.state = "intro"
		a.waves = []
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
	rt.camera.zoom = Vector2(View.world_zoom, View.world_zoom) * (0.5 if overview > 0 else 1.0)
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
