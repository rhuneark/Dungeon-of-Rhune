class_name ArenaBuilder
## Builds the dungeon's rooms as Zones at runtime, all from one wall set: the
## Refuge (the hub, where the townsfolk hold out) and every expedition room,
## dressed by its type (Expeditions.ROOMS: wall art, props, light colour).
##
## Top-down oblique, like a 16-bit ARPG: the floor is seen from straight above,
## walls are blocks. North walls show a two-tile brick face under a dark cap;
## side and south walls show their cap with a lit rim; walls shade the floor.
## Rooms are axis-aligned (no diagonal steps). Tiles: assets/art/tiles/
## dungeon_walls.png, drawn by tools/art/dungeon_walls.py (layout documented
## there). Zone meta: grid, top, bottom, mid, center, entry, door (Prop),
## spawns (Array[Vector2], rooms only).

const W := 42
const H := 32
const TILE := 32
const SHAPES := ["hall", "cross", "court"]
const VOID := 0
const FLOOR := 1
const WALL := 2
const DUNGEON_AMBIENT := Color(0.30, 0.29, 0.36)
## Theme props that stand on the room's shoulders (blocking); the rest are scattered.
const TALL := {"statue": Vector2i(1, 1), "rune_stone": Vector2i(1, 1), "reliquary": Vector2i(1, 1), "weapon_rack": Vector2i(1, 1),
	"altar": Vector2i(2, 1), "holy_basin": Vector2i(1, 1), "dungeon_chest": Vector2i(1, 1)}

static var _tileset: TileSet


static func tileset() -> TileSet:
	if _tileset:
		return _tileset
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE, TILE)
	var src := TileSetAtlasSource.new()
	src.texture = Art.tile_texture("dungeon_walls")
	src.texture_region_size = Vector2i(TILE, TILE)
	ts.add_source(src, 0)
	for i in 72:
		src.create_tile(_at(i))
	_tileset = ts
	return ts


static func _at(i: int) -> Vector2i:
	return Vector2i(i % 8, i / 8)


static func _inside(shape: String, x: int, y: int) -> bool:
	match shape:
		"refuge":
			return x >= 9 and x <= 32 and y >= 7 and y <= 23
		"cross":
			return (x >= 5 and x <= 36 and y >= 11 and y <= 22) or (x >= 13 and x <= 28 and y >= 5 and y <= 27)
		"court":
			if x < 5 or x > 36 or y < 5 or y > 27:
				return false
			# Four stone islands to fight around.
			for c in [Vector2i(11, 10), Vector2i(28, 10), Vector2i(11, 20), Vector2i(28, 20)]:
				if x >= c.x and x <= c.x + 2 and y >= c.y and y <= c.y + 2:
					return false
			return true
	# hall: a long room with a bay on each side
	return (x >= 7 and x <= 34 and y >= 5 and y <= 27) or (x >= 3 and x <= 38 and y >= 12 and y <= 20)


## Cell kinds: FLOOR inside, WALL within reach of the floor (three rows above
## it for the face + cap, two elsewhere), VOID beyond.
static func _grid(shape: String) -> Array:
	var g: Array = []
	for y in H:
		var row: Array = []
		for x in W:
			row.append(FLOOR if _inside(shape, x, y) else VOID)
		g.append(row)
	for y in H:
		for x in W:
			if g[y][x] != VOID:
				continue
			var near := false
			for dy in range(-2, 4):
				for dx in range(-2, 3):
					var nx := x + dx
					var ny := y + dy
					if nx >= 0 and ny >= 0 and nx < W and ny < H and _inside(shape, nx, ny):
						near = true
			if near:
				g[y][x] = WALL
	return g


static func _kind(g: Array, x: int, y: int) -> int:
	return g[y][x] if x >= 0 and y >= 0 and x < W and y < H else VOID


static func is_floor(z: Zone, x: int, y: int) -> bool:
	return _kind(z.get_meta("grid"), x, y) == FLOOR


## A wall cell is face if the floor is one (lower) or two (upper) rows below.
static func _face(g: Array, x: int, y: int) -> int:
	if _kind(g, x, y) != WALL:
		return -1
	if _kind(g, x, y + 1) == FLOOR:
		return 1
	if _kind(g, x, y + 1) == WALL and _kind(g, x, y + 2) == FLOOR:
		return 0
	return -1


