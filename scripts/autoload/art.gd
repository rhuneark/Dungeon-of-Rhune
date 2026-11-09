extends Node
## Access to the generated art (tools/art → assets/art). Slices character
## sheets and tile atlases into cached AtlasTextures using art_meta.json.

const META_PATH := "res://assets/art/art_meta.json"
## Clockwise from east, matching dir_from_vector().
const DIRS8: Array[String] = ["east", "south-east", "south", "south-west", "west", "north-west", "north", "north-east"]

var meta: Dictionary = {"chars": {}, "tiles": {}, "props": {}, "icons": {}}
var _atlas_cache := {}
var _frames_cache := {}


func _ready() -> void:
	var text := FileAccess.get_file_as_string(META_PATH)
	var parsed = JSON.parse_string(text) if text != "" else null
	if typeof(parsed) == TYPE_DICTIONARY:
		meta = parsed
	else:
		push_warning("Art: %s missing or invalid — running without art metadata" % META_PATH)


## Direction name for a movement vector (+y is south).
static func dir_from_vector(v: Vector2) -> String:
	var i := posmod(roundi(atan2(v.y, v.x) / (PI / 4.0)), 8)
	return DIRS8[i]


## Every texture is loaded once and kept (a texture first loaded inside a
## _draw() call renders blank for that frame, so the loading screen warms
## them all up front via warm()).
var _textures := {}


func _tex(path: String) -> Texture2D:
	if _textures.has(path):
		return _textures[path]
	var t: Texture2D = load(path) as Texture2D if ResourceLoader.exists(path) else null
	_textures[path] = t
	return t


## All art files, for the loading screen.
static func art_files() -> PackedStringArray:
	var out: PackedStringArray = []
	for dir in ["chars", "tiles", "props", "icons"]:
		var path := "res://assets/art/%s" % dir
		for f in ResourceLoader.list_directory(path):
			if f.ends_with(".png"):
				out.append("%s/%s" % [path, f])
	return out


func warm(path: String) -> void:
	_tex(path)


func _sub(path: String, region: Rect2) -> Texture2D:
	var key := "%s|%s" % [path, region]
	if _atlas_cache.has(key):
		return _atlas_cache[key]
	var base := _tex(path)
	if base == null:
		return null
	var t := AtlasTexture.new()
	t.atlas = base
	t.region = region
	_atlas_cache[key] = t
	return t


# ---------------------------------------------------------------- characters
func char_meta(name: String) -> Dictionary:
	return meta.chars.get(name, {})


func char_rotation(name: String, dir: String) -> Texture2D:
	var m := char_meta(name)
	if m.is_empty():
		return null
	var cell: Array = m.cell
	var rc: Array = m.rotations.get(dir, m.rotations.get("south"))
	return _sub("res://assets/art/chars/%s.png" % name, Rect2(rc[0] * cell[0], rc[1] * cell[1], cell[0], cell[1]))


## Animation frames for a direction; falls back to south, then to the static rotation.
func char_frames(name: String, anim: String, dir: String) -> Array[Texture2D]:
	var key := "%s|%s|%s" % [name, anim, dir]
	if _frames_cache.has(key):
		return _frames_cache[key]
	var out: Array[Texture2D] = []
	var m := char_meta(name)
	if not m.is_empty():
		var a: Dictionary = m.anims.get(anim, {})
		var d: Dictionary = a.get(dir, a.get("south", {}))
		var cell: Array = m.cell
		for i in int(d.get("frames", 0)):
			out.append(_sub("res://assets/art/chars/%s.png" % name, Rect2(i * cell[0], int(d.row) * cell[1], cell[0], cell[1])))
	if out.is_empty():
		var r := char_rotation(name, dir)
		if r:
			out.append(r)
	_frames_cache[key] = out
	return out


## Pixels from the bottom of a character cell to its feet.
func char_foot_offset(name: String) -> int:
	var m := char_meta(name)
	return int(m.cell[1]) - int(m.footY) if not m.is_empty() else 0


# --------------------------------------------------------------------- tiles
## Atlas coordinates of the Wang tile for corner key "NW NE SW SE" (1 = upper terrain).
func tile_coords(tileset: String, key: String) -> Vector2i:
	var t: Dictionary = meta.tiles.get(tileset, {})
	for e in t.get("tiles", []):
		if e.key == key:
			return Vector2i(int(e.i) % 4, int(e.i) / 4)
	return Vector2i(-1, -1)


# --------------------------------------------------------------- props/icons
func prop_texture(name: String) -> Texture2D:
	return _tex("res://assets/art/props/%s.png" % name)


func prop_meta(name: String) -> Dictionary:
	return meta.props.get(name, {})


func icon_texture(name: String) -> Texture2D:
	return _tex("res://assets/art/icons/%s.png" % name)
