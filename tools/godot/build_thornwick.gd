extends SceneTree
## Builds res://scenes/world/thornwick.tscn: the hub. Thornwick is a walled
## hamlet stuck in one endless night above the Sealed Stair, laid out like a
## Rogue Encampment: everything you need is a few steps from the campfire.
##   godot --headless --path . -s tools/godot/build_thornwick.gd
##
## North: the Sealed Stair (Captain Maren picks your floor). Around the square,
## each townsperson at their own door: Varn's tower (identify, Codex),
## Brannoc's forge (sockets, crucible), Ysolde's cottage (the flask), Pell's
## trading post, Odo's wagon. The stash sits by the fire. South: the gate,
## which no longer opens.
## Re-running this script OVERWRITES edits made to the scene in the editor.

const W := 34
const H := 27
const TILE := 32
const OUT := "res://scenes/world/thornwick.tscn"

const GRASS := 0
const WATER := 1
const DIRT := 2
const COBBLE := 3
## Higher wins at shared vertices (features spread over grass).
const PRIORITY := {GRASS: 0, WATER: 1, DIRT: 2, COBBLE: 3}
## [tileset atlas, source id, lower terrain, upper terrain]
const PAIRS := [
	["grass_dirt", 0, GRASS, DIRT],
	["grass_cobble", 1, GRASS, COBBLE],
	["water_grass", 2, WATER, GRASS],
]
const NPC_SHEETS := {
	"varn": "npc_lore", "brannoc": "npc_smith", "pell": "npc_trader",
	"ysolde": "npc_herbalist", "odo": "npc_gambler", "maren": "npc_captain",
}

var cells := PackedInt32Array()
var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/art/art_meta.json"))
var blocked := PackedByteArray()
var rng := RandomNumberGenerator.new()
var tile_rng := RandomNumberGenerator.new()
var names := {}


## Atlas coords of the tile with these corners. Plain tiles have mirrored
## variants ("v" in art_meta); pick one at random so the ground doesn't grid.
func tile_coords(tileset: String, key: String) -> Vector2i:
	var found: Array[Vector2i] = []
	for e in meta.tiles[tileset].tiles:
		if e.key == key:
			found.append(Vector2i(int(e.i) % 4, int(e.i) / 4))
	if found.is_empty():
		return Vector2i(-1, -1)
	return found[tile_rng.randi_range(0, found.size() - 1)]


# ------------------------------------------------------------ terrain paint
func get_t(x: int, y: int) -> int:
	if x < 0 or y < 0 or x >= W or y >= H:
		return GRASS
	return cells[y * W + x]


func set_t(x: int, y: int, t: int) -> void:
	if x >= 0 and y >= 0 and x < W and y < H:
		cells[y * W + x] = t


func rect(x0: int, y0: int, x1: int, y1: int, t: int) -> void:
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			set_t(x, y, t)


func ellipse(cx: float, cy: float, rx: float, ry: float, t: int) -> void:
	for y in range(floori(cy - ry), ceili(cy + ry) + 1):
		for x in range(floori(cx - rx), ceili(cx + rx) + 1):
			if pow((x - cx) / rx, 2) + pow((y - cy) / ry, 2) <= 1.0:
				set_t(x, y, t)


## A filled rectangle with its four corner cells left out (soft corners once
## the corner tiles round them off).
func plaza(x0: int, y0: int, x1: int, y1: int, t: int) -> void:
	rect(x0, y0, x1, y1, t)
	for c in [Vector2i(x0, y0), Vector2i(x1, y0), Vector2i(x0, y1), Vector2i(x1, y1)]:
		set_t(c.x, c.y, GRASS)


func paint() -> void:
	cells.resize(W * H)
	cells.fill(GRASS)
	# The square, and the Stair's forecourt north of it: old flagstones.
	plaza(11, 12, 23, 20, COBBLE)
	plaza(13, 6, 21, 11, COBBLE)
	# Worn mud from the square to every door, and the south road.
	rect(6, 11, 10, 12, DIRT) # Varn's tower
	rect(24, 12, 27, 13, DIRT) # the forge
	rect(7, 20, 10, 21, DIRT) # Ysolde's cottage
	rect(24, 20, 27, 21, DIRT) # Pell's
	rect(16, 21, 17, H - 1, DIRT) # to the gate
	rect(18, 22, 21, 23, DIRT) # Odo's wagon


