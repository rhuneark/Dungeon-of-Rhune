class_name ZoneRuntime
extends Node2D
## Brings a Zone scene to life: walk grid from terrain/props/blockers, the
## player, animated NPCs, the goose, ground loot, hover/click interactions and
## the camera. Input is D2-style: click (or hold) to walk, click a person or
## object to walk over and use it, click a label to pick loot up. WASD/arrows
## and the gamepad stick also move.

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
var labels: Node2D
var things: Node2D
var decals: Node2D
var camera: Camera2D
var map_px := Vector2.ZERO

## {target: Dictionary, rect: Rect2, approach: Vector2, range: float, node: CanvasItem, color: String}
var hotspots: Array = []
var npcs: Array = []
var goose := {}
var player := {"pos": Vector2.ZERO, "dir": "north", "path": [] as Array[Vector2], "moving": false, "anim_t": 0.0, "pending": null}
var player_sprite: Sprite2D
var player_shadow: Node2D
var player_foot := 0

var _hovered = null
var _pointer_down := false
var _hold_move := false
var _repath_t := 0.0
var _cam_shift := 0.0
var _last_hover_key := ""


func setup(z: Zone) -> void:
	zone = z
	decals = z.get_node("Decals")
	things = z.get_node("Things")
	var ground: TileMapLayer = z.get_node("Ground")
	var used := ground.get_used_rect()
	nav = ZoneNav.new(used.end)
	map_px = Vector2(used.end * TILE)

	# Water tiles (2+ water corners) are not walkable.
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
	fx = Fx.new()
	fx.name = "Fx"
	z.add_child(fx)
	labels = Node2D.new()
	labels.name = "Labels"
	z.add_child(labels)
	ground_items.label_layer = labels
	ground_items.fx = fx
	ground_items.nav = nav

	for p in _all(z, "Prop"):
		_add_prop(p)
	for b in _all(z, "Blocker"):
		nav.block(b.cells())
	for s in _all(z, "NpcSpot"):
		_add_npc(s)
	_add_goose()
	_add_player()

	var hero := Game.hero()
	for pi in _all(z, "PlacedItem"):
		pi.visible = false
		if pi.key in hero.get("taken", []):
			continue
		var item := ItemGen.create_item(pi.base_id, {"ilvl": 1})
		ground_items.add({"kind": "item", "item": item}, pi.global_position, null, 0.0, pi.key)
	ground_items.layout_labels()

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
func _add_prop(p: Prop) -> void:
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
	var m := Art.char_meta(sheet)
	spr.offset = Vector2(-32, -int(m.get("footY", 63)))
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


func _add_goose() -> void:
	var area := zone.critter_area
	if area.size == Vector2i.ZERO:
		return
	var spr := Sprite2D.new()
	spr.texture = Art.prop_texture("goose")
	spr.centered = false
	if spr.texture:
		var bb := Prop.bbox_of(spr.texture)
		spr.offset = Vector2(-spr.texture.get_width() / 2.0, -bb.end.y)
	var pos := Vector2((area.position.x + area.size.x / 2.0) * TILE, area.position.y * TILE + 32)
	spr.position = pos
	things.add_child(spr)
	var hs := {"target": {"kind": "critter", "id": "goose"}, "rect": Rect2(), "approach": pos, "range": 34.0, "node": spr, "color": "#ffffff"}
	hotspots.append(hs)
	goose = {"sprite": spr, "pos": pos, "target": pos, "wait": 1.0, "flee": 0.0, "area": area, "hs": hs, "t": 0.0}


func _add_player() -> void:
	var spawn: Node2D = zone.get_node_or_null("Spawn")
	player.pos = spawn.global_position if spawn else map_px / 2.0
	player_sprite = Sprite2D.new()
	player_sprite.name = "Player"
	player_sprite.centered = false
	var m := Art.char_meta("player")
	player_sprite.offset = Vector2(-32, -int(m.get("footY", 63)))
	player_sprite.texture = Art.char_rotation("player", "north")
	things.add_child(player_sprite)
	player_shadow = _shadow(player.pos, 11.0)


# ------------------------------------------------------------------- input
func _is_entry(t) -> bool:
	return t is Dictionary and t.has("drop")


func pick(p: Vector2):
	var g = ground_items.hit(p)
	if g:
		return g
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
	if Game.ui.phase != "playing":
		return
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed:
			_on_pointer_down()
		else:
			_pointer_down = false
			_hold_move = false


