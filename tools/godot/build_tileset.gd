extends SceneTree
## Builds res://assets/tiles/terrain.tres from the generated Wang atlases.
##   godot --headless --path . -s tools/godot/build_tileset.gd
##
## One terrain set (Match Corners) with four terrains. Paint with the Terrains
## tab of the TileMap editor and Godot picks the right transition tiles.

const TERRAINS := [
	["grass", Color(0.25, 0.55, 0.25)],
	["dirt", Color(0.55, 0.38, 0.2)],
	["cobble", Color(0.55, 0.55, 0.6)],
	["water", Color(0.2, 0.35, 0.6)],
]
## atlas name, source id, terrain index of "lower" (0 bits), of "upper" (1 bits), solid-tile probability scale
const SETS := [
	["grass_dirt", 0, 0, 1, 1.0],
	["grass_cobble", 1, 0, 2, 1.0],
	["water_grass", 2, 3, 0, 1.0],
]
## Corner order in art_meta keys: NW NE SW SE.
const CORNERS := [
	TileSet.CELL_NEIGHBOR_TOP_LEFT_CORNER,
	TileSet.CELL_NEIGHBOR_TOP_RIGHT_CORNER,
	TileSet.CELL_NEIGHBOR_BOTTOM_LEFT_CORNER,
	TileSet.CELL_NEIGHBOR_BOTTOM_RIGHT_CORNER,
]


func _initialize() -> void:
	var meta: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://assets/art/art_meta.json"))
	var ts := TileSet.new()
	ts.tile_size = Vector2i(32, 32)
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
		src.texture_region_size = Vector2i(32, 32)
		ts.add_source(src, s[1])
		for e in meta.tiles[name].tiles:
			var coords := Vector2i(int(e.i) % 4, int(e.i) / 4)
			src.create_tile(coords)
			var td := src.get_tile_data(coords, 0)
			td.terrain_set = 0
			var key: String = e.key
			var uppers := 0
			for c in 4:
				var t: int = s[3] if key[c] == "1" else s[2]
				td.set_terrain_peering_bit(CORNERS[c], t)
				if key[c] == "1":
					uppers += 1
			td.terrain = s[3] if uppers >= 2 else s[2]
			# Only grass_dirt's plain grass is used for plain grass (the other sets'
			# grass differs slightly); keep duplicates as near-zero fallbacks.
			var all_grass: bool = (s[2] == 0 and key == "0000") or (s[3] == 0 and key == "1111")
			if all_grass and name != "grass_dirt":
				td.probability = 0.001
	var err := ResourceSaver.save(ts, "res://assets/tiles/terrain.tres")
	print("terrain.tres saved: ", error_string(err))
	quit()
