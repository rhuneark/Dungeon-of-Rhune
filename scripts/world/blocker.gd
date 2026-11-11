@tool
class_name Blocker
extends Node2D
## An invisible wall of `size` map cells. Its position is the rect's top
## corner (vertex), snapped to the grid; the magenta diamond shows it.

@export var size := Vector2i(1, 1):
	set(v):
		size = v
		queue_redraw()


func cells() -> Rect2i:
	var m := Iso.to_map(global_position)
	return Rect2i(Vector2i(roundi(m.x), roundi(m.y)), size)


func _draw() -> void:
	if Engine.is_editor_hint():
		var pts := Iso.rect_corners(cells())
		for i in pts.size():
			pts[i] -= global_position
		draw_colored_polygon(pts, Color(0.9, 0.2, 0.9, 0.15))
		pts.append(pts[0])
		draw_polyline(pts, Color(0.9, 0.2, 0.9, 0.8), 1.0)
