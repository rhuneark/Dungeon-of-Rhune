class_name ArenaBuilder
## Builds one floor of the Sealed Stair as a Zone: a single walled room about
## the size of an Infernal Hordes arena (roughly two screens across), dark,
## lit by wall torches and braziers.
##
## Tiles come from the "dungeon" cliff set: floor (0) inside, rock (1) around,
## and the brick wall face (2) on the two rows under every rock edge, so the
## north walls show their face and the others only their lit rim.
## Zone meta the Arena reads: spawns (Array[Vector2]), center, entry, door (Prop).

const W := 42
const H := 32
const TILE := 32
const SHAPES := ["hall", "round", "cross"]

static var _tileset: TileSet
static var _keys := {} # "0102" -> Array[Vector2i] atlas coords


static func tileset() -> TileSet:
	if _tileset:
		return _tileset
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE, TILE)
	var src := TileSetAtlasSource.new()
	src.texture = Art.tile_texture("dungeon")
	src.texture_region_size = Vector2i(TILE, TILE)
	ts.add_source(src, 0)
	for e in Art.meta.tiles.get("dungeon", {}).get("tiles", []):
		var c := Vector2i(int(e.i) % 4, int(e.i) / 4)
		src.create_tile(c)
		if not _keys.has(e.key):
			_keys[e.key] = []
		_keys[e.key].append(c)
	_tileset = ts
	return ts


## Atlas coords for a corner key; unknown combos fall back to the nearest the set has.
static func _coords(key: String, rng: RandomNumberGenerator) -> Vector2i:
	for k in [key, key.replace("2", "0"), key.replace("2", "1"), "0000"]:
		if _keys.has(k):
			var arr: Array = _keys[k]
			return arr[rng.randi_range(0, arr.size() - 1)]
	return Vector2i.ZERO


static func _inside(shape: String, x: float, y: float) -> bool:
	match shape:
		"round":
			return pow((x - 21.0) / 16.5, 2) + pow((y - 17.0) / 11.0, 2) <= 1.0
		"cross":
			return (x >= 5 and x <= 37 and y >= 11 and y <= 23) or (x >= 13 and x <= 29 and y >= 6 and y <= 28)
	# hall: a long room with its corners cut
	if x < 5 or x > 37 or y < 6 or y > 28:
		return false
	var cx := minf(x - 5, 37 - x)
	var cy := minf(y - 6, 28 - y)
	return cx + cy >= 3


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

	# Vertex terrain: 0 floor, 1 rock; floor vertices under rock become wall face (2).
	var v: Array = []
	for y in H + 1:
		var row: Array = []
		for x in W + 1:
			row.append(0 if _inside(shape, x, y) else 1)
		v.append(row)
	for y in range(1, H + 1):
		for x in W + 1:
			if v[y][x] == 0 and v[y - 1][x] == 1:
				v[y][x] = 2

	var ground := TileMapLayer.new()
	ground.name = "Ground"
	ground.tile_set = _tileset
	zone.add_child(ground)
	var blocked := {}
	for y in H:
		for x in W:
			var key := "%d%d%d%d" % [v[y][x], v[y][x + 1], v[y + 1][x], v[y + 1][x + 1]]
			ground.set_cell(Vector2i(x, y), 0, _coords(key, rng))
			if key != "0000":
				blocked[Vector2i(x, y)] = true
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

	var floor_at := func(cx: int, cy: int) -> bool: return cx >= 0 and cy >= 0 and cx < W and cy < H and not blocked.has(Vector2i(cx, cy))
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
			_prop(things, "wall_torch", x + 0.5, fy - 0.35, Vector2i.ZERO)
	for dx in [-3, 3]:
		_prop(things, "brazier", mid + dx + 0.5, top + 1.2, Vector2i(1, 1))
	# Chains and pillars: pillars on the shoulders of the room (cover, not a maze).
	for p in [Vector2(-9, 0.32), Vector2(9, 0.32), Vector2(-9, 0.72), Vector2(9, 0.72)]:
		var px := mid + int(p.x)
		var py := int(lerpf(top, bottom, p.y))
		if floor_at.call(px, py) and floor_at.call(px, py - 1):
			_prop(things, "pillar", px + 0.5, py + 0.9, Vector2i(1, 1))
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
