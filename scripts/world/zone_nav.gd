class_name ZoneNav
extends RefCounted
## Walkability grid + A* on the isometric map cells (Godot's AStarGrid2D,
## 8-way, no corner cutting) with string-pulling so click-to-move paths go
## straight where they can. Positions are world pixels; see Iso.

var astar := AStarGrid2D.new()
var size := Vector2i.ZERO


func _init(map_size: Vector2i) -> void:
	size = map_size
	astar.region = Rect2i(Vector2i.ZERO, map_size)
	astar.cell_size = Vector2(1, 1)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_OCTILE
	astar.update()


func inside(c: Vector2i) -> bool:
	return c.x >= 0 and c.y >= 0 and c.x < size.x and c.y < size.y


func is_blocked(c: Vector2i) -> bool:
	return not inside(c) or astar.is_point_solid(c)


func block(r: Rect2i) -> void:
	for y in range(r.position.y, r.end.y):
		for x in range(r.position.x, r.end.x):
			if inside(Vector2i(x, y)):
				astar.set_point_solid(Vector2i(x, y), true)


static func cell_of(p: Vector2) -> Vector2i:
	return Iso.cell_of(p)


## Is a world point standing room (with a small body radius, in pixels)?
func walkable(p: Vector2, r := 7.0) -> bool:
	for d in [Vector2(-r, -r / 2), Vector2(r, -r / 2), Vector2(-r, r / 2), Vector2(r, r / 2)]:
		if is_blocked(Iso.cell_of(p + d)):
			return false
	return true


func line_of_sight(a: Vector2, b: Vector2) -> bool:
	var steps := ceili(a.distance_to(b) / 6.0)
	for i in range(1, steps + 1):
		if not walkable(a.lerp(b, float(i) / steps)):
			return false
	return true


func nearest_open(c: Vector2i, max_r := 6) -> Vector2i:
	if not is_blocked(c):
		return c
	for r in range(1, max_r + 1):
		var best := Vector2i(-1, -1)
		var best_d := INF
		for y in range(c.y - r, c.y + r + 1):
			for x in range(c.x - r, c.x + r + 1):
				var p := Vector2i(x, y)
				if maxi(absi(x - c.x), absi(y - c.y)) != r or is_blocked(p):
					continue
				var d := float((x - c.x) * (x - c.x) + (y - c.y) * (y - c.y))
				if d < best_d:
					best_d = d
					best = p
		if best.x >= 0:
			return best
	return Vector2i(-1, -1)


## World-space path from a to b (excluding a). Empty if unreachable.
func find_path(a: Vector2, b: Vector2) -> Array[Vector2]:
	var out: Array[Vector2] = []
	var goal := nearest_open(Iso.cell_of(b))
	if goal.x < 0:
		return out
	var exact := goal == Iso.cell_of(b)
	var final_pt := b if exact else Iso.cell_center(goal)
	if line_of_sight(a, final_pt):
		out.append(final_pt)
		return out
	var start := nearest_open(Iso.cell_of(a), 1)
	if start.x < 0:
		return out
	var ids := astar.get_id_path(start, goal)
	if ids.is_empty():
		return out
	var pts: Array[Vector2] = []
	for i in range(1, ids.size()):
		pts.append(Iso.cell_center(ids[i]))
	if pts.is_empty():
		pts.append(final_pt)
	pts[pts.size() - 1] = final_pt
	# String-pull: skip waypoints we can see past.
	var from := a
	var i := 0
	while i < pts.size():
		var j := pts.size() - 1
		while j > i and not line_of_sight(from, pts[j]):
			j -= 1
		out.append(pts[j])
		from = pts[j]
		i = j + 1
	return out
