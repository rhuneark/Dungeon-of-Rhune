class_name Arena
extends Node2D
## One floor of the Sealed Stair, run like an endless horde: the room seals,
## waves pour out of the summoning circles, and when the last one falls a
## chest rises in the middle, the sealed door opens onto the stair to the next
## floor, and a portal home appears. Every 10th floor an Hourglass Warden holds
## the room.
##
## The Arena owns the monsters (Mob), their projectiles and every hit in both
## directions; the ZoneRuntime owns the hero and asks player_attack() when a
## swing lands.

static var current: Arena

const INTRO := 1.4
const WAVE_GAP := 1.2
const SPAWN_EVERY := 0.14
const MAX_ALIVE := 42
const PLAYER_RADIUS := 10.0

var zone: Zone
var rt: ZoneRuntime
var floor := 1
var waves: Array = []
var wave := -1
var to_spawn := 0
var spawn_t := 0.0
var gap_t := -1.0
var mobs: Array = []
var shots: Array = []
var state := "intro" # intro | fight | cleared | looted
var t := 0.0
var spawns: Array = []
var door: Prop
var chest: Prop
var portal: Prop
var boss: Mob
var rng := RandomNumberGenerator.new()
var _shots_layer: Shots
var _dirty_t := 0.0
var _dirty := false


func setup(z: Zone, runtime: ZoneRuntime, f: int) -> void:
	current = self
	zone = z
	rt = runtime
	floor = f
	rt.arena = self
	rng.randomize()
	spawns = z.get_meta("spawns", [])
	if spawns.is_empty():
		spawns = [z.get_meta("center", Vector2(600, 400))]
	door = z.get_meta("door", null)
	waves = [1] if Monsters.is_boss_floor(f) else Monsters.waves(f)
	_shots_layer = Shots.new()
	_shots_layer.arena = self
	_shots_layer.z_index = 3
	z.add_child(_shots_layer)
	_title()
	Game.toast("Floor %d%s" % [f, " — something waits here" if Monsters.is_boss_floor(f) else ""], "#d9b26a")


func _exit_tree() -> void:
	if current == self:
		current = null


func _title() -> void:
	var sub := "Floor %d" % floor
	if state == "fight" or state == "intro":
		sub += " · Wave %d/%d" % [maxi(1, wave + 1), waves.size()] if not Monsters.is_boss_floor(floor) else " · Warden"
	else:
		sub += " · Cleared"
	Game.set_ui({"zone_title": "The Sealed Stair", "zone_sub": sub})


func alive() -> int:
	var n := 0
	for m in mobs:
		if not m.dead:
			n += 1
	return n


# ----------------------------------------------------------------- update
func _process(delta: float) -> void:
	if Game.ui.phase != "playing" or Game.ui.paused or not Game.has_hero():
		return
	delta = minf(delta, 0.05)
	t += delta
	var dead_hero: bool = Game.ui.dead
	if not dead_hero:
		_run_waves(delta)
	var ppos: Vector2 = rt.player.pos
	rt.nav.flow_to(ppos)
	for i in range(mobs.size() - 1, -1, -1):
		var m: Mob = mobs[i]
		if not is_instance_valid(m):
			mobs.remove_at(i)
			continue
		m.tick(delta, ppos, dead_hero)
		if m.gone:
			if m == boss:
				boss = null
			m.queue_free()
			mobs.remove_at(i)
	if not dead_hero:
		_separate()
	_move_shots(delta)
	_dirty_t -= delta
	if _dirty and _dirty_t <= 0:
		_dirty = false
		_dirty_t = 0.4
		Game.commit()


func _run_waves(delta: float) -> void:
	match state:
		"intro":
			if t >= INTRO:
				_start_wave(0)
		"fight":
			if to_spawn > 0:
				spawn_t -= delta
				if spawn_t <= 0 and alive() < MAX_ALIVE:
					spawn_t = SPAWN_EVERY
					_spawn_one()
					to_spawn -= 1
				return
			var last := wave >= waves.size() - 1
			if last and alive() == 0:
				_cleared()
			elif not last and alive() <= maxi(1, int(waves[wave] * 0.2)):
				if gap_t < 0:
					gap_t = WAVE_GAP
				gap_t -= delta
				if gap_t <= 0:
					gap_t = -1.0
					_start_wave(wave + 1)