# ------------------------------------------------------------- the shell
## Tiles, layers, blockers and the room's landmarks for a shape.
static func _shell(shape: String, rng: RandomNumberGenerator) -> Zone:
	tileset()
	var zone := Zone.new()
	var g := _grid(shape)
	zone.set_meta("grid", g)
	var lower := func(cx: int, cy: int) -> bool: return _kind(g, cx, cy) == FLOOR or _face(g, cx, cy) >= 0

	var ground := TileMapLayer.new()
	ground.name = "Ground"
	ground.tile_set = _tileset
	zone.add_child(ground)
	var shade := TileMapLayer.new()
	shade.name = "Shade"
	shade.tile_set = _tileset
	zone.add_child(shade)
	var blocked := {}
	for y in H:
		for x in W:
			var k: int = g[y][x]
			var c := Vector2i(x, y)
			if k != FLOOR:
				blocked[c] = true
			if k == FLOOR:
				ground.set_cell(c, 0, _at(rng.randi_range(0, 7)))
				var m := 0
				if _kind(g, x, y - 1) == WALL:
					m |= 1
				if _kind(g, x + 1, y) == WALL:
					m |= 2
				if _kind(g, x, y + 1) == WALL:
					m |= 4
				if _kind(g, x - 1, y) == WALL:
					m |= 8
				if m != 0:
					shade.set_cell(c, 0, _at(56 + m))
			elif k == WALL:
				var part := _face(g, x, y)
				if part >= 0:
					var ends := 0
					if _face(g, x - 1, y) != part:
						ends |= 1
					if _face(g, x + 1, y) != part:
						ends |= 2
					ground.set_cell(c, 0, _at(40 + part * 8 + ends * 2 + rng.randi_range(0, 1)))
				else:
					var m := 0
					if lower.call(x, y - 1):
						m |= 1
					if lower.call(x + 1, y):
						m |= 2
					if lower.call(x, y + 1):
						m |= 4
					if lower.call(x - 1, y):
						m |= 8
					ground.set_cell(c, 0, _at(8 + m * 2 + rng.randi_range(0, 1)))
	for n in ["Decals", "Things", "Items", "Blockers"]:
		var node := Node2D.new()
		node.name = n
		if n == "Things":
			node.y_sort_enabled = true
		zone.add_child(node)
	# Walls: one Blocker per horizontal run of blocked cells.
	var blockers := zone.get_node("Blockers")
	for y in H:
		var x := 0
		while x < W:
			if not blocked.has(Vector2i(x, y)):
				x += 1
				continue
			var x0 := x
			while x < W and blocked.has(Vector2i(x, y)):
				x += 1
			var bl := Blocker.new()
			bl.position = Vector2(x0 * TILE, y * TILE)
			bl.size = Vector2i(x - x0, 1)
			blockers.add_child(bl)
	# Landmarks: the middle of the north wall, the floor's top and bottom rows.
	var mid := W / 2
	var top := 0
	while top < H and _kind(g, mid, top) != FLOOR:
		top += 1
	var bottom := H - 1
	while bottom > 0 and _kind(g, mid, bottom) != FLOOR:
		bottom -= 1
	zone.set_meta("mid", mid)
	zone.set_meta("top", top)
	zone.set_meta("bottom", bottom)
	zone.set_meta("center", Vector2(mid * TILE, (top + bottom) * TILE / 2.0))
	zone.set_meta("entry", Vector2(mid * TILE, (bottom - 1) * TILE))
	var spawn := Marker2D.new()
	spawn.name = "Spawn"
	spawn.position = zone.get_meta("entry")
	zone.add_child(spawn)
	return zone


## Torches (and the theme's wall art) along every north face, skipping the door.
static func _wall_decor(z: Zone, arts: Array, skip_from: int, skip_to: int) -> void:
	var things: Node = z.get_node("Things")
	var g: Array = z.get_meta("grid")
	var i := 0
	for x in range(3, W - 3, 3):
		if x >= skip_from and x <= skip_to:
			continue
		var fy := 0
		while fy < H and _kind(g, x, fy) != FLOOR:
			fy += 1
		if fy >= H - 2 or _face(g, x, fy - 1) != 1:
			continue
		var art: String = "wall_torch" if arts.is_empty() or i % 2 == 0 else arts[(i / 2) % arts.size()]
		_prop(things, art, x + 0.5, fy - (0.55 if art == "wall_torch" else 0.25), Vector2i.ZERO)
		i += 1


