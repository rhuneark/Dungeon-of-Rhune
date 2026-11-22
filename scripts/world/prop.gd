@tool
class_name Prop
extends Sprite2D
## A map object in a zone scene. The art is assets/art/props/<art>.png and the
## node's position is where the object meets the ground (the bottom of its
## visible pixels), which is also its y-sort line.
##
## In the editor the red box shows the collision footprint (`block`, in tiles,
## anchored bottom-centre) and the cyan dot is where the player stands to use it.

const TILE := 32
const ACTIONS := ["none", "stash", "well", "quests", "inspect", "waypoint", "statue", "gate"]

@export var art := "":
	set(v):
		art = v
		_refresh()
## Collision footprint in tiles (0 = walk-through decor).
@export var block := Vector2i.ZERO:
	set(v):
		block = v
		queue_redraw()
@export_enum("none", "stash", "well", "quests", "inspect", "waypoint", "statue", "gate") var action := "none"
## Hover name ("" = not hoverable).
@export var display_name := ""
## Where the player stands to use it, in tiles below the base (negative = above).
@export var approach_dy := 0.45:
	set(v):
		approach_dy = v
		queue_redraw()
@export var mirrored := false:
	set(v):
		mirrored = v
		flip_h = v

static var _bbox_cache := {}


func _ready() -> void:
	_refresh()


## Opaque bounding box of the art, in texture pixels.
static func bbox_of(tex: Texture2D) -> Rect2i:
	if tex == null:
		return Rect2i()
	var key := tex.resource_path
	if not _bbox_cache.has(key):
		var img := tex.get_image()
		_bbox_cache[key] = img.get_used_rect() if img else Rect2i(Vector2i.ZERO, tex.get_size())
	return _bbox_cache[key]


func _refresh() -> void:
	if art == "":
		texture = null
		return
	var path := "res://assets/art/props/%s.png" % art
	texture = load(path) if ResourceLoader.exists(path) else null
	centered = false
	flip_h = mirrored
	if texture:
		var bb := bbox_of(texture)
		offset = Vector2(-floori(texture.get_width() / 2.0), -bb.end.y)
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


## Footprint cells (top-left cell + size) in the tile grid.
func footprint() -> Rect2i:
	var tx := global_position.x / TILE
	var ty := global_position.y / TILE
	return Rect2i(roundi(tx - block.x / 2.0), ceili(ty) - block.y, block.x, block.y)


func approach_point() -> Vector2:
	return global_position + Vector2(0, approach_dy * TILE)


func _draw() -> void:
	if not Engine.is_editor_hint():
		return
	if block != Vector2i.ZERO:
		var fp := footprint()
		var r := Rect2(Vector2(fp.position * TILE) - global_position, Vector2(fp.size * TILE))
		draw_rect(r, Color(1, 0.2, 0.2, 0.18))
		draw_rect(r, Color(1, 0.2, 0.2, 0.7), false, 1.0)
	if action != "none":
		draw_circle(Vector2(0, approach_dy * TILE), 3.0, Color(0.3, 1, 1, 0.9))
