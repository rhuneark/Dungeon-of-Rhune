extends SceneTree
## One-time converter: bakes the original Thornwick layout into an editable
## scene, res://scenes/world/thornwick.tscn.
##   godot --headless --path . -s tools/godot/build_thornwick.gd
##
## After this, the .tscn is the source of truth — edit it in the Godot editor.
## Re-running this script OVERWRITES those edits.

const W := 60
const H := 46
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
	# Old flagstones: the Sealed Stair's forecourt, the causeway down, the square.
	plaza(25, 3, 34, 10, COBBLE)
	rect(28, 11, 31, 18, COBBLE)
	plaza(22, 19, 37, 28, COBBLE)
	# Mud: the south road to the gate and a lane to every door.
	rect(28, 29, 30, H - 1, DIRT)
	rect(12, 26, 21, 27, DIRT) # smithy
	rect(38, 24, 48, 25, DIRT) # trading post
	rect(16, 16, 22, 18, DIRT) # tavern
	rect(37, 16, 41, 18, DIRT) # Varn's tower
	rect(16, 35, 27, 36, DIRT) # herbalist
	rect(32, 33, 41, 34, DIRT) # Odo's wagon
	rect(13, 6, 24, 7, DIRT) # to the chapel...
	rect(12, 6, 13, 10, DIRT)
	rect(7, 9, 13, 10, DIRT) # ...and along the graves
	# The marsh pond.
	ellipse(49, 35, 5.5, 3.6, WATER)


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
	for i in W * H:
		if cells[i] == WATER:
			blocked[i] = 1

	var root := Zone.new()
	root.name = "Thornwick"
	root.zone_name = "Thornwick"
	root.level = 1
	root.critter_area = Rect2i(42, 29, 14, 12)

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

	# ---- landmarks & buildings
	add_prop(things, "pit_entrance", 29.5, 9.5, {"node": "SealedStair", "block": Vector2i(5, 2), "action": "inspect", "name": "The Sealed Stair"})
	add_prop(things, "chapel", 9.2, 8.4, {"node": "Chapel", "block": Vector2i(5, 2), "name": "Chapel of the Thorn (ruined)"})
	add_prop(things, "tavern", 17.5, 16, {"node": "Tavern", "block": Vector2i(7, 3), "name": "The Crooked Lantern (closed)"})
	add_prop(things, "lore_tower", 41, 16, {"node": "VarnsTower", "block": Vector2i(3, 2), "name": "Varn's Tower"})
	add_prop(things, "smithy", 13, 25.5, {"node": "Smithy", "block": Vector2i(6, 3), "name": "Brannoc's Smithy"})
	add_prop(things, "trader", 47.5, 24, {"node": "TradingPost", "block": Vector2i(5, 3), "name": "Pell's Trading Post"})
	add_prop(things, "herbalist", 15.5, 35, {"node": "HerbalistCottage", "block": Vector2i(5, 3), "name": "Ysolde's Cottage"})
	add_prop(things, "gambler_wagon", 41.5, 33, {"node": "OdosWagon", "block": Vector2i(3, 2), "name": "Odo's Wagon"})
	add_prop(things, "house_a", 6.5, 32, {"node": "Cottage", "block": Vector2i(4, 2), "name": "Cottage"})
	add_prop(things, "house_b", 52, 14, {"node": "Cottage", "block": Vector2i(4, 2), "name": "Cottage"})
	add_prop(things, "house_a", 7.5, 42, {"node": "Cottage", "block": Vector2i(4, 2), "name": "Cottage", "flip": true})
	add_prop(things, "market_stall", 24, 30.5, {"node": "MarketStall", "block": Vector2i(4, 1), "name": "Market Stall"})
	add_prop(things, "gate", 29.5, H, {"node": "SouthGate", "block": Vector2i(6, 1), "action": "gate", "name": "South Gate", "approach_dy": -2.2})

	# ---- the square
	add_prop(things, "wishing_well", 30, 23.5, {"node": "WishingWell", "block": Vector2i(2, 1), "action": "well", "name": "Wishing Well"})
	add_prop(things, "notice_board", 34.5, 19.5, {"node": "NoticeBoard", "block": Vector2i(2, 1), "action": "quests", "name": "Notice Board"})
	add_prop(things, "statue", 24.5, 20.5, {"node": "Statue", "block": Vector2i(1, 1), "action": "statue", "name": "Statue of Aldra Thornwick"})
	add_prop(things, "strongbox", 26.5, 26.5, {"node": "Strongbox", "block": Vector2i(1, 1), "action": "stash", "name": "Your Strongbox"})
	var wp := add_prop(decals, "waypoint", 35, 27.5, {"node": "RhunestoneCircle", "action": "waypoint", "name": "Rhunestone Circle"})
	wp.approach_dy = -1.4

	# ---- clutter
	for p in [Vector2(27.5, 14), Vector2(32.5, 14), Vector2(21.5, 21.5), Vector2(38.5, 21.5), Vector2(27, 29.5), Vector2(33, 32), Vector2(33, 38)]:
		add_prop(things, "lamp_post", p.x, p.y, {"node": "Lantern", "block": Vector2i(1, 1), "name": "Street Lantern"})
	for p in [Vector2(26.2, 10.8), Vector2(32.8, 10.8)]:
		add_prop(things, "brazier", p.x, p.y, {"node": "Brazier", "block": Vector2i(1, 1), "name": "Brazier"})
	# The graveyard around the ruined chapel, walled on the south side.
	for g in [[4.6, 9.6, "grave_b"], [4.4, 12.2, "grave_a"], [6.6, 12.8, "grave_b"], [11.2, 13.6, "grave_a"], [12.4, 12.4, "grave_b"], [14.6, 12, "grave_a"]]:
		add_prop(things, g[2], g[0], g[1], {"node": "Grave", "block": Vector2i(1, 1), "name": "Old Grave"})
	for wl in [[4.5, 14.9], [10.4, 14.9]]:
		add_prop(things, "stone_wall", wl[0], wl[1], {"node": "GraveyardWall", "block": Vector2i(3, 1)})
	add_prop(things, "tree_dead", 2.6, 11.2, {"node": "DeadTree", "block": Vector2i(1, 1), "name": "Dead Tree"})
	add_prop(things, "tree_dead_b", 15.6, 9.8, {"node": "DeadTree", "block": Vector2i(1, 1), "name": "Dead Tree"})
	add_prop(things, "tree_dead", 53.4, 31.2, {"node": "DeadTree", "block": Vector2i(1, 1), "name": "Dead Tree"})
	for cr in [[7.4, 13.3, false], [27.4, 11.8, true], [3.4, 11.6, false], [34.6, 41.9, true]]:
		add_prop(things, "crow", cr[0], cr[1], {"node": "Crow", "flip": cr[2]})
	for st in [[3.6, 20.4], [56.4, 8.6], [56.2, 39.4], [21.2, 42.6], [44.6, 6.2]]:
		add_prop(things, "standing_stone", st[0], st[1], {"node": "StandingStone", "block": Vector2i(1, 1), "name": "Standing Stone"})
	for c in [
		["barrel", 17.6, 22.5, Vector2i(1, 1)], ["barrel", 18.5, 22.8, Vector2i(1, 1)], ["crates", 9.2, 26.6, Vector2i(1, 1)],
		["crates", 43.2, 25, Vector2i(1, 1)], ["barrel", 51.2, 24.8, Vector2i(1, 1)], ["cart", 51, 27.5, Vector2i(2, 1)],
		["hay", 10.5, 33, Vector2i(1, 1)], ["hay", 4, 34, Vector2i(1, 1)], ["fence", 12.5, 37.5, Vector2i(2, 1)],
		["fence", 18.8, 38, Vector2i(2, 1)], ["banner", 25.2, 41.5, Vector2i(1, 1)], ["banner", 33.8, 41.5, Vector2i(1, 1)],
		["barrel", 36.5, 30.5, Vector2i(1, 1)], ["bush", 21, 26.5, Vector2i(1, 1)], ["bush", 38.5, 26.5, Vector2i(1, 1)],
		["rock_big", 55, 30, Vector2i(1, 1)], ["rock_big", 44, 40, Vector2i(1, 1)],
		["tree_oak", 36, 12, Vector2i(1, 1)], ["tree_oak", 23, 13.4, Vector2i(1, 1)], ["tree_pine", 46, 9, Vector2i(1, 1)],
		["tree_oak_b", 54, 20, Vector2i(1, 1)], ["tree_pine_b", 6, 22, Vector2i(1, 1)], ["tree_oak", 23.5, 39.5, Vector2i(1, 1)],
		["tree_oak_b", 39, 41, Vector2i(1, 1)], ["tree_pine", 52, 41, Vector2i(1, 1)],
	]:
		add_prop(things, c[0], c[1], c[2], {"block": c[3]})
	add_prop(things, "campfire", 37, 40.5, {"node": "Campfire", "block": Vector2i(1, 1), "name": "Campfire"})
	add_prop(things, "signpost", 33, 29.5, {"node": "Signpost", "block": Vector2i(1, 1), "name": "Signpost: \"Wilds - south.  Pit - north.  Goose: everywhere.\""})

	# ---- forest edge: decorative trees + invisible walls around the map
	var tree_at := func(x: float, y: float) -> void:
		var roll := rng.randf()
		var art := "tree_pine" if roll < 0.62 else "tree_oak" if roll < 0.9 else "tree_dead"
		if rng.randf() < 0.5:
			art += "_b"
		var p := add_prop(things, art, x + rng.randi_range(-6, 6) / 32.0, y + rng.randi_range(-4, 4) / 32.0, {"node": "EdgeTree"})
		p.mirrored = rng.randf() < 0.5
	var x := 0.0
	while x <= W:
		tree_at.call(x, 1.6)
		if x < 25 or x > 35:
			tree_at.call(x + 0.8, H + 0.2)
		x += 1.6
	var y := 3.0
	while y <= H:
		tree_at.call(0.9, y)
		tree_at.call(W - 0.9, y)
		y += 1.7
	for b in [[0, 0, W, 2], [0, 0, 2, H], [W - 2, 0, 2, H], [0, H - 2, W, 2]]:
		var bl := Blocker.new()
		bl.name = unique_name("Wall")
		bl.position = Vector2(b[0] * TILE, b[1] * TILE)
		bl.size = Vector2i(b[2], b[3])
		blockers.add_child(bl)
		for cy in range(b[1], b[1] + b[3]):
			for cx in range(b[0], b[0] + b[2]):
				blocked[cy * W + cx] = 1

	# ---- scattered decor on open grass (flat, under everything)
	var decor := ["grass_tuft", "flowers", "mushrooms", "rocks_small", "grass_tuft", "grass_tuft", "bush"]
	for cy in range(2, H - 2):
		for cx in range(2, W - 2):
			if get_t(cx, cy) != GRASS or blocked[cy * W + cx] == 1 or rng.randf() >= 0.07:
				continue
			var near_road := false
			for dy in [-1, 0, 1]:
				for dx in [-1, 0, 1]:
					if get_t(cx + dx, cy + dy) != GRASS:
						near_road = true
			if near_road:
				continue
			add_prop(decals, decor[rng.randi_range(0, decor.size() - 1)], cx + 0.5 + rng.randi_range(-8, 8) / 32.0, cy + 0.875 + rng.randi_range(-6, 4) / 32.0, {"node": "Decor"})

	# ---- NPCs and placed items
	for n in [["varn", 41, 18], ["brannoc", 18, 25.6], ["pell", 45.5, 26], ["ysolde", 19.5, 36.5], ["odo", 38.5, 34.5], ["maren", 34.8, 39.6]]:
		var s := NpcSpot.new()
		s.name = String(n[0]).capitalize()
		s.npc_id = n[0]
		s.sheet = NPC_SHEETS[n[0]]
		s.position = Vector2(roundf(n[1] * TILE), roundf(n[2] * TILE))
		things.add_child(s)
	for it in [["page_graveyard", 10.7, 11.5], ["page_tavern", 22.8, 16.6], ["page_pond", 55.5, 34.5]]:
		var pi := PlacedItem.new()
		pi.name = unique_name("TornPage")
		pi.key = it[0]
		pi.base_id = "lore_page"
		pi.icon = "page"
		pi.position = Vector2(roundf(it[1] * TILE), roundf(it[2] * TILE))
		items.add_child(pi)

	var spawn := Marker2D.new()
	spawn.name = "Spawn"
	spawn.position = Vector2(30 * TILE, 36 * TILE)
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