func _start_wave(i: int) -> void:
	wave = i
	state = "fight"
	to_spawn = waves[i]
	spawn_t = 0.0
	if Monsters.is_boss_floor(floor):
		_spawn("warden", spawns[0].lerp(zone.get_meta("center"), 0.6), false)
		for k in mini(10, 3 + floor / 10):
			_spawn(_pick_kind(), spawns[k % spawns.size()], false)
		to_spawn = 0
	elif i > 0:
		Game.toast("Wave %d" % (i + 1), "#e06a5a")
	_title()


func _pick_kind() -> String:
	var pool := Monsters.pool(floor)
	var weights: Array = []
	for id in pool:
		weights.append(float(Monsters.ALL[id].weight))
	var total := 0.0
	for w in weights:
		total += w
	var r := rng.randf() * total
	for i in pool.size():
		r -= weights[i]
		if r <= 0:
			return pool[i]
	return pool[0]


func _spawn_one() -> void:
	var at: Vector2 = spawns[rng.randi_range(0, spawns.size() - 1)]
	var champ := floor >= 3 and rng.randf() < minf(0.15, 0.03 + floor * 0.0025)
	_spawn(_pick_kind(), at + Vector2(rng.randf_range(-18, 18), rng.randf_range(-12, 12)), champ)


func _spawn(kind: String, at: Vector2, champion: bool) -> void:
	var def := Monsters.get_def(kind)
	var m := Mob.new()
	m.arena = self
	m.setup(def, floor, champion)
	m.position = at.round()
	rt.things.add_child(m)
	m.shadow = rt._shadow(m.position, m.radius() + 1.0)
	mobs.append(m)
	if m.boss:
		boss = m
		Game.toast("The %s stirs." % def.name, "#d9b26a")


## Keep monsters from stacking into one blob.
func _separate() -> void:
	var n := mobs.size()
	for i in n:
		var a: Mob = mobs[i]
		if a.dead or a.state == "spawn":
			continue
		for j in range(i + 1, n):
			var b: Mob = mobs[j]
			if b.dead or b.state == "spawn":
				continue
			var d: Vector2 = b.position - a.position
			var min_d: float = a.radius() + b.radius()
			var l := d.length()
			if l < min_d and l > 0.01:
				var push := d / l * (min_d - l) * 0.5
				if rt.nav.walkable(a.position - push, 5):
					a.position -= push
				if rt.nav.walkable(b.position + push, 5):
					b.position += push


# --------------------------------------------------------------- picking
func monster_at(p: Vector2) -> Mob:
	var best: Mob = null
	var best_d := 1e9
	for m in mobs:
		if m.dead or m.state == "spawn":
			continue
		var r: float = m.radius() + 8.0
		# The body stands above the feet: test a box from the feet up.
		var box := Rect2(m.position + Vector2(-r, -m.height()), Vector2(r * 2, m.height() + 6))
		if box.has_point(p):
			var d := p.distance_to(m.position + Vector2(0, -m.height() / 2.0))
			if d < best_d:
				best_d = d
				best = m
	return best


