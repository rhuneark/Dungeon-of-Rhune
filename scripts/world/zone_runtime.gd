class_name ZoneRuntime
extends Node2D
## Brings a Zone to life: walk grid from terrain/props/blockers, the player,
## NPCs, ground loot, hover/click interactions, the camera, and (on the
## Sealed Stair) the player's side of combat. Input is D2-style: click or hold
## to walk; click a monster to walk into range and keep hitting it until it
## falls; Shift+click attacks where you stand; click a person or object to
## walk over and use it; click a label to pick loot up. WASD/arrows and the
## gamepad stick also move. The Arena (scripts/world/arena.gd) runs the
## monsters and resolves hits.

const TILE := 32
const PLAYER_SPEED := 135.0
const WATER := 3 # terrain index in assets/tiles/terrain.tres
const CORNERS := [
	TileSet.CELL_NEIGHBOR_TOP_LEFT_CORNER, TileSet.CELL_NEIGHBOR_TOP_RIGHT_CORNER,
	TileSet.CELL_NEIGHBOR_BOTTOM_LEFT_CORNER, TileSet.CELL_NEIGHBOR_BOTTOM_RIGHT_CORNER,
]

var zone: Zone
var nav: ZoneNav
var ground_items: GroundItems
var fx: Fx
var atmosphere: Atmosphere
var arena: Arena
var labels: Node2D
var things: Node2D
var decals: Node2D
var camera: Camera2D
var map_px := Vector2.ZERO

## {target: Dictionary, rect: Rect2, approach: Vector2, range: float, node: CanvasItem, color: String}
var hotspots: Array = []
var npcs: Array = []
var player := {
	"pos": Vector2.ZERO, "dir": "north", "path": [] as Array[Vector2], "moving": false, "anim_t": 0.0, "pending": null,
	# combat: the monster we're after, an in-place attack point, the swing in progress
	"target": null, "attack_at": null, "swing": -1.0, "swing_len": 0.5, "hit_done": false, "hurt": 0.0,
}
var player_sprite: Sprite2D
var player_shadow: Node2D
var player_foot := 0

var _hovered = null
var _pointer_down := false
var _hold_move := false
var _repath_t := 0.0
var _cam_shift := 0.0
var _last_hover_key := ""
var _death_t := 0.0


func setup(z: Zone) -> void:
	zone = z
	decals = z.get_node("Decals")
	things = z.get_node("Things")
	var ground: TileMapLayer = z.get_node("Ground")
	var used := ground.get_used_rect()
	nav = ZoneNav.new(used.end)
	map_px = Vector2(used.end * TILE)

	# Water tiles (2+ water corners) are not walkable (town terrain only).
	if ground.tile_set and ground.tile_set.get_terrain_sets_count() > 0:
		for c in ground.get_used_cells():
			var td := ground.get_cell_tile_data(c)
			if td == null:
				continue
			var water := 0
			for corner in CORNERS:
				if td.get_terrain_peering_bit(corner) == WATER:
					water += 1
			if water >= 2:
				nav.block(Rect2i(c, Vector2i.ONE))

	ground_items = GroundItems.new()
	ground_items.name = "GroundItems"
	z.add_child(ground_items)
	z.move_child(ground_items, decals.get_index() + 1)
	# Loot labels and floating text sit on their own layer that tracks the
	# camera, so the dusk tint and fog never dim them.
	var overlay := CanvasLayer.new()
	overlay.name = "Overlay"
	overlay.layer = 2
	overlay.follow_viewport_enabled = true
	z.add_child(overlay)
	fx = Fx.new()
	fx.name = "Fx"
	overlay.add_child(fx)
	labels = Node2D.new()
	labels.name = "Labels"
	overlay.add_child(labels)
	ground_items.label_layer = labels
	ground_items.fx = fx
	ground_items.nav = nav

	for p in _all(z, "Prop"):
		add_prop(p)
	for b in _all(z, "Blocker"):
		nav.block(b.cells())
	for s in _all(z, "NpcSpot"):
		_add_npc(s)
	_add_player()
	atmosphere = Atmosphere.new()
	atmosphere.name = "Atmosphere"
	z.add_child(atmosphere)
	atmosphere.setup(z, map_px)
	atmosphere.attach_player_light(player_sprite)

	camera = Camera2D.new()
	camera.limit_left = 0
	camera.limit_top = 0
	camera.limit_right = int(map_px.x)
	camera.limit_bottom = int(map_px.y)
	z.add_child(camera)
	camera.make_current()
	_apply_view()
	camera.position = player.pos
	camera.reset_smoothing()

	View.changed.connect(_apply_view)
	Game.drops_requested.connect(_on_drops)
	Game.float_text_requested.connect(_on_float_text)