# -------------------------------------------------------- expedition rooms
static func build_room(e: Dictionary, n: Dictionary) -> Zone:
	var r := Expeditions.room(String(n.type))
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(String(n.id) + str(e.get("seed", 0)))
	var boss: bool = r.get("boss", false)
	var calm: bool = r.get("calm", false)
	var shape: String = "hall" if boss or calm else SHAPES[rng.randi_range(0, SHAPES.size() - 1)]
	var zone := _shell(shape, rng)
	zone.name = "Room_%s" % String(n.id)
	zone.zone_name = r.name
	zone.level = Expedition.level_of(int(e.tier), int(n.step))
	var tint := Color(String(r.color))
	zone.ambient = DUNGEON_AMBIENT.lerp(tint, 0.14)
	zone.fog_density = 0.10
	zone.hero_light = 170.0
	zone.set_meta("shape", shape)
	var things: Node = zone.get_node("Things")
	var decals: Node = zone.get_node("Decals")
	var mid: int = zone.get_meta("mid")
	var top: int = zone.get_meta("top")
	var bottom: int = zone.get_meta("bottom")
	var center: Vector2 = zone.get_meta("center")

	var door := _prop(things, "door_sealed", mid, top + 0.05, Vector2i(3, 1))
	door.display_name = "Sealed Door"
	zone.set_meta("door", door)
	_wall_decor(zone, r.get("wall", []), mid - 2, mid + 2)
	for dx in [-3, 3]:
		_prop(things, "brazier", mid + dx + 0.5, top + 1.2, Vector2i(1, 1))
	# The room's sigil, engraved in the middle of the floor in its colour.
	var sig := _prop(decals, "floor_sigil", center.x / TILE, center.y / TILE + 3.0, Vector2i.ZERO)
	sig.scale = Vector2(2, 2) # whole pixels: the sigil spans the middle of the room
	sig.modulate = Color(tint, 0.5)

	# Theme props: tall ones on the room's shoulders, low ones along the walls.
	var tall: Array = []
	var low: Array = []
	for p in r.get("props", []):
		if TALL.has(p):
			tall.append(p)
		else:
			low.append(p)
	if calm:
		_prop(things, tall[0] if not tall.is_empty() else "holy_basin", center.x / TILE, center.y / TILE + 0.5, Vector2i(1, 1))
		for dx in [-4, 4]:
			_prop(things, "brazier", center.x / TILE + dx, center.y / TILE + 0.5, Vector2i(1, 1))
	elif shape == "court":
		# The islands are the court's cover: its tall props flank the door instead.
		for i in tall.size() * 2:
			var px := mid + (-7 if i % 2 == 0 else 7) * (1 + i / 2)
			if is_floor(zone, px, top + 2) and is_floor(zone, px + 1, top + 2):
				_prop(things, tall[(i / 2) % tall.size()], px + 0.5, top + 2.9, TALL.get(tall[(i / 2) % tall.size()], Vector2i(1, 1)))
	else:
		var k := 0
		for p in [Vector2(-9, 0.32), Vector2(9, 0.32), Vector2(-9, 0.72), Vector2(9, 0.72)]:
			var px := mid + int(p.x)
			var py := int(lerpf(top, bottom, p.y))
			if is_floor(zone, px, py) and is_floor(zone, px, py - 1) and is_floor(zone, px + 1, py):
				var art: String = tall[k % tall.size()] if not tall.is_empty() else "pillar"
				var pr := _prop(things, art, px + 0.5, py + 0.9, TALL.get(art, Vector2i(1, 1)))
				if art == "pillar":
					pr.modulate = Color(0.72, 0.72, 0.78) # the room's darker stone
				k += 1
	if boss:
		_prop(things, "altar", mid, top + 3.5, Vector2i(2, 1))

	# Spawn circles: the room's four quarters.
	var spawns: Array = []
	if not calm:
		for p in [Vector2(0.22, 0.30), Vector2(0.78, 0.30), Vector2(0.20, 0.72), Vector2(0.80, 0.72)]:
			var sx := roundi(lerpf(4, W - 4, p.x))
			var sy := roundi(lerpf(top, bottom, p.y))
			while not is_floor(zone, sx, sy) and sx != mid:
				sx += 1 if sx < mid else -1
			var at := Vector2(sx * TILE + 16, sy * TILE + 16)
			spawns.append(at)
			var c := _prop(decals, "summon_circle", at.x / TILE, at.y / TILE + 1.0, Vector2i.ZERO)
			c.modulate = Color(1, 1, 1, 0.85)
	zone.set_meta("spawns", spawns)

	# Low theme props and old debris along the walls and in corners.
	var decor: Array = low.duplicate()
	var amount := 8 if not low.is_empty() else 0
	_scatter(zone, rng, decor, amount)
	_scatter(zone, rng, ["bones", "blood_pool", "rubble", "bones"], 2 if calm else 8)
	return zone


