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
var target_mob = null
var target_room := ""


func _ready() -> void:
	SaveIO.dir = "user://test_play_saves"
	SaveIO.wipe_save()
	steps = [
		[90, func():
			game.save.hero = HeroData.new_hero("Tester")
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
		[540, func(): _key(KEY_ESCAPE)],
		[550, func(): _check("Esc closes everything", game.ui.right == "" and game.ui.dialog.is_empty())],
		[555, func():
			game.hero().life = 10
			_key(KEY_Q)],
		[565, func(): _check("Q drinks the flask", float(game.hero().life) > 10, str(game.hero().life))],
		[570, func():
			Interact.expedition_dialog()
			var b: Array = game.ui.dialog.get("buttons", [])
			_check("the map table offers Tier 1", b.size() == 1 and String(b[0].text).begins_with("Tier 1"), str(b))
			b[0].action.call()],
		[590, func():
			_check("charting opens the map", game.ui.overlay == "map" and Expedition.active(game.hero()))
			# Click the first open room on the map, through the real UI.
			var panel = _find(get_tree().root, "MapPanel")
			var canvas = panel._canvas if panel else null
			_check("the map shows", canvas != null)
			if canvas:
				target_room = Expedition.options(game.expedition())[0]
				_click(canvas.get_global_transform_with_canvas() * canvas._pos(target_room))],
		[640, func():
			var name: String = Expeditions.room(Expedition.node(game.expedition(), target_room).type).name
			_check("clicking a room walks into it", Arena.current != null and game.ui.location == "room" and game.ui.zone_title == name, "%s / %s" % [game.ui.location, game.ui.zone_title])
			rt = _find(get_tree().root, "ZoneRuntime")],
		[760, func():
			var m = null
			for x in Arena.current.mobs:
				if not x.dead and x.state != "spawn":
					m = x
					break
			_check("monsters spawned", m != null)
			if m:
				target_mob = m
				_click(_screen(m.position + Vector2(0, -m.height() / 2.0)))],
		[770, func(): _check("clicking a monster targets it", rt.player.target == target_mob)],
		[980, func(): _check("the hero hits it", target_mob == null or not is_instance_valid(target_mob) or target_mob.dead or target_mob.life < target_mob.max_life, str(target_mob.life if is_instance_valid(target_mob) else -1))],
		[985, func(): _key(KEY_T)],
		[1030, func():
			_check("T returns to the Refuge", game.ui.location == "refuge" and Arena.current == null and float(game.hero().life) == float(game.sheet().life))
			_check("the unfinished room waits on the map", Expedition.options(game.expedition()) == [target_room])],
		[1035, func(): _key(KEY_ESCAPE)],
		[1055, func(): _check("Esc with nothing open returns to menu", game.ui.phase == "menu")],
		[1065, func():
			game.flush()
			_check("save file written", FileAccess.file_exists(SaveIO.path()))
			var loaded := SaveIO.load_game()
			_check("save round-trips the hero", loaded.get("hero") != null and loaded.hero.name == "Tester")],
		[1075, func():
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