static func _all(n: Node, cls: String) -> Array:
	var out := []
	for c in n.get_children():
		if c.get_script() and c.get_script().get_global_name() == cls:
			out.append(c)
		out.append_array(_all(c, cls))
	return out


func _apply_view() -> void:
	if camera:
		camera.zoom = Vector2(View.world_zoom, View.world_zoom)


# ---------------------------------------------------------------- building
## Register a Prop: its footprint blocks the walk grid; with an action or a
## name it becomes a hotspot. Public: the Arena adds its chest and door later.
func add_prop(p: Prop) -> void:
	if p.block != Vector2i.ZERO:
		nav.block(p.footprint())
	if p.action == "none" and p.display_name == "":
		return
	var is_decal := p.get_parent() == decals
	hotspots.append({
		"target": {"kind": "prop", "action": p.action if p.action != "none" else "statue", "name": p.display_name if p.display_name != "" else p.art},
		"rect": p.world_rect(),
		"approach": p.approach_point(),
		"range": (34.0 if is_decal else 30.0) if p.action != "none" else -1.0,
		"node": p,
		"color": "#e8d9b0" if p.action != "none" else "#a89f8a",
	})


func refresh_prop(p: Prop) -> void:
	for i in range(hotspots.size() - 1, -1, -1):
		if hotspots[i].node == p:
			hotspots.remove_at(i)
	add_prop(p)


func _shadow(at: Vector2, rx := 11.0) -> Node2D:
	var poly := Polygon2D.new()
	var pts := PackedVector2Array()
	for i in 16:
		var a := TAU * i / 16.0
		pts.append(Vector2(cos(a) * rx, sin(a) * rx * 0.4))
	poly.polygon = pts
	poly.color = Color(0, 0, 0, 0.3)
	poly.position = at
	decals.add_child(poly)
	return poly


## Sprite offset that puts a character's feet on its node position.
static func char_offset(sheet: String) -> Vector2:
	var m := Art.char_meta(sheet)
	var cell: Array = m.get("cell", [64, 64])
	return Vector2(-int(cell[0]) / 2, -int(m.get("footY", 63)))


func _add_npc(s: NpcSpot) -> void:
	s.visible = false
	var def := Npcs.get_npc(s.npc_id)
	if def.is_empty():
		return
	var sheet: String = def.sprite
	var frames := Art.char_frames(sheet, "breathing_idle", "south")
	var spr := Sprite2D.new()
	spr.texture = frames[0] if frames.size() > 0 else null
	spr.centered = false
	spr.offset = char_offset(sheet)
	spr.position = s.global_position.round()
	things.add_child(spr)
	_shadow(spr.position + Vector2(0, -1))
	nav.block(Rect2i(floori(spr.position.x / TILE), floori(spr.position.y / TILE - 0.3), 1, 1))
	npcs.append({"id": s.npc_id, "sprite": spr, "frames": frames, "t": randf() * 4.0, "pos": spr.position, "sheet": sheet, "facing": ""})
	hotspots.append({
		"target": {"kind": "npc", "id": s.npc_id, "name": def.name},
		"rect": Rect2(spr.position + Vector2(-14, -54), Vector2(28, 56)),
		"approach": spr.position + Vector2(0, 22),
		"range": 44.0,
		"node": spr,
		"color": "#e8d9b0",
	})


