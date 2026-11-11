extends SceneTree
## Builds res://assets/tiles/terrain.tres from the isometric corner atlases.
##   godot --headless --path . -s tools/godot/build_tileset.gd
##
## 2:1 isometric, 64x32 diamonds (TILE_LAYOUT_DIAMOND_DOWN; see Iso). One
## terrain set (Match Corners) with four terrains: paint with the Terrains tab
## of the TileMap editor and Godot picks the right transition tiles.

const TERRAINS := [
	["grass", Color(0.25, 0.55, 0.25)],
	["dirt", Color(0.55, 0.38, 0.2)],
	["cobble", Color(0.55, 0.55, 0.6)],
	["water", Color(0.2, 0.35, 0.6)],
]
## atlas name, source id, terrain of mask bit 1 (first), terrain of bit 0 (second)
const SETS := [
	["grass_dirt", 0, 0, 1],
	["grass_cobble", 1, 0, 2],
	["grass_water", 2, 0, 3],
	["dirt_cobble", 3, 1, 2],
]
## The plain tile of each terrain comes from one set; duplicates elsewhere are
## near-zero fallbacks so painting a solid area never mixes variants.
const PRIMARY := {0: "grass_dirt", 1: "grass_dirt", 2: "grass_cobble", 3: "grass_water"}
## Mask bits (NW<<3|NE<<2|SW<<1|SE) -> isometric corner neighbours.
const BITS := [
	[3, TileSet.CELL_NEIGHBOR_TOP_CORNER],
	[2, TileSet.CELL_NEIGHBOR_RIGHT_CORNER],
	[1, TileSet.CELL_NEIGHBOR_LEFT_CORNER],
	[0, TileSet.CELL_NEIGHBOR_BOTTOM_CORNER],
]


func _initialize() -> void:
	var ts := TileSet.new()
	ts.tile_shape = TileSet.TILE_SHAPE_ISOMETRIC
	ts.tile_layout = TileSet.TILE_LAYOUT_DIAMOND_DOWN
	ts.tile_size = Vector2i(64, 32)
	ts.add_terrain_set(0)
	ts.set_terrain_set_mode(0, TileSet.TERRAIN_MODE_MATCH_CORNERS)
	for i in TERRAINS.size():
		ts.add_terrain(0, i)
		ts.set_terrain_name(0, i, TERRAINS[i][0])
		ts.set_terrain_color(0, i, TERRAINS[i][1])
	for s in SETS:
		var name: String = s[0]
		var src := TileSetAtlasSource.new()
		src.texture = load("res://assets/art/tiles/%s.png" % name)
		src.texture_region_size = Vector2i(64, 32)
		ts.add_source(src, s[1])
		for mask in 16:
			var coords := Vector2i(mask % 4, mask / 4)
			src.create_tile(coords)
			var td := src.get_tile_data(coords, 0)
			td.terrain_set = 0
			var firsts := 0
			for b in BITS:
				var on: bool = (mask >> int(b[0])) & 1 == 1
				td.set_terrain_peering_bit(b[1], s[2] if on else s[3])
				if on:
					firsts += 1
			td.terrain = s[2] if firsts >= 2 else s[3]
			var solid := -1
			if mask == 15:
				solid = s[2]
			elif mask == 0:
				solid = s[3]
			if solid >= 0 and PRIMARY[solid] != name:
				td.probability = 0.001
	var err := ResourceSaver.save(ts, "res://assets/tiles/terrain.tres")
	print("terrain.tres saved: ", error_string(err))
	quit()
