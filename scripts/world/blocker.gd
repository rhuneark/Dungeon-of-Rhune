@tool
class_name Blocker
extends Node2D
## An invisible wall, in tiles. Position = top-left cell (snapped to the grid).

const TILE := 32

@export var size := Vector2i(1, 1):
	set(v):
		size = v
		queue_redraw()


func cells() -> Rect2i:
	return Rect2i(Vector2i(roundi(global_position.x / TILE), roundi(global_position.y / TILE)), size)


func _draw() -> void:
	if Engine.is_editor_hint():
		var r := Rect2(Vector2.ZERO, Vector2(size * TILE))
		draw_rect(r, Color(0.9, 0.2, 0.9, 0.15))
		draw_rect(r, Color(0.9, 0.2, 0.9, 0.8), false, 1.0)