func _add_player() -> void:
	var spawn: Node2D = zone.get_node_or_null("Spawn")
	player.pos = spawn.global_position if spawn else map_px / 2.0
	player_sprite = Sprite2D.new()
	player_sprite.name = "Player"
	player_sprite.centered = false
	player_sprite.offset = char_offset("player")
	player_sprite.texture = Art.char_rotation("player", "north")
	things.add_child(player_sprite)
	player_shadow = _shadow(player.pos, 11.0)


# ------------------------------------------------------------------- input
func _is_entry(t) -> bool:
	return t is Dictionary and t.has("drop")


func _is_mob(t) -> bool:
	return t is Arena.Mob


func pick(p: Vector2):
	var g = ground_items.hit(p)
	if g:
		return g
	if arena:
		var m := arena.monster_at(p)
		if m:
			return m
	var best = null
	for h in hotspots:
		if not h.rect.has_point(p):
			continue
		if best == null or h.node.global_position.y > best.node.global_position.y:
			best = h
	return best


func _walk_to(to: Vector2) -> void:
	player.path = nav.find_path(player.pos, to)


func _unhandled_input(event: InputEvent) -> void:
	if Game.ui.phase != "playing" or Game.ui.dead:
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_on_pointer_down(event.shift_pressed)
		else:
			_pointer_down = false
			_hold_move = false


func _on_pointer_down(shift := false) -> void:
	_pointer_down = true
	var wp := get_global_mouse_position()
	var target = pick(wp)
	var hero := Game.hero()
	if hero.get("cursor") != null and target == null:
		Actions.drop_cursor()
		return
	if not Game.ui.dialog.is_empty():
		Game.set_ui({"dialog": {}})
	if arena and (shift or _is_mob(target)):
		# Attack: the monster (walk into range, keep at it), or in place (Shift).
		player.pending = null
		player.path = []
		_hold_move = false
		player.target = target if _is_mob(target) and not shift else null
		player.attack_at = wp if player.target == null else null
		return
	player.target = null
	player.attack_at = null
	if target != null and (_is_entry(target) or target.range >= 0):
		player.pending = target
		_hold_move = false
		_walk_to(target.pos if _is_entry(target) else target.approach)
		return
	player.pending = null
	_hold_move = true
	_repath_t = 0.0
	_walk_to(wp)


func _set_hover(h) -> void:
	if is_same(h, _hovered):
		return
	if _hovered != null and not _is_entry(_hovered) and is_instance_valid(_hovered if _is_mob(_hovered) else _hovered.node):
		if _is_mob(_hovered):
			_hovered.hovered = false
		else:
			_hovered.node.modulate = Color.WHITE
	_hovered = h
	ground_items.set_hovered(h if _is_entry(h) else null)
	var info := {}
	if _is_mob(h):
		h.hovered = true
		info = {"text": h.title(), "color": h.title_color(), "sub": h.subtitle()}
	elif h != null and not _is_entry(h):
		if h.range >= 0:
			h.node.modulate = Color(1.35, 1.35, 1.35)
		var t: Dictionary = h.target
		match t.kind:
			"npc":
				info = {"text": t.name, "color": h.color, "sub": Npcs.get_npc(t.id).get("title", "")}
			_:
				info = {"text": t.name, "color": h.color, "sub": ""}
	var key := str(info)
	if key != _last_hover_key:
		_last_hover_key = key
		Game.set_ui({"hover_name": info})