static func _scatter(zone: Zone, rng: RandomNumberGenerator, arts: Array, count: int) -> void:
	if arts.is_empty() or count <= 0:
		return
	var things: Node = zone.get_node("Things")
	var decals: Node = zone.get_node("Decals")
	var center: Vector2 = zone.get_meta("center")
	var top: int = zone.get_meta("top")
	var bottom: int = zone.get_meta("bottom")
	var placed := 0
	for i in 80:
		if placed >= count:
			break
		var cx := rng.randi_range(2, W - 3)
		var cy := rng.randi_range(top, bottom)
		if not is_floor(zone, cx, cy) or Vector2(cx * TILE, cy * TILE).distance_to(center) < 7 * TILE:
			continue
		var near_wall := false
		for d in [Vector2i(-2, 0), Vector2i(2, 0), Vector2i(0, -2), Vector2i(0, 2)]:
			if not is_floor(zone, cx + d.x, cy + d.y):
				near_wall = true
		if not near_wall:
			continue
		var art: String = arts[rng.randi_range(0, arts.size() - 1)]
		var d := _prop(decals if art == "blood_pool" else things, art, cx + rng.randf_range(0.2, 0.8), cy + 0.9, Vector2i.ZERO)
		d.mirrored = rng.randf() < 0.5
		placed += 1


# ------------------------------------------------------------- the Refuge
## Where everyone holds out: plain stone, a fire, the stash, each of the
## townsfolk at their own corner, Maren's map table by the Deep Gate.
static func build_refuge() -> Zone:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var zone := _shell("refuge", rng)
	zone.name = "Refuge"
	zone.zone_name = "The Refuge"
	zone.level = 1
	zone.ambient = Color(0.42, 0.38, 0.40)
	zone.fog_density = 0.06
	zone.hero_light = 150.0
	var things: Node = zone.get_node("Things")
	var mid: int = zone.get_meta("mid")
	var top: int = zone.get_meta("top")
	var bottom: int = zone.get_meta("bottom")
	var cy := int((top + bottom) / 2.0)

	var gate := _prop(things, "door_open", mid, top + 0.05, Vector2i(3, 1))
	gate.action = "stair"
	gate.display_name = "The Deep Gate"
	gate.approach_dy = 0.5
	zone.set_meta("door", gate)
	_wall_decor(zone, ["wall_banner", "wall_shelf"], mid - 2, mid + 2)
	for dx in [-3, 3]:
		_prop(things, "brazier", mid + dx + 0.5, top + 1.2, Vector2i(1, 1))
	var table := _prop(things, "map_table", mid, top + 4.0, Vector2i(2, 1))
	table.action = "map"
	table.display_name = "Map Table"
	table.approach_dy = 0.6
	_npc(things, "maren", "npc_captain", mid + 2.6, top + 4.2)

	# The hearth and the stash.
	# (Bases on a tile line: the approach point must fall outside the footprint.)
	_prop(things, "campfire", mid + 0.5, cy + 2.0, Vector2i(1, 1))
	var box := _prop(things, "strongbox", mid - 2.5, cy + 2.0, Vector2i(1, 1))
	box.action = "stash"
	box.display_name = "Strongbox"
	box.approach_dy = 0.6

	# West side: Varn's books and relics, Ysolde's basin and herbs.
	var west := 10.5
	_prop(things, "reliquary", west, top + 2.0, Vector2i(1, 1))
	_npc(things, "varn", "npc_lore", west + 1.8, top + 3.2)
	_prop(things, "holy_basin", west, cy + 4.5, Vector2i(1, 1))
	_npc(things, "ysolde", "npc_herbalist", west + 1.8, cy + 4.8)
	# East side: Brannoc's racks, Pell's crates, Odo's luck.
	var east := 31.5
	_prop(things, "weapon_rack", east, top + 2.0, Vector2i(1, 1))
	_npc(things, "brannoc", "npc_smith", east - 1.8, top + 3.2)
	_prop(things, "crates", east, cy + 1.0, Vector2i(1, 1))
	_prop(things, "barrel", east - 0.9, cy + 1.3, Vector2i.ZERO)
	_npc(things, "pell", "npc_trader", east - 1.8, cy + 1.6)
	_prop(things, "gold_pile", east, bottom - 0.4, Vector2i.ZERO)
	_npc(things, "odo", "npc_gambler", east - 1.8, bottom - 0.3)
	_scatter(zone, rng, ["bones", "rubble"], 3)
	zone.set_meta("spawns", [])
	return zone


static func _npc(parent: Node, id: String, sheet: String, x: float, y: float) -> void:
	var s := NpcSpot.new()
	s.name = id
	s.npc_id = id
	s.sheet = sheet
	s.position = Vector2(roundf(x * TILE), roundf(y * TILE))
	parent.add_child(s)


static func _prop(parent: Node, art: String, x: float, y: float, block: Vector2i) -> Prop:
	var p := Prop.new()
	p.art = art
	p.position = Vector2(roundf(x * TILE), roundf(y * TILE))
	p.block = block
	parent.add_child(p)
	return p