## Vertex terrain = strongest of the 4 surrounding cells (water only if all are water).
func vertex(vx: int, vy: int) -> int:
	var best := GRASS
	var bp := -1
	var all_water := true
	for d in [Vector2i(-1, -1), Vector2i(0, -1), Vector2i(-1, 0), Vector2i(0, 0)]:
		var x: int = vx + d.x
		var y: int = vy + d.y
		var t := get_t(x, y)
		if t != WATER:
			all_water = false
		if x < 0 or y < 0 or x >= W or y >= H:
			continue
		if PRIORITY[t] > bp:
			bp = PRIORITY[t]
			best = t
	if best == WATER and not all_water:
		return GRASS
	return best


func uniq(a: Array) -> Array:
	var out := []
	for v in a:
		if not out.has(v):
			out.append(v)
	return out


## [source id, atlas coords] for a cell's 4 corner terrains (NW NE SW SE).
func tile_for(corners: Array) -> Array:
	var u := uniq(corners)
	while u.size() > 2:
		u.sort_custom(func(a, b): return PRIORITY[a] < PRIORITY[b])
		var weakest: int = u[1] if u[0] == WATER else u[0]
		var stronger := GRASS
		for t in u:
			if PRIORITY[t] > PRIORITY[weakest] and t != WATER:
				stronger = t
				break
		corners = corners.map(func(c): return stronger if c == weakest else c)
		u = uniq(corners)
	if u.size() == 2 and u.has(DIRT) and u.has(COBBLE):
		corners = corners.map(func(c): return COBBLE if c == DIRT else c)
		u = [COBBLE]
	if u.size() == 2 and u.has(WATER) and not u.has(GRASS):
		corners = corners.map(func(c): return c if c == WATER else GRASS)
		u = uniq(corners)
	if u.size() == 1:
		match u[0]:
			GRASS:
				return [0, tile_coords("grass_dirt", "0000")]
			DIRT:
				return [0, tile_coords("grass_dirt", "1111")]
			COBBLE:
				return [1, tile_coords("grass_cobble", "1111")]
			_:
				return [2, tile_coords("water_grass", "0000")]
	for p in PAIRS:
		if u.has(p[2]) and u.has(p[3]):
			var key := "".join(corners.map(func(c): return "1" if c == p[3] else "0"))
			return [p[1], tile_coords(p[0], key)]
	return [0, tile_coords("grass_dirt", "0000")]


# ------------------------------------------------------------------- nodes
func unique_name(base: String) -> String:
	var n: int = names.get(base, 0) + 1
	names[base] = n
	return base if n == 1 else "%s%d" % [base, n]


func own(node: Node, root: Node) -> void:
	node.owner = root
	for c in node.get_children():
		own(c, root)


func add_prop(parent: Node, art: String, x: float, y: float, opts := {}) -> Prop:
	var p := Prop.new()
	p.name = unique_name(opts.get("node", art.to_pascal_case()))
	p.art = art
	p.position = Vector2(roundf(x * TILE), roundf(y * TILE))
	p.block = opts.get("block", Vector2i.ZERO)
	p.action = opts.get("action", "none")
	p.display_name = opts.get("name", "")
	p.mirrored = opts.get("flip", false)
	if opts.has("approach_dy"):
		p.approach_dy = opts.approach_dy
	parent.add_child(p)
	if p.block != Vector2i.ZERO:
		var fp := p.footprint()
		for cy in range(fp.position.y, fp.end.y):
			for cx in range(fp.position.x, fp.end.x):
				if cx >= 0 and cy >= 0 and cx < W and cy < H:
					blocked[cy * W + cx] = 1
	return p