# ------------------------------------------------------------------ update
func _process(delta: float) -> void:
	if Game.ui.phase != "playing" or Game.ui.paused or not Game.has_hero():
		return
	delta = minf(delta, 0.05)
	if Game.ui.dead:
		_dead(delta)
		return
	var sheet := Game.sheet()
	var hero := Game.hero()
	# Life regenerates slowly (Replenish Life is per second).
	if float(sheet.lifeRegen) > 0 and float(hero.life) < float(sheet.life):
		hero.life = minf(float(sheet.life), float(hero.life) + float(sheet.lifeRegen) * delta)
	if _pointer_down and _hold_move:
		_repath_t -= delta
		if _repath_t <= 0:
			_repath_t = 0.15
			_walk_to(get_global_mouse_position())

	var speed := PLAYER_SPEED * (1.0 + float(sheet.get("moveSpeed", 0.0)) / 100.0)
	var mv := Vector2.ZERO
	var kd := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	var swinging: bool = player.swing >= 0.0
	if kd != Vector2.ZERO and not _typing():
		player.path = []
		player.pending = null
		player.target = null
		player.attack_at = null
		if not swinging:
			mv = kd.normalized() * speed * delta
	elif arena and (player.target != null or player.attack_at != null):
		mv = _combat(delta, speed, sheet)
	elif not player.path.is_empty() and not swinging:
		var wp: Vector2 = player.path[0]
		var d: Vector2 = wp - player.pos
		var step := speed * delta
		if d.length() <= step:
			mv = d
			player.path.pop_front()
		else:
			mv = d.normalized() * step
	if player.swing >= 0.0:
		_advance_swing(delta, sheet)
	var moving := mv.length() > 0.01
	if moving:
		if nav.walkable(player.pos + Vector2(mv.x, 0)):
			player.pos.x += mv.x
		if nav.walkable(player.pos + Vector2(0, mv.y)):
			player.pos.y += mv.y
		player.dir = Art.dir_from_vector(mv)
	player.moving = moving
	_try_interact()

	# Auto-pickup gold you walk over.
	for e in ground_items.entries:
		if e.landed and e.drop.kind == "gold" and e.pos.distance_to(player.pos) < 16:
			if _pickup(e):
				ground_items.remove(e)
			break

	_animate_player(delta, moving, speed)
	_update_npcs(delta)

	# Camera: with a side panel open, keep the hero centred in the visible half (D2).
	var ui := Game.ui
	var half := 172.0 * View.ui_scale / View.world_zoom
	var want := 0.0
	if ui.left != "":
		want -= half
	if ui.right != "":
		want += half
	_cam_shift += (want - _cam_shift) * minf(1.0, delta * 10.0)
	camera.position = player.pos + Vector2(_cam_shift, -16)

	if get_viewport().gui_get_hovered_control() == null:
		_set_hover(pick(get_global_mouse_position()))
	else:
		_set_hover(null)


func _animate_player(delta: float, moving: bool, speed: float) -> void:
	player.anim_t += delta
	var frames: Array[Texture2D]
	if player.swing >= 0.0:
		frames = Art.char_frames("player", "attack", player.dir)
		var f := clampi(int(player.swing / player.swing_len * frames.size()), 0, frames.size() - 1)
		player_sprite.texture = frames[f]
	else:
		frames = Art.char_frames("player", "walking" if moving else "breathing_idle", player.dir)
		var fps := 11.0 * (speed / PLAYER_SPEED) if moving else 4.0
		if frames.size() > 0:
			player_sprite.texture = frames[int(player.anim_t * fps) % frames.size()]
	player.hurt = maxf(0.0, player.hurt - delta)
	player_sprite.modulate = Color(1.6, 0.55, 0.5) if player.hurt > 0.0 else Color.WHITE
	player_sprite.position = player.pos.round()
	player_shadow.position = player.pos.round() + Vector2(0, -1)


## Walk into range of the target and swing; returns the step to move this frame.
func _combat(delta: float, speed: float, sheet: Dictionary) -> Vector2:
	var reach: float = sheet.attack.range
	var aim: Vector2
	if player.target != null:
		var m: Arena.Mob = player.target
		if not is_instance_valid(m) or m.dead:
			player.target = null
			# Still holding the button over another monster: take that one next.
			if _pointer_down:
				var next = arena.monster_at(get_global_mouse_position())
				if next:
					player.target = next
			return Vector2.ZERO
		aim = m.position
		reach += m.radius()
		var los: bool = sheet.attack.kind == "melee" or nav.line_of_sight(player.pos, aim, 2.0)
		if player.pos.distance_to(aim) > reach or not los:
			if player.swing >= 0.0:
				return Vector2.ZERO
			_repath_t -= delta
			if _repath_t <= 0 or player.path.is_empty():
				_repath_t = 0.2
				_walk_to(aim)
			if player.path.is_empty():
				return Vector2.ZERO
			var d: Vector2 = player.path[0] - player.pos
			if d.length() <= speed * delta:
				player.path.pop_front()
				return d
			return d.normalized() * speed * delta
	else:
		aim = player.attack_at
	player.path = []
	if player.swing < 0.0:
		player.dir = Art.dir_from_vector(aim - player.pos)
		player.swing = 0.0
		player.hit_done = false
		player.swing_len = maxf(0.22, 1.0 / maxf(0.2, float(sheet.attacksPerSec)))
	return Vector2.ZERO


