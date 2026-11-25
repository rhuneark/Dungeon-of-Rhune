extends Node
## Charts an expedition and plays two rooms with a simple bot (attack the
## nearest monster, drink the flask under half life), opens each chest and
## picks the next room on the map. Prints DUNGEON OK after two rooms.
## Run via run.gd:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution 1600x900 \
##     -s tools/godot/run.gd -- res://tools/godot/dungeon_test.gd [out_dir] [tier]

var frame := 0
var out := ""
var tier := 1
var phase := "menu"
var t := 0.0
var shots := 0
var floors_done := 0


func _ready() -> void:
	var a: Array = get_meta("args", [])
	if a.size() > 0:
		out = a[0]
	if a.size() > 1:
		tier = int(a[1])
	SaveIO.dir = "user://dungeon_test_saves"


func _find(n: Node, cls: String) -> Node:
	for c in n.get_children():
		if c.get_script() and c.get_script().get_global_name() == cls:
			return c
		var r := _find(c, cls)
		if r:
			return r
	return null


func _shot(n: String) -> void:
	if out != "":
		get_viewport().get_texture().get_image().save_png("%s/%s.png" % [out, n])
		print("SHOT ", n)


func _process(delta: float) -> void:
	frame += 1
	t += delta
	match phase:
		"menu":
			if frame == 60:
				SaveIO.wipe_save()
				var m := _find(get_tree().root, "MainMenu")
				m._name = "Bot"
				m._start()
				phase = "town"
				t = 0
		"town":
			if t > 1.0:
				Game.hero().bestTier = tier - 1
				Game.start_expedition(tier)
				Game.enter_room(Expedition.options(Game.expedition())[0])
				phase = "fight"
				t = 0
		"fight":
			var a := Arena.current
			var rt = _find(get_tree().root, "ZoneRuntime")
			if a == null or rt == null:
				return
			if Game.ui.dead:
				print("DUNGEON DIED room=%s t=%.1f kills=%d" % [a.room.name, t, Game.save.stats.kills])
				_shot("died")
				get_tree().quit(1)
				return
			if float(Game.hero().life) < Game.sheet().life * 0.5:
				Game.drink_flask()
			if rt.player.target == null or not is_instance_valid(rt.player.target) or rt.player.target.dead:
				var best = null
				for m in a.mobs:
					if not m.dead and m.state != "spawn" and (best == null or m.position.distance_to(rt.player.pos) < best.position.distance_to(rt.player.pos)):
						best = m
				rt.player.target = best
			if shots == 0 and a.state == "fight" and a.alive() >= 4:
				_shot("fight_%d" % floors_done)
				shots += 1
			if a.state == "cleared":
				print("CLEARED %s (level %d) t=%.1f kills=%d hero level=%d life=%d boons=%s" % [a.room.name, a.level, t, Game.save.stats.kills, Game.hero().level, Game.hero().life, Game.expedition().boons])
				_shot("cleared_%d" % floors_done)
				a.open_chest()
				phase = "loot"
				t = 0
			elif t > 240:
				print("DUNGEON TIMEOUT room=%s alive=%d state=%s" % [a.room.name, a.alive(), a.state])
				get_tree().quit(1)
		"loot":
			if t > 1.5:
				var rt = _find(get_tree().root, "ZoneRuntime")
				print("LOOT on ground: %d" % rt.ground_items.entries.size())
				_shot("loot_%d" % floors_done)
				floors_done += 1
				if floors_done >= 2:
					print("DUNGEON OK rooms=%d level=%d threat=%d" % [floors_done, Game.hero().level, int(Game.expedition().threat)])
					get_tree().quit(0)
					return
				Arena.current.take_exit()
				Game.enter_room(Expedition.options(Game.expedition())[0])
				phase = "fight"
				t = 0
				shots = 0