func _on_pointer_down() -> void:
	_pointer_down = true
	var wp := get_global_mouse_position()
	var target = pick(wp)
	var hero := Game.hero()
	if hero.get("cursor") != null and target == null:
		Actions.drop_cursor()
		return
	if not Game.ui.dialog.is_empty():
		Game.set_ui({"dialog": {}})
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
	if h == _hovered:
		return
	if _hovered != null and not _is_entry(_hovered):
		_hovered.node.modulate = Color.WHITE
	_hovered = h
	ground_items.set_hovered(h if _is_entry(h) else null)
	var info := {}
	if h != null and not _is_entry(h):
		if h.range >= 0:
			h.node.modulate = Color(1.35, 1.35, 1.35)
		var t: Dictionary = h.target
		match t.kind:
			"npc":
				info = {"text": t.name, "color": h.color, "sub": Npcs.get_npc(t.id).get("title", "")}
			"critter":
				info = {"text": "The Goose", "color": "#ffffff", "sub": "Unbothered. Moisturized. Watching."}
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
	if _pointer_down and _hold_move:
		_repath_t -= delta
		if _repath_t <= 0:
			_repath_t = 0.15
			_walk_to(get_global_mouse_position())

	var speed := PLAYER_SPEED * (1.0 + float(Game.sheet().get("moveSpeed", 0.0)) / 100.0)
	var mv := Vector2.ZERO
	var kd := Input.get_vector("move_left", "move_right", "move_up", "move_down")
	if kd != Vector2.ZERO and not _typing():
		player.path = []
		player.pending = null
		mv = kd.normalized() * speed * delta
	elif not player.path.is_empty():
		var wp: Vector2 = player.path[0]
		var d: Vector2 = wp - player.pos
		var step := speed * delta
		if d.length() <= step:
			mv = d
			player.path.pop_front()
		else:
			mv = d.normalized() * step
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

	# Player animation
	player.anim_t += delta
	var frames := Art.char_frames("player", "walking" if moving else "breathing_idle", player.dir)
	var fps := 11.0 * (speed / PLAYER_SPEED) if moving else 4.0
	if frames.size() > 0:
		player_sprite.texture = frames[int(player.anim_t * fps) % frames.size()]
	player_sprite.position = player.pos.round()
	player_shadow.position = player.pos.round() + Vector2(0, -1)

	_update_npcs(delta)
	_update_goose(delta)

	# Camera: with a side panel open, keep the hero centred in the visible half (D2).
	var ui := Game.ui
	var half := 172.0 * View.ui_scale / View.world_zoom
	var want := 0.0
	if ui.overlay == "":
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
		if target.kind == "critter" and not goose.is_empty():
			_scare_goose()


func _pickup(e: Dictionary) -> bool:
	var hero := Game.hero()
	if e.drop.kind == "gold":
		hero.gold = int(hero.gold) + int(e.drop.amount)
		Game.commit()
		return true
	if Actions.pick_up(e.drop.item):
		if e.placed_key != "":
			hero.taken.append(e.placed_key)
			Game.commit()
		return true
	return false


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


# ------------------------------------------------- the goose (it watches)
func _update_goose(delta: float) -> void:
	if goose.is_empty():
		return
	var g := goose
	g.t += delta
	g.wait -= delta
	if g.flee > 0:
		g.flee -= delta
	var d: Vector2 = g.target - g.pos
	var step := (110.0 if g.flee > 0 else 26.0) * delta
	var walking: bool = d.length() > 2 and g.wait <= 0
	if walking:
		var np: Vector2 = g.pos + d.normalized() * minf(step, d.length())
		if nav.walkable(np, 5):
			g.pos = np
		else:
			g.wait = 0.5
		g.sprite.flip_h = d.x > 0
	elif g.wait <= 0:
		g.wait = 1.5 + randf() * 3.0
		var a: Rect2i = g.area
		g.target = Vector2((a.position.x + randf() * a.size.x) * TILE, (a.position.y + randf() * a.size.y) * TILE)
	var bob := roundi(absf(sin(g.t * 12.0))) if walking else 0
	g.sprite.position = g.pos.round() - Vector2(0, bob)
	g.hs.rect = Rect2(g.pos + Vector2(-12, -26), Vector2(24, 28))
	g.hs.approach = g.pos + Vector2(0, 10)


func _scare_goose() -> void:
	var g := goose
	g.flee = 1.2
	g.wait = 0.0
	var a: Rect2i = g.area
	var fx2: float = g.pos.x + signf(g.pos.x - player.pos.x if g.pos.x != player.pos.x else 1.0) * 90.0
	var fy2: float = g.pos.y + signf(g.pos.y - player.pos.y if g.pos.y != player.pos.y else 1.0) * 50.0
	g.target = Vector2(clampf(fx2, a.position.x * TILE, a.end.x * TILE), clampf(fy2, a.position.y * TILE, a.end.y * TILE))


# ------------------------------------------------------------- the bridge
func _on_drops(drops: Array, origin: Variant) -> void:
	var o: Vector2 = player.pos
	if origin is Vector2:
		o = origin
	elif origin == "well":
		for h in hotspots:
			if h.target.get("action", "") == "well":
				o = h.node.global_position + Vector2(0, -20)
	ground_items.spawn(drops, o)


func _on_float_text(text: String, color: String, at: Variant) -> void:
	var p: Vector2 = at if at is Vector2 else player.pos
	fx.float_text(text, Color(color), p + Vector2(0, -58))