# ---------------------------------------------------------- player's hits
## A swing or shot lands (called by the ZoneRuntime mid-swing).
func player_attack(from: Vector2, aim: Vector2, target: Mob) -> void:
	var sh := Game.sheet()
	var atk: Dictionary = sh.attack
	var dirv := (aim - from).normalized()
	if dirv == Vector2.ZERO:
		dirv = Vector2.DOWN
	if atk.kind == "melee":
		var reach := float(atk.range)
		for m in mobs:
			if m.dead or m.state == "spawn":
				continue
			var to: Vector2 = m.position - from
			var d := to.length()
			# +12px: a target that steps back mid-swing is still hit (monsters get the same).
			if d <= reach + m.radius() + 12.0 and (d < 10.0 or absf(dirv.angle_to(to)) <= deg_to_rad(65)):
				_hit_mob(m, sh)
		rt.fx.slash(from + Vector2(0, -16) + dirv * 16.0, dirv)
		return
	var n := 1 + int(sh.raw.get("projectiles", 0))
	for i in n:
		var a := (i - (n - 1) / 2.0) * 0.14
		shots.append({
			"pos": from + Vector2(0, -20), "vel": dirv.rotated(a) * (430.0 if atk.kind == "ranged" else 330.0),
			"kind": "arrow" if atk.kind == "ranged" else "bolt", "owner": "player", "life": 1.1, "splash": 0.0 if atk.kind == "ranged" else 22.0,
		})


func _roll_player_damage(sh: Dictionary) -> Array:
	var dmg := rng.randf_range(float(sh.damage[0]), float(sh.damage[1]))
	for ty in sh.adds:
		var r: Array = sh.adds[ty]
		dmg += rng.randf_range(float(r[0]), float(r[1]))
	dmg *= 1.0 + float(sh.attack.tagPct) / 100.0
	var crit := rng.randf() * 100.0 < float(sh.critChance)
	if crit:
		dmg *= 1.0 + float(sh.critDamage) / 100.0
	return [maxf(1.0, dmg), crit]


func _hit_mob(m: Mob, sh: Dictionary) -> void:
	var r := _roll_player_damage(sh)
	var dmg: float = r[0]
	m.take(dmg)
	rt.fx.number(m.position + Vector2(0, -m.height() - 4), dmg, r[1])
	var hero := Game.hero()
	var leech := float(sh.raw.get("lifeLeech", 0))
	if leech > 0:
		hero.life = minf(float(sh.life), float(hero.life) + dmg * leech / 100.0)
	if m.life <= 0:
		_kill(m, sh)


func _kill(m: Mob, sh: Dictionary) -> void:
	m.die()
	var hero := Game.hero()
	var xp := float(m.def.xp) * Monsters.xp_mult(floor) * (3.0 if m.champion else 1.0)
	Progression.gain_xp(hero, xp, float(sh.xpGain))
	var lok := float(sh.raw.get("lifeOnKill", 0))
	if lok > 0:
		hero.life = minf(float(sh.life), float(hero.life) + lok)
	Game.save.stats.kills = int(Game.save.stats.get("kills", 0)) + 1
	var tc := "boss" if m.boss else ("champion" if m.champion else "mob")
	var drops := Loot.roll_treasure(tc, {"ilvl": clampi(floor, 1, 99), "fortune": sh.fortune})
	if not drops.is_empty():
		Game.spawn_drops(drops, m.position)
	if m.boss:
		Game.save.stats.wardens = int(Game.save.stats.get("wardens", 0)) + 1
		Game.toast("The %s falls. Its hourglass cracks." % m.def.name, "#d9b26a")
	_dirty = true


# ---------------------------------------------------------- monster hits
## A monster's blow (or projectile) reaches the hero.
func hit_player(raw: float, type: String, attacker: Mob) -> void:
	if Game.ui.dead:
		return
	var sh := Game.sheet()
	var hero := Game.hero()
	var dmg := raw
	if type == "phys":
		if float(sh.block) > 0 and rng.randf() * 100.0 < float(sh.block):
			rt.fx.float_text("Block", Color("#c9c9c9"), rt.player.pos + Vector2(0, -50))
			return
		var armor := float(sh.armor)
		var dr := armor / (armor + 30.0 + 12.0 * floor)
		dmg *= 1.0 - minf(0.8, dr)
	else:
		var res := clampf(float(sh.res.get(type, 0)), -100.0, float(CharacterSheet.RES_CAP))
		dmg *= 1.0 - res / 100.0
	dmg = maxf(1.0, dmg - float(sh.raw.get("dmgReduce", 0)))
	hero.life = float(hero.life) - dmg
	rt.flash_hurt()
	rt.fx.number(rt.player.pos + Vector2(0, -54), dmg, false, Color("#ff6a5a"))
	var thorns := float(sh.raw.get("thorns", 0))
	if thorns > 0 and attacker != null and is_instance_valid(attacker) and not attacker.dead and attacker.def.kind == "melee":
		attacker.take(thorns)
		if attacker.life <= 0:
			_kill(attacker, sh)
	if float(hero.life) <= 0:
		_hero_died()