func _advance_swing(delta: float, sheet: Dictionary) -> void:
	player.swing += delta
	if not player.hit_done and player.swing >= player.swing_len * 0.55:
		player.hit_done = true
		var aim: Vector2
		if player.target != null and is_instance_valid(player.target):
			aim = player.target.position
		elif player.attack_at != null:
			aim = player.attack_at
		else:
			aim = player.pos + Art.vector_from_dir(player.dir) * 40.0
		arena.player_attack(player.pos, aim, player.target if player.target != null and is_instance_valid(player.target) else null)
	if player.swing >= player.swing_len:
		player.swing = -1.0
		# In-place attacks repeat while the button is held.
		if player.attack_at != null and not _pointer_down:
			player.attack_at = null
		elif player.attack_at != null:
			player.attack_at = get_global_mouse_position()


## Called by the Arena when a monster lands a hit (for the red flash).
func flash_hurt() -> void:
	player.hurt = 0.12


func _dead(delta: float) -> void:
	_death_t += delta
	var frames := Art.char_frames("player", "falling_backward", "south")
	if frames.size() > 0:
		player_sprite.texture = frames[mini(int(_death_t * 8.0), frames.size() - 1)]
	player_sprite.modulate = Color(0.8, 0.6, 0.6)
	_set_hover(null)


func _typing() -> bool:
	var f := get_viewport().gui_get_focus_owner()
	return f is LineEdit or f is TextEdit


func _try_interact() -> void:
	var t = player.pending
	if t == null:
		return
	if _is_entry(t):
		if t.pos.distance_to(player.pos) <= 26:
			player.pending = null
			player.path = []
			if t in ground_items.entries and _pickup(t):
				ground_items.remove(t)
		return
	var d: float = t.approach.distance_to(player.pos)
	if d <= t.range or (player.path.is_empty() and d <= t.range * 2.2):
		player.pending = null
		player.path = []
		var target: Dictionary = t.target
		if target.kind == "npc":
			for n in npcs:
				if n.id == target.id:
					n.facing = Art.dir_from_vector(player.pos - n.pos)
		player.dir = Art.dir_from_vector(Vector2(t.rect.get_center().x, t.rect.end.y - 8) - player.pos)
		Interact.on_world_interact(target)


func _pickup(e: Dictionary) -> bool:
	var hero := Game.hero()
	if e.drop.kind == "gold":
		hero.gold = int(hero.gold) + int(e.drop.amount)
		Game.commit()
		return true
	return Actions.pick_up(e.drop.item)


func _update_npcs(delta: float) -> void:
	var talking: String = Game.ui.dialog.get("npcId", "") if not Game.ui.dialog.is_empty() else ""
	for n in npcs:
		n.t += delta
		if n.facing != "" and talking == n.id:
			n.sprite.texture = Art.char_rotation(n.sheet, n.facing)
		else:
			n.facing = ""
			if n.frames.size() > 0:
				n.sprite.texture = n.frames[int(n.t * 3.5) % n.frames.size()]


# ------------------------------------------------------------- the bridge
func _on_drops(drops: Array, origin: Variant) -> void:
	ground_items.spawn(drops, origin if origin is Vector2 else player.pos)


func _on_float_text(text: String, color: String, at: Variant) -> void:
	var p: Vector2 = at if at is Vector2 else player.pos + Vector2(0, -58)
	fx.float_text(text, Color(color), p)
