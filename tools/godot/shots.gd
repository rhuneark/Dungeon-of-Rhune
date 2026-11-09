extends Node
## Drives the real game and saves screenshots. Run via run.gd:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution 1600x900 \
##     -s tools/godot/run.gd -- res://tools/godot/shots.gd <out_dir>
var frame := 0
var out := "/tmp"
var game: Node
var steps: Array = []


func _ready() -> void:
	var args: Array = get_meta("args", [])
	if args.size() > 0:
		out = args[0]
	SaveIO.dir = "user://shot_saves"
	steps = [
		[90, func(): _shot("01_menu")],
		[95, func(): _menu()._name = "Tester"; _menu()._start()],
		[150, func(): _shot("02_town")],
		[155, func(): _ui({"right": "inventory", "left": "character"})],
		[175, func(): _shot("03_inv_char")],
		[180, func(): _ui({"left": "", "right": ""}); game.spawn_drops(_drops(), "player")],
		[260, func(): _shot("04_drops")],
		[265, func(): _ui({"overlay": "skills"})],
		[285, func(): _shot("05_skills")],
		[290, func(): _ui({"overlay": ""}); _interact().talk_to("varn")],
		[310, func(): _shot("06_dialog")],
		[315, func(): _interact().npc_service("pell", "trade")],
		[335, func(): _shot("07_vendor")],
		[340, func(): _ui({"left": "codex", "right": "", "dialog": {}})],
		[360, func(): _shot("08_codex")],
		[365, func(): _ui({"left": "lab"})],
		[385, func(): _shot("09_lab")],
		[390, func(): _ui({"left": "smith", "right": "inventory"})],
		[410, func(): _shot("10_smith")],
		[415, func(): _ui({"left": "gamble"})],
		[435, func(): _shot("11_gamble")],
		[440, func(): _ui({"left": "quests", "right": ""})],
		[460, func(): _shot("12_quests")],
		[465, func(): _ui({"left": "", "right": "inventory"})],
		[480, func(): _hover(Vector2(1030, 525))],
		[500, func(): _shot("13_tooltip")],
		[505, func(): _ui({"left": "options", "right": ""})],
		[525, func(): _shot("14_options")],
		[530, func(): _ui({"left": "", "right": ""}); _hover(Vector2(1340, 330))],
		[550, func(): _shot("15_hover_npc")],
		[555, func(): get_tree().quit()],
	]


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


func _interact():
	return load("res://scripts/world/interact.gd")


func _hover(p: Vector2) -> void:
	Input.warp_mouse(p)
	var e := InputEventMouseMotion.new()
	e.position = p
	e.global_position = p
	Input.parse_input_event(e)


func _ui(p: Dictionary) -> void:
	game.set_ui(p)


func _drops() -> Array:
	var d := []
	for i in 6:
		d.append_array(Loot.roll_treasure("elite", {"ilvl": 20, "fortune": {"rarity": 400, "quantity": 100, "gold": 0, "seek": {"rhune": 200}}}))
	d.append({"kind": "item", "item": ItemGen.create_item("short_sword", {"ilvl": 20, "quality": "unique"})})
	return d


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