func _hero_died() -> void:
	var hero := Game.hero()
	hero.life = 0
	Game.save.stats.deaths = int(Game.save.stats.get("deaths", 0)) + 1
	hero.resumeFloor = 0
	var cps := Game.checkpoints()
	var line := "The Stair takes you. Somewhere above, the night starts over, and Thornwick drags you home."
	line += " You keep everything you carry. Next descent: floor %d or any checkpoint." % int(cps.back())
	Game.set_ui({"dead": true, "left": "", "right": "", "dialog": {
		"npcId": "", "title": "You have fallen", "sub": "Floor %d" % floor, "line": line, "notes": [], "modal": true,
		"buttons": [{"text": "Return to Thornwick", "action": func(): Game.return_to_town()}],
	}})
	Game.commit()


# ------------------------------------------------------------ the room
func _cleared() -> void:
	state = "cleared"
	_title()
	Game.toast("Floor %d cleared!" % floor, "#6fbf5a")
	# Town trips from here on keep your place: "Continue" takes you one deeper.
	Game.hero().resumeFloor = mini(100, floor + 1)
	Game.commit()
	var center: Vector2 = zone.get_meta("center")
	chest = Prop.new()
	chest.art = "dungeon_chest"
	chest.action = "chest"
	chest.display_name = "Chest"
	chest.block = Vector2i(1, 1)
	chest.approach_dy = 0.6
	chest.position = center.round()
	rt.things.add_child(chest)
	rt.add_prop(chest)
	rt.fx.sparkle(center + Vector2(0, -12), Color("#d9b26a"))
	if door:
		door.art = "door_open"
		door.action = "exit"
		door.display_name = "Stair to Floor %d" % (floor + 1) if floor < 100 else "The Hourglass"
		door.approach_dy = 0.5
		rt.refresh_prop(door)
		rt.atmosphere.light_prop(door)
	var entry: Vector2 = zone.get_meta("entry")
	portal = Prop.new()
	portal.art = "town_portal"
	portal.action = "portal"
	portal.display_name = "Portal to Thornwick"
	portal.approach_dy = 0.4
	portal.position = (entry + Vector2(-64, 0)).round()
	rt.things.add_child(portal)
	rt.add_prop(portal)
	rt.atmosphere.light_prop(portal)
	if floor >= 100:
		Game.save.stats.conquered = int(Game.save.stats.get("conquered", 0)) + 1
		Game.set_ui({"dialog": {"npcId": "", "title": "Dawn", "sub": "Floor 100", "notes": [],
			"line": "Below the last floor, an hourglass the size of a house. You turn it over. Far above, for the first time in longer than anyone can count, Thornwick sees the sky go grey, then gold."}})
	Game.commit()


func open_chest() -> void:
	if state != "cleared" or chest == null:
		return
	state = "looted"
	chest.art = "dungeon_chest_open"
	chest.action = "none"
	chest.display_name = ""
	rt.refresh_prop(chest)
	var sh := Game.sheet()
	var tc := "chest_boss" if Monsters.is_boss_floor(floor) else "chest"
	var drops: Array = []
	for i in 1 + floor / 20:
		drops.append_array(Loot.roll_treasure(tc, {"ilvl": clampi(floor + 2, 1, 99), "fortune": sh.fortune}))
	Game.spawn_drops(drops, chest.position + Vector2(0, -8))
	Game.save.stats.chests = int(Game.save.stats.get("chests", 0)) + 1
	Game.commit()