func _initialize() -> void:
	rng.seed = 1337
	tile_rng.seed = 4242
	paint()
	blocked.resize(W * H)
	blocked.fill(0)

	var root := Zone.new()
	root.name = "Thornwick"
	root.zone_name = "Thornwick"
	root.level = 1
	root.fog_density = 0.16

	var ground := TileMapLayer.new()
	ground.name = "Ground"
	ground.tile_set = load("res://assets/tiles/terrain.tres")
	root.add_child(ground)
	for y in H:
		for x in W:
			var t := tile_for([vertex(x, y), vertex(x + 1, y), vertex(x, y + 1), vertex(x + 1, y + 1)])
			ground.set_cell(Vector2i(x, y), t[0], t[1])

	var decals := Node2D.new()
	decals.name = "Decals"
	root.add_child(decals)
	var things := Node2D.new()
	things.name = "Things"
	things.y_sort_enabled = true
	root.add_child(things)
	var items := Node2D.new()
	items.name = "Items"
	root.add_child(items)
	var blockers := Node2D.new()
	blockers.name = "Blockers"
	root.add_child(blockers)

	# ---- the Sealed Stair, north
	add_prop(things, "pit_entrance", 17, 8.6, {"node": "SealedStair", "block": Vector2i(5, 2), "action": "stair", "name": "The Sealed Stair"})
	for x in [13.6, 20.4]:
		add_prop(things, "brazier", x, 9.6, {"node": "Brazier", "block": Vector2i(1, 1)})

	# ---- the townsfolk's doors, all facing the square
	add_prop(things, "lore_tower", 7.5, 10.4, {"node": "VarnsTower", "block": Vector2i(3, 2), "name": "Varn's Tower"})
	add_prop(things, "smithy", 27.5, 11.6, {"node": "Smithy", "block": Vector2i(6, 3), "name": "Brannoc's Forge"})
	add_prop(things, "herbalist", 7.2, 19.4, {"node": "HerbalistCottage", "block": Vector2i(5, 3), "name": "Ysolde's Cottage"})
	add_prop(things, "trader", 27.5, 19.4, {"node": "TradingPost", "block": Vector2i(5, 3), "name": "Pell's Trading Post"})
	add_prop(things, "gambler_wagon", 21.6, 24.4, {"node": "OdosWagon", "block": Vector2i(3, 2), "name": "Odo's Wagon"})
	add_prop(things, "gate", 17, H + 0.4, {"node": "SouthGate", "block": Vector2i(6, 1), "action": "statue", "name": "South Gate (it no longer opens)", "approach_dy": -2.0})

	# ---- the square: stash by the fire, Aldra's statue, lanterns at the corners
	add_prop(things, "strongbox", 15.9, 16.6, {"node": "Stash", "block": Vector2i(1, 1), "action": "stash", "name": "Your Stash"})
	add_prop(things, "campfire", 18.1, 16.7, {"node": "Campfire", "block": Vector2i(1, 1), "name": "Campfire"})
	add_prop(things, "statue", 13.2, 13.6, {"node": "Statue", "block": Vector2i(1, 1), "action": "statue", "name": "Statue of Aldra Thornwick"})
	for p in [Vector2(11.5, 12.6), Vector2(22.5, 12.6), Vector2(11.5, 20.4), Vector2(22.5, 20.4), Vector2(15.4, 24.2), Vector2(18.6, 24.2)]:
		add_prop(things, "lamp_post", p.x, p.y, {"node": "Lantern", "block": Vector2i(1, 1)})
	for x in [14.9, 19.1]:
		add_prop(things, "banner", x, 26.2, {"node": "Banner", "block": Vector2i(1, 1)})

	# ---- work clutter, where the work happens
	for c in [
		["barrel", 22.8, 10.6], ["barrel", 23.5, 11.0], ["crates", 31.4, 12.6], # forge
		["crates", 23.6, 18.6], ["barrel", 31.2, 20.4], ["cart", 31.0, 22.6], # trader
		["hay", 3.8, 20.6], ["mushrooms", 10.4, 17.6], ["flowers", 4.2, 17.4], # herbalist's garden
		["crates", 4.6, 11.4], ["rocks_small", 10.8, 7.2], # tower
		["market_stall", 12.6, 23.6], ["barrel", 10.4, 23.0], # south market
	]:
		add_prop(things, c[0], c[1], c[2], {"block": Vector2i(2, 1) if c[0] in ["cart", "market_stall"] else Vector2i(1, 1)})
	for c in [["fence", 3.6, 22.4], ["fence", 5.6, 22.4], ["fence", 28.6, 23.6], ["fence", 30.6, 23.6]]:
		add_prop(things, c[0], c[1], c[2], {"block": Vector2i(2, 1)})

	# ---- the forest that walls the town in
	var tree_at := func(x: float, y: float) -> void:
		var roll := rng.randf()
		var art := "tree_pine" if roll < 0.62 else "tree_oak" if roll < 0.9 else "tree_dead"
		if rng.randf() < 0.5:
			art += "_b"
		var p := add_prop(things, art, x + rng.randi_range(-6, 6) / 32.0, y + rng.randi_range(-4, 4) / 32.0, {"node": "EdgeTree"})
		p.mirrored = rng.randf() < 0.5
	var x := 0.0
	while x <= W:
		if x < 12 or x > 22:
			tree_at.call(x, 1.4)
		if x < 13 or x > 21:
			tree_at.call(x + 0.8, H + 0.3)
		x += 1.7
	var y := 3.0
	while y <= H:
		tree_at.call(0.8, y)
		tree_at.call(W - 0.8, y)
		y += 1.8
	for t in [[3.0, 15.2, "tree_oak"], [31.2, 15.6, "tree_oak_b"], [2.6, 25.0, "tree_pine_b"], [31.6, 26.0, "tree_pine"], [11.6, 3.6, "tree_pine"], [22.6, 3.4, "tree_pine_b"]]:
		add_prop(things, t[2], t[0], t[1], {"node": "Tree", "block": Vector2i(1, 1)})
	for b in [[0, 0, W, 2], [0, 0, 2, H], [W - 2, 0, 2, H], [0, H - 1, W, 1]]:
		var bl := Blocker.new()
		bl.name = unique_name("Wall")
		bl.position = Vector2(b[0] * TILE, b[1] * TILE)
		bl.size = Vector2i(b[2], b[3])
		blockers.add_child(bl)

	# ---- a little life on the open grass, kept off the paths
	var decor := ["grass_tuft", "grass_tuft", "flowers", "rocks_small", "mushrooms"]
	for cy in range(3, H - 2):
		for cx in range(3, W - 3):
			if get_t(cx, cy) != GRASS or blocked[cy * W + cx] == 1 or rng.randf() >= 0.05:
				continue
			var near_road := false
			for dy in [-1, 0, 1]:
				for dx in [-1, 0, 1]:
					if get_t(cx + dx, cy + dy) != GRASS:
						near_road = true
			if near_road:
				continue
			add_prop(decals, decor[rng.randi_range(0, decor.size() - 1)], cx + 0.5 + rng.randi_range(-8, 8) / 32.0, cy + 0.875, {"node": "Decor"})

	# ---- the townsfolk
	for n in [["maren", 21.9, 10.7], ["varn", 10.6, 12.0], ["brannoc", 23.9, 13.0], ["ysolde", 10.6, 20.8], ["pell", 24.0, 20.9], ["odo", 19.4, 23.4]]:
		var s := NpcSpot.new()
		s.name = String(n[0]).capitalize()
		s.npc_id = n[0]
		s.sheet = NPC_SHEETS[n[0]]
		s.position = Vector2(roundf(n[1] * TILE), roundf(n[2] * TILE))
		things.add_child(s)

	var spawn := Marker2D.new()
	spawn.name = "Spawn"
	spawn.position = Vector2(17 * TILE, 18.6 * TILE)
	root.add_child(spawn)

	for c in root.get_children():
		c.owner = root
		own(c, root)
	var ps := PackedScene.new()
	var err := ps.pack(root)
	if err == OK:
		err = ResourceSaver.save(ps, OUT)
	print("thornwick.tscn: ", error_string(err), " nodes=", _count(root))
	root.free()
	quit()


func _count(n: Node) -> int:
	var c := 1
	for ch in n.get_children():
		c += _count(ch)
	return c
