class_name ArenaBuilder
## Builds one floor of the Sealed Stair as a Zone: a single walled room about
## the size of an Infernal Hordes arena (roughly two screens across), dark,
## lit by wall torches and braziers.
##
## Top-down oblique, like a 16-bit ARPG: the floor is seen from straight above,
## walls are blocks. North walls show a two-tile brick face under a dark cap;
## side and south walls show their cap with a lit rim; walls shade the floor.
## Rooms are axis-aligned (no diagonal steps). Tiles: assets/art/tiles/
## dungeon_walls.png, drawn by tools/art/dungeon_walls.py (layout documented
## there). Zone meta the Arena reads: spawns (Array[Vector2]), center, entry, door (Prop).

const W := 42
const H := 32
const TILE := 32
const SHAPES := ["hall", "cross", "court"]
const VOID := 0
const FLOOR := 1
const WALL := 2

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


static func build(floor: int) -> Zone:
	tileset()
	var rng := RandomNumberGenerator.new()
	rng.randomize()
	var shape: String = SHAPES[(floor - 1) % SHAPES.size()]
	var zone := Zone.new()
	zone.name = "Floor%d" % floor
	zone.zone_name = "The Sealed Stair"
	zone.level = floor
	zone.ambient = Color(0.30, 0.29, 0.36)
	zone.fog_density = 0.10
	zone.hero_light = 170.0

	var g := _grid(shape)
	var kind := func(cx: int, cy: int) -> int:
		return g[cy][cx] if cx >= 0 and cy >= 0 and cx < W and cy < H else VOID
	# A wall cell is face if the floor is one (lower) or two (upper) rows below.
	var face := func(cx: int, cy: int) -> int:
		if kind.call(cx, cy) != WALL:
			return -1
		if kind.call(cx, cy + 1) == FLOOR:
			return 1
		if kind.call(cx, cy + 1) == WALL and kind.call(cx, cy + 2) == FLOOR:
			return 0
		return -1
	var lower := func(cx: int, cy: int) -> bool: return kind.call(cx, cy) == FLOOR or face.call(cx, cy) >= 0

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
				if kind.call(x, y - 1) == WALL:
					m |= 1
				if kind.call(x + 1, y) == WALL:
					m |= 2
				if kind.call(x, y + 1) == WALL:
					m |= 4
				if kind.call(x - 1, y) == WALL:
					m |= 8
				if m != 0:
					shade.set_cell(c, 0, _at(56 + m))
			elif k == WALL:
				var part: int = face.call(x, y)
				if part >= 0:
					var ends := 0
					if face.call(x - 1, y) != part:
						ends |= 1
					if face.call(x + 1, y) != part:
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
	var decals := Node2D.new()
	decals.name = "Decals"
	zone.add_child(decals)
	var things := Node2D.new()
	things.name = "Things"
	things.y_sort_enabled = true
	zone.add_child(things)
	var items := Node2D.new()
	items.name = "Items"
	zone.add_child(items)
	var blockers := Node2D.new()
	blockers.name = "Blockers"
	zone.add_child(blockers)
	# Walls: one Blocker per horizontal run of blocked cells.
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

	var floor_at := func(cx: int, cy: int) -> bool: return kind.call(cx, cy) == FLOOR
	# The north wall: first floor row under the face, at the middle.
	var mid := W / 2
	var top := 0
	while top < H and not floor_at.call(mid, top):
		top += 1
	var bottom := H - 1
	while bottom > 0 and not floor_at.call(mid, bottom):
		bottom -= 1
	var center := Vector2(mid * TILE, (top + bottom) * TILE / 2.0)

	var door := _prop(things, "door_sealed", mid, top + 0.05, Vector2i(3, 1))
	door.display_name = "Sealed Door"
	zone.set_meta("door", door)
	zone.set_meta("center", center)
	zone.set_meta("entry", Vector2(mid * TILE, (bottom - 1) * TILE))

	# Wall torches along the north face, braziers by the door.
	for x in range(3, W - 3, 5):
		if absi(x - mid) < 3:
			continue
		var fy := top
		while fy < H and not floor_at.call(x, fy):
			fy += 1
		if fy < H - 2 and fy - top <= 4 and floor_at.call(x, fy):
			_prop(things, "wall_torch", x + 0.5, fy - 0.55, Vector2i.ZERO)
	for dx in [-3, 3]:
		_prop(things, "brazier", mid + dx + 0.5, top + 1.2, Vector2i(1, 1))
	# Pillars on the shoulders of the room (cover, not a maze); the court has its islands.
	for p in ([] if shape == "court" else [Vector2(-9, 0.32), Vector2(9, 0.32), Vector2(-9, 0.72), Vector2(9, 0.72)]):
		var px := mid + int(p.x)
		var py := int(lerpf(top, bottom, p.y))
		if floor_at.call(px, py) and floor_at.call(px, py - 1):
			var pil := _prop(things, "pillar", px + 0.5, py + 0.9, Vector2i(1, 1))
			pil.modulate = Color(0.72, 0.72, 0.78) # the room's darker stone
	# Spawn circles: the room's four quarters.
	var spawns: Array = []
	for p in [Vector2(0.22, 0.30), Vector2(0.78, 0.30), Vector2(0.20, 0.72), Vector2(0.80, 0.72)]:
		var sx := roundi(lerpf(4, W - 4, p.x))
		var sy := roundi(lerpf(top, bottom, p.y))
		while not floor_at.call(sx, sy) and sx != mid:
			sx += 1 if sx < mid else -1
		var at := Vector2(sx * TILE + 16, sy * TILE + 16)
		spawns.append(at)
		var c := _prop(decals, "summon_circle", at.x / TILE, at.y / TILE + 1.0, Vector2i.ZERO)
		c.modulate = Color(1, 1, 1, 0.85)
	zone.set_meta("spawns", spawns)
	# Old bones, blood and rubble: along the walls and in corners, not the middle.
	var decor := ["bones", "skull_pile", "blood_pool", "rubble", "bones"]
	var placed := 0
	for i in 60:
		if placed >= 12:
			break
		var cx := rng.randi_range(2, W - 3)
		var cy := rng.randi_range(top, bottom)
		if not floor_at.call(cx, cy) or Vector2(cx * TILE, cy * TILE).distance_to(center) < 7 * TILE:
			continue
		var near_wall := false
		for d in [Vector2i(-2, 0), Vector2i(2, 0), Vector2i(0, -2), Vector2i(0, 2)]:
			if not floor_at.call(cx + d.x, cy + d.y):
				near_wall = true
		if not near_wall:
			continue
		var art: String = decor[rng.randi_range(0, decor.size() - 1)]
		var d := _prop(decals if art == "blood_pool" else things, art, cx + rng.randf_range(0.2, 0.8), cy + 0.9, Vector2i.ZERO)
		d.mirrored = rng.randf() < 0.5
		placed += 1

	var spawn := Marker2D.new()
	spawn.name = "Spawn"
	spawn.position = zone.get_meta("entry")
	zone.add_child(spawn)
	return zone


static func _prop(parent: Node, art: String, x: float, y: float, block: Vector2i) -> Prop:
	var p := Prop.new()
	p.art = art
	p.position = Vector2(roundf(x * TILE), roundf(y * TILE))
	p.block = block
	parent.add_child(p)
	return p