func take_exit() -> void:
	if state == "fight" or state == "intro":
		Game.float_text("Sealed until the room is empty.", "#e8e4d8")
		return
	if floor >= 100:
		Game.float_text("There is nowhere deeper.", "#e8e4d8")
		return
	Game.next_floor()


# ----------------------------------------------------------- projectiles
func mob_shoot(m: Mob, at: Vector2) -> void:
	var from: Vector2 = m.position + Vector2(0, -20)
	var dirv := (at + Vector2(0, -16) - from).normalized()
	shots.append({
		"pos": from, "vel": dirv * (250.0 if m.def.get("projectile", "arrow") == "arrow" else 190.0),
		"kind": "mob_" + String(m.def.get("projectile", "arrow")), "owner": "mob", "life": 2.2,
		"dmg": m.roll_damage(), "type": m.def.type, "src": m,
	})


func _move_shots(delta: float) -> void:
	var sh := Game.sheet() if Game.has_hero() else {}
	var ppos: Vector2 = rt.player.pos + Vector2(0, -16)
	for i in range(shots.size() - 1, -1, -1):
		var s: Dictionary = shots[i]
		s.pos += s.vel * delta
		s.life -= delta
		# Shots fly 20px up; they stop where the ground under them is wall. That
		# ground line is the same feet-to-feet line the shooters' line-of-sight
		# checks, so a shot that was clear to take is never eaten by a pillar.
		var done: bool = s.life <= 0 or rt.nav.is_blocked(ZoneNav.cell_of(s.pos + Vector2(0, 20)))
		if not done and s.owner == "player":
			for m in mobs:
				if m.dead or m.state == "spawn":
					continue
				if (m.position + Vector2(0, -14)).distance_to(s.pos) <= m.radius() + 6.0:
					done = true
					if float(s.get("splash", 0)) > 0:
						for o in mobs:
							if not o.dead and o.state != "spawn" and (o.position + Vector2(0, -14)).distance_to(s.pos) <= o.radius() + float(s.splash):
								_hit_mob(o, sh)
					else:
						_hit_mob(m, sh)
					break
		elif not done and s.owner == "mob" and not Game.ui.dead:
			if s.pos.distance_to(ppos) <= PLAYER_RADIUS + 4.0:
				done = true
				hit_player(float(s.dmg), s.type, null)
		if done:
			if s.owner == "player" or s.kind == "mob_fire":
				rt.fx.spark(s.pos, Color("#ffb35a") if s.kind != "arrow" else Color("#e8dcc0"))
			shots.remove_at(i)
	_shots_layer.queue_redraw()


## Draws every projectile (unshaded, so bolts glow in the dark).
class Shots extends Node2D:
	var arena: Arena

	func _init() -> void:
		var mat := CanvasItemMaterial.new()
		mat.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
		material = mat

	func _draw() -> void:
		for s in arena.shots:
			var p: Vector2 = s.pos.round()
			var d: Vector2 = s.vel.normalized()
			match s.kind:
				"arrow", "mob_arrow":
					draw_line(p - d * 7.0, p, Color("#d8ccae"), 1.0)
					draw_rect(Rect2(p - Vector2(1, 1), Vector2(2, 2)), Color("#ece3cb"))
				"bolt":
					for k in 4:
						var q := (p - d * k * 3.0).round()
						var c := Color("#c6f4ff") if k == 0 else Color(0.43, 0.84, 1.0, 0.7 - k * 0.15)
						draw_rect(Rect2(q - Vector2(2, 2) + Vector2(k * 0.5, k * 0.5), Vector2(4 - k, 4 - k)), c)
				"mob_fire":
					for k in 4:
						var q := (p - d * k * 3.0).round()
						var c := Color("#ffd98a") if k == 0 else Color(0.91, 0.42, 0.16, 0.8 - k * 0.18)
						draw_rect(Rect2(q - Vector2(2, 2) + Vector2(k * 0.5, k * 0.5), Vector2(4 - k, 4 - k)), c)
				_:
					draw_rect(Rect2(p - Vector2(2, 2), Vector2(4, 4)), Color("#6fd6ff"))


