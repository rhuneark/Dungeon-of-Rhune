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
		[150, func(): _shot("02_refuge")],
		[155, func(): _ui({"right": "inventory", "left": "character"})],
		[175, func(): _shot("03_inv_char")],
		[180, func(): _ui({"left": "", "right": ""}); game.spawn_drops(_drops(), "player")],
		[260, func(): _shot("04_drops")],
		[265, func(): _ui({"left": "character", "right": "inventory"})],
		[285, func(): _shot("05_char_inv")],
		[290, func(): _ui({"left": "", "right": ""}); _interact().talk_to("varn")],
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
		[440, func():
			game.hero().bestTier = 3
			_ui({"left": "", "right": ""}); _interact().expedition_dialog("Captain Maren", "Cartographer of the Deep")],
		[460, func(): _shot("12_expedition")],
		[465, func(): _ui({"left": "", "right": "inventory"})],
		[480, func(): _hover(Vector2(1030, 525))],
		[500, func(): _shot("13_tooltip")],
		[505, func(): _ui({"left": "options", "right": ""})],
		[525, func(): _shot("14_options")],
		[530, func(): _ui({"left": "", "right": ""}); _hover(Vector2(1340, 330))],
		[550, func(): _shot("15_hover_npc")],
		[555, func():
			game.start_expedition(3)
			var e: Dictionary = game.expedition()
			e.at = Expedition.VAULT
			game.set_ui({"location": "room", "room": Expedition.VAULT, "overlay": ""})],
		[700, func(): _shot("16_warden_vault")],
		[705, func():
			game.abandon_expedition()
			game.start_expedition(2)
			var e: Dictionary = game.expedition()
			e.at = Expedition.options(e)[0]
			game.set_ui({"location": "room", "room": e.at, "overlay": ""})],
		[880, func(): _shot("17_room")],
		[885, func(): game.hero().life = 99999; game.spawn_drops(_tier_drops(), "player")],
		[898, func(): _shot("18_loot_flight")],
		[945, func(): _shot("19_loot_landed")],
		[950, func(): get_tree().quit()],
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


## One drop of every glow tier, junk to unique.
func _tier_drops() -> Array:
	var d: Array = [{"kind": "gold", "amount": 212}]
	for q in ["crude", "normal", "magic", "rare", "unique"]:
		d.append({"kind": "item", "item": ItemGen.create_item("short_sword" if q != "magic" else "ring", {"ilvl": 12, "quality": q})})
	var sock := ItemGen.create_item("breastplate", {"ilvl": 12, "quality": "normal"})
	sock.sockets = 2
	d.append({"kind": "item", "item": sock})
	d.append({"kind": "item", "item": ItemGen.create_item("rhune_ember", {"ilvl": 12})})
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
