extends Node
## Plays the real game with synthetic input and checks the results. Run via run.gd:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution 1600x900 \
##     -s tools/godot/run.gd -- res://tools/godot/play_test.gd
var frame := 0
var game: Node
var rt: Node
var steps: Array = []
var fails := 0
var start_pos := Vector2.ZERO
var inv_count := 0
var target_npc := ""


func _ready() -> void:
	SaveIO.dir = "user://test_play_saves"
	SaveIO.wipe_save()
	steps = [
		[90, func():
			game.save.hero = HeroData.new_hero("Tester")
			QuestRules.start_auto_quests(game.save.hero)
			game.commit()
			game.set_ui({"phase": "playing"})],
		[100, func():
			rt = _find(get_tree().root, "ZoneRuntime")
			_check("zone runtime exists", rt != null)
			start_pos = rt.player.pos
			# Everything usable must be reachable on foot from the spawn.
			var unreachable := []
			for h in rt.hotspots:
				if h.range < 0:
					continue
				var path: Array = rt.nav.find_path(start_pos, h.approach)
				if path.is_empty() or path.back().distance_to(h.approach) > h.range * 2.2:
					unreachable.append(h.target.get("name", h.target.get("id", "?")))
			_check("every NPC and usable object is reachable", unreachable.is_empty(), str(unreachable))
			_click(_screen(start_pos + Vector2(0, -120)))],
		[170, func(): _check("click-to-move walks north", rt.player.pos.y < start_pos.y - 80, str(rt.player.pos - start_pos))],
		[175, func():
			inv_count = game.hero().inventory.size()
			var it := ItemGen.create_item("ring", {"ilvl": 5, "quality": "magic"})
			game.spawn_drops([{"kind": "item", "item": it}], rt.player.pos + Vector2(70, 0))],
		[230, func():
			var e = rt.ground_items.entries.back()
			_check("drop landed", e.landed)
			_click(_screen(e.rect.get_center()))],
		[300, func(): _check("clicking a label picks it up", game.hero().inventory.size() == inv_count + 1, "%d -> %d" % [inv_count, game.hero().inventory.size()])],
		[305, func():
			# The nearest NPC (on screen) — walk over by clicking them.
			var best = null
			for n in rt.npcs:
				if best == null or n.pos.distance_to(rt.player.pos) < best.pos.distance_to(rt.player.pos):
					best = n
			target_npc = best.id
			var target = rt.pick(best.pos + Vector2(0, -24))
			print("  nearest NPC: ", best.id, " dist=", best.pos.distance_to(rt.player.pos), " picked=", target.target if target is Dictionary and target.has("target") else target)
			_click(_screen(best.pos + Vector2(0, -24)))],
		[520, func(): _check("clicking an NPC walks over and talks", game.ui.dialog.get("npcId", "") == target_npc, str(game.ui.dialog.get("npcId")))],
		[525, func(): _key(KEY_I)],
		[535, func(): _check("I opens inventory", game.ui.right == "inventory")],
		[540, func(): _key(KEY_K)],
		[550, func(): _check("K opens skills", game.ui.overlay == "skills")],
		[555, func(): _key(KEY_ESCAPE)],
		[565, func(): _check("Esc closes everything", game.ui.right == "" and game.ui.overlay == "" and game.ui.dialog.is_empty())],
		[570, func(): _key(KEY_ESCAPE)],
		[590, func(): _check("Esc with nothing open returns to menu", game.ui.phase == "menu")],
		[600, func():
			game.flush()
			_check("save file written", FileAccess.file_exists(SaveIO.path()))
			var loaded := SaveIO.load_game()
			_check("save round-trips the hero", loaded.get("hero") != null and loaded.hero.name == "Tester")],
		[610, func():
			print("PLAYTEST ", "FAIL" if fails else "OK", " fails=", fails)
			SaveIO.wipe_save()
			get_tree().quit(1 if fails else 0)],
	]


func _check(name: String, ok: bool, detail := "") -> void:
	if ok:
		print("PASS ", name)
	else:
		fails += 1
		print("FAIL ", name, ": ", detail)


func _find(n: Node, cls: String) -> Node:
	for c in n.get_children():
		if c.get_script() and c.get_script().get_global_name() == cls:
			return c
		var r := _find(c, cls)
		if r:
			return r
	return null


func _screen(world: Vector2) -> Vector2:
	return get_viewport().get_canvas_transform() * world


func _click(p: Vector2) -> void:
	Input.warp_mouse(p)
	var m := InputEventMouseMotion.new()
	m.position = p
	Input.parse_input_event(m)
	for pressed in [true, false]:
		var e := InputEventMouseButton.new()
		e.button_index = MOUSE_BUTTON_LEFT
		e.pressed = pressed
		e.position = p
		e.global_position = p
		Input.parse_input_event(e)


func _key(k: Key) -> void:
	for pressed in [true, false]:
		var e := InputEventKey.new()
		e.keycode = k
		e.physical_keycode = k
		e.pressed = pressed
		Input.parse_input_event(e)


func _process(_d: float) -> void:
	frame += 1
	if game == null:
		game = get_node("/root/Game")
	while not steps.is_empty() and frame >= steps[0][0]:
		var s = steps.pop_front()
		s[1].call()
