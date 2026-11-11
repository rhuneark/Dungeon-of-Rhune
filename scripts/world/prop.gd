@tool
class_name Prop
extends Sprite2D
## A map object in a zone scene. The art is assets/art/props/<art>.png.
##
## Isometric placement (see Iso):
## - The position is the centre of the footprint (`block` = w x h cells, w
##   along map x = the lower-left face, h along map y = the lower-right face).
## - Isometric art (buildings, crates...) puts its bottom corner on the
##   footprint's bottom corner.
## - Round art (trees, lamps, barrels...) and footprint-less decor sit on the
##   position itself (their lowest pixels touch it).
## The position is also the y-sort line. In the editor the red diamond is the
## footprint and the cyan dot is where the player stands to use the object.

const ACTIONS := ["none", "stash", "well", "quests", "inspect", "waypoint", "statue", "gate"]

@export var art := "":
	set(v):
		art = v
		_refresh()
## Collision footprint in cells (0 = walk-through). Isometric buildings come
## with a measured one (Prop.measured_block); keep it unless you redraw.
@export var block := Vector2i.ZERO:
	set(v):
		block = v
		_refresh()
@export_enum("none", "stash", "well", "quests", "inspect", "waypoint", "statue", "gate") var action := "none"
## Hover name ("" = not hoverable).
@export var display_name := ""
## Where the player stands to use it: cells beyond the front (lower-left)
## face along map +y; negative = behind the centre.
@export var approach_dy := 0.45:
	set(v):
		approach_dy = v
		queue_redraw()
## Mirror the art (this also swaps which face is the front: swap `block` too).
@export var mirrored := false:
	set(v):
		mirrored = v
		_refresh()
## Fine-tune the art against the footprint, in pixels.
@export var nudge := Vector2i.ZERO:
	set(v):
		nudge = v
		_refresh()

static var _bbox_cache := {}
static var _base_cache := {}
static var _meta := {}


## The art's entry in assets/art/art_meta.json (props), {} if unknown.
static func meta_of(name: String) -> Dictionary:
	if _meta.is_empty():
		var parsed = JSON.parse_string(FileAccess.get_file_as_string("res://assets/art/art_meta.json"))
		_meta = parsed.get("props", {}) if parsed is Dictionary else {"": {}}
	return _meta.get(name, {})


## Is this art drawn isometric (buildings, directional props)? Those sit on
## their footprint's bottom corner; round things sit on their position.
static func is_iso_art(name: String) -> bool:
	return bool(meta_of(name).get("iso", false))


## Footprint measured from an isometric building's art by tools/art/pack.py
## (ZERO if none: use the layout's).
static func measured_block(name: String) -> Vector2i:
	var b: Array = meta_of(name).get("block", [])
	return Vector2i(int(b[0]), int(b[1])) if b.size() == 2 else Vector2i.ZERO


## Opaque bounding box of the art, in texture pixels.
static func bbox_of(tex: Texture2D) -> Rect2i:
	if tex == null:
		return Rect2i()
	var key := tex.resource_path
	if not _bbox_cache.has(key):
		var img := tex.get_image()
		_bbox_cache[key] = img.get_used_rect() if img else Rect2i(Vector2i.ZERO, tex.get_size())
	return _bbox_cache[key]


## Where the art touches the ground: centre of its lowest opaque pixels.
static func base_of(tex: Texture2D) -> Vector2:
	if tex == null:
		return Vector2.ZERO
	var key := tex.resource_path
	if _base_cache.has(key):
		return _base_cache[key]
	var bb := bbox_of(tex)
	var img := tex.get_image()
	var base := Vector2(bb.get_center().x, bb.end.y)
	if img:
		var sum := 0.0
		var n := 0
		for y in range(maxi(bb.position.y, bb.end.y - 2), bb.end.y):
			for x in range(bb.position.x, bb.end.x):
				if img.get_pixel(x, y).a > 0.5:
					sum += x + 0.5
					n += 1
		if n > 0:
			base.x = roundf(sum / n)
	_base_cache[key] = base
	return base


func _refresh() -> void:
	if art == "":
		texture = null
		return
	var path := "res://assets/art/props/%s.png" % art
	texture = load(path) if ResourceLoader.exists(path) else null
	centered = false
	flip_h = mirrored
	if texture:
		var m := meta_of(art)
		var base := Vector2(m.base[0], m.base[1]) if m.has("base") else base_of(texture)
		if mirrored:
			base.x = texture.get_width() - base.x
		var corner := Vector2.ZERO
		if block != Vector2i.ZERO and is_iso_art(art):
			corner = Vector2((block.x - block.y) * Iso.HALF_H, (block.x + block.y) * Iso.HALF_H / 2.0)
		offset = (corner - base + Vector2(nudge)).round()
	queue_redraw()


## Visible bounds in world space (for hover/picking).
func world_rect() -> Rect2:
	if texture == null:
		return Rect2(global_position, Vector2.ZERO)
	var bb := bbox_of(texture)
	var x0 := float(bb.position.x)
	if flip_h:
		x0 = texture.get_width() - bb.end.x
	return Rect2(global_position + offset + Vector2(x0, bb.position.y), Vector2(bb.size))


## Footprint cells (top cell + size) in the map grid.
func footprint() -> Rect2i:
	var m := Iso.to_map(global_position)
	return Rect2i(roundi(m.x - block.x / 2.0), roundi(m.y - block.y / 2.0), block.x, block.y)


func approach_point() -> Vector2:
	var m := Iso.to_map(global_position)
	return Iso.vertex(m.x, m.y + block.y / 2.0 + approach_dy)


func _draw() -> void:
	if not Engine.is_editor_hint():
		return
	if block != Vector2i.ZERO:
		var pts := Iso.rect_corners(footprint())
		for i in pts.size():
			pts[i] -= global_position
		draw_colored_polygon(pts, Color(1, 0.2, 0.2, 0.18))
		pts.append(pts[0])
		draw_polyline(pts, Color(1, 0.2, 0.2, 0.8), 1.0)
	if action != "none":
		draw_circle(approach_point() - global_position, 3.0, Color(0.3, 1, 1, 0.9))