## A monster: walks, winds up, hits, dies. Feet on its node position (y-sorted
## with everything else in the room); the sprite draws behind its own life bar.
class Mob extends Node2D:
	var arena: Arena
	var def: Dictionary
	var sheet := ""
	var life := 1.0
	var max_life := 1.0
	var damage := [1.0, 2.0]
	var speed := 50.0
	var champion := false
	var boss := false
	var dead := false
	var gone := false
	var hovered := false
	var spr: Sprite2D
	var shadow: Node2D
	var dir := "south"
	var state := "spawn" # spawn | chase | windup | recover | dead
	var st := 0.0
	var cd := 0.5
	var anim_t := 0.0
	var flash := 0.0
	var moving := false
	var _height := 44.0

	func setup(d: Dictionary, floor: int, champ: bool) -> void:
		def = d
		boss = d.get("boss", false)
		champion = champ and not boss
		sheet = d.sprite
		for s in [d.sprite, "mob_skeleton", "player"]:
			if not Art.char_meta(s).is_empty():
				sheet = s
				break
		var lm := Monsters.life_mult(floor)
		var dm := Monsters.damage_mult(floor)
		max_life = float(d.life) * lm * (3.2 if champion else 1.0)
		life = max_life
		damage = [float(d.damage[0]) * dm * (1.5 if champion else 1.0), float(d.damage[1]) * dm * (1.5 if champion else 1.0)]
		speed = float(d.speed) * (1.15 if champion else 1.0)
		spr = Sprite2D.new()
		spr.centered = false
		spr.offset = ZoneRuntime.char_offset(sheet)
		spr.show_behind_parent = true
		spr.texture = Art.char_rotation(sheet, "south")
		add_child(spr)
		var m := Art.char_meta(sheet)
		_height = float(int(m.get("footY", 60)) - int(m.get("bodyTop", 14)))
		if sheet != d.sprite:
			spr.modulate = Color(0.7, 1.0, 0.7) # placeholder art: tell them apart
		if champion:
			spr.self_modulate = Color(0.75, 0.85, 1.35)
		modulate.a = 0.0

	func radius() -> float:
		return float(def.radius) * (1.2 if champion else 1.0)

	func height() -> float:
		return _height

	func title() -> String:
		return ("Champion " if champion else "") + String(def.name)

	func title_color() -> String:
		return "#d9b26a" if boss else ("#7896ff" if champion else "#e8dcc0")

	func subtitle() -> String:
		return "Floor %d" % arena.floor if not boss else "Warden of floor %d" % arena.floor

	func roll_damage() -> float:
		return randf_range(damage[0], damage[1])

	func take(dmg: float) -> void:
		life -= dmg
		flash = 0.08
		queue_redraw()

	func die() -> void:
		dead = true
		state = "dead"
		st = 0.0
		hovered = false
		queue_redraw()

	func _face(to: Vector2) -> void:
		if to.length() > 0.5:
			dir = Art.dir_from_vector(to)

	func tick(delta: float, ppos: Vector2, hero_dead: bool) -> void:
		st += delta
		cd -= delta
		anim_t += delta
		flash -= delta
		moving = false
		match state:
			"spawn":
				modulate.a = clampf(st / 0.5, 0.0, 1.0)
				if st >= 0.5:
					modulate.a = 1.0
					state = "chase"
			"chase":
				if not hero_dead:
					_chase(delta, ppos)
			"windup":
				_face(ppos - position)
				if st >= float(def.windup):
					_strike(ppos)
					state = "recover"
					st = 0.0
					cd = float(def.cooldown)
			"recover":
				if st >= 0.25:
					state = "chase"
			"dead":
				if st > 1.6:
					modulate.a = maxf(0.0, 1.0 - (st - 1.6) / 0.6)
				if st > 2.2:
					gone = true
					if shadow:
						shadow.queue_free()
		_animate()
		if shadow:
			shadow.position = position + Vector2(0, -1)
			shadow.visible = not gone
		if flash > -0.1 or hovered:
			queue_redraw()

	func _chase(delta: float, ppos: Vector2) -> void:
		var to := ppos - position
		var dist := to.length()
		var reach := float(def.range) + Arena.PLAYER_RADIUS
		var nav: ZoneNav = arena.rt.nav
		var want := Vector2.ZERO
		if def.kind == "melee":
			if dist <= reach:
				if cd <= 0:
					state = "windup"
					st = 0.0
					anim_t = 0.0
				_face(to)
				return
			want = to / dist
		else:
			# Archers and casters close to range and hold their ground (D2-style):
			# backing away from a melee hero only made them kite at the edge of a swing.
			var sees := nav.line_of_sight(position, ppos, 2.0)
			if dist > float(def.range) * 0.95 or not sees:
				want = to / maxf(dist, 0.01)
			elif cd <= 0:
				state = "windup"
				st = 0.0
				anim_t = 0.0
				_face(to)
				return
		if want == Vector2.ZERO:
			return
		# Closing in: straight at the hero when the way is clear, otherwise
		# follow the room's flow field around pillars and corners.
		if want.dot(to) > 0 and not nav.line_of_sight(position, ppos):
			var wp := nav.flow_step(position)
			if wp != Vector2.INF:
				want = (wp - position).normalized()
		var step := want * speed * delta
		for a in [0.0, 0.6, -0.6, 1.2, -1.2]:
			var s := step.rotated(a)
			if nav.walkable(position + s, radius() * 0.6):
				position += s
				moving = true
				_face(s)
				return
		# Wedged: slide towards the next flow cell even if it means hugging a wall.
		var wp2 := nav.flow_step(position)
		if wp2 != Vector2.INF:
			position += (wp2 - position).normalized() * speed * delta
			moving = true

	func _strike(ppos: Vector2) -> void:
		if def.kind == "melee":
			if position.distance_to(ppos) <= float(def.range) + Arena.PLAYER_RADIUS + 12.0:
				arena.hit_player(roll_damage(), def.type, self)
		else:
			arena.mob_shoot(self, ppos)

	func _animate() -> void:
		var frames: Array[Texture2D]
		var fi := 0
		match state:
			"dead":
				frames = Art.char_frames(sheet, "falling_backward", "south")
				fi = mini(int(st * 8.0), frames.size() - 1)
			"windup", "recover":
				frames = Art.char_frames(sheet, "attack", dir)
				var total := float(def.windup) + 0.25
				var tt := st if state == "windup" else float(def.windup) + st
				fi = clampi(int(tt / total * frames.size()), 0, frames.size() - 1)
			_:
				if moving:
					frames = Art.char_frames(sheet, "walking", dir)
					fi = int(anim_t * 10.0) % maxi(1, frames.size())
				else:
					spr.texture = Art.char_rotation(sheet, dir)
					spr.self_modulate = _tint()
					return
		if frames.size() > 0:
			spr.texture = frames[fi]
		spr.self_modulate = _tint()

	func _tint() -> Color:
		if flash > 0:
			return Color(2.2, 2.2, 2.2)
		return Color(0.75, 0.85, 1.35) if champion else Color.WHITE

	func _draw() -> void:
		if dead:
			return
		var hurt := life < max_life
		if not (hurt or hovered or champion or boss):
			return
		var w := 40.0 if boss else 24.0
		var top := -_height - 6.0
		var r := Rect2(-w / 2.0, top, w, 3.0)
		draw_rect(r.grow(1.0), Color(0, 0, 0, 0.75))
		draw_rect(Rect2(r.position, Vector2(roundf(w * clampf(life / max_life, 0.0, 1.0)), 3.0)), Color("#d9443a") if not champion else Color("#5a7cff"))
