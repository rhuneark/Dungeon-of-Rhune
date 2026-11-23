class_name ZoneNav
extends RefCounted
## Walkability grid + A* (Godot's AStarGrid2D, 8-way, no corner cutting) with
## string-pulling so click-to-move paths don't zigzag.

const TILE := 32

var astar := AStarGrid2D.new()
var size := Vector2i.ZERO
## Flow field: steps from every cell to the goal cell (-1 = can't get there).
var _flow := PackedInt32Array()
var _flow_goal := Vector2i(-9999, -9999)

const _DIRS := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1),
	Vector2i(1, 1), Vector2i(1, -1), Vector2i(-1, 1), Vector2i(-1, -1)]


func _init(map_size: Vector2i) -> void:
	size = map_size
	astar.region = Rect2i(Vector2i.ZERO, map_size)
	astar.cell_size = Vector2(TILE, TILE)
	astar.offset = Vector2(TILE / 2.0, TILE / 2.0)
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
	return Vector2i(floori(p.x / TILE), floori(p.y / TILE))


## Is a world point standing room (with a small body radius)?
func walkable(p: Vector2, r := 7.0) -> bool:
	for d in [Vector2(-r, -r / 2), Vector2(r, -r / 2), Vector2(-r, r / 2), Vector2(r, r / 2)]:
		if is_blocked(cell_of(p + d)):
			return false
	return true


## Can a body of half-width r travel straight from a to b? (Shots use a thin r.)
func line_of_sight(a: Vector2, b: Vector2, r := 7.0) -> bool:
	var steps := ceili(a.distance_to(b) / 6.0)
	for i in range(1, steps + 1):
		if not walkable(a.lerp(b, float(i) / steps), r):
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
	var goal := nearest_open(cell_of(b))
	if goal.x < 0:
		return out
	var exact := goal == cell_of(b)
	var final_pt := b if exact else Vector2(goal * TILE) + Vector2(TILE / 2.0, TILE / 2.0)
	if line_of_sight(a, final_pt):
		out.append(final_pt)
		return out
	var start := nearest_open(cell_of(a), 1)
	if start.x < 0:
		return out
	var ids := astar.get_id_path(start, goal)
	if ids.is_empty():
		return out
	var pts: Array[Vector2] = []
	for i in range(1, ids.size()):
		pts.append(Vector2(ids[i] * TILE) + Vector2(TILE / 2.0, TILE / 2.0))
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


## Can you step from cell c by d (diagonals only past two open sides)?
func _can_step(c: Vector2i, d: Vector2i) -> bool:
	if is_blocked(c + d):
		return false
	if d.x != 0 and d.y != 0:
		return not is_blocked(c + Vector2i(d.x, 0)) and not is_blocked(c + Vector2i(0, d.y))
	return true


## Point the flow field at a world position (monsters close in on it from
## anywhere in the room, around pillars). Cheap: rebuilt only when the goal
## changes cell.
func flow_to(goal_pos: Vector2) -> void:
	var g := nearest_open(cell_of(goal_pos), 2)
	if g == _flow_goal:
		return
	_flow_goal = g
	_flow.resize(size.x * size.y)
	_flow.fill(-1)
	if g.x < 0:
		return
	_flow[g.y * size.x + g.x] = 0
	var queue: Array[Vector2i] = [g]
	var head := 0
	while head < queue.size():
		var c := queue[head]
		head += 1
		var dist := _flow[c.y * size.x + c.x]
		for d in _DIRS:
			var n: Vector2i = c + d
			if not inside(n) or _flow[n.y * size.x + n.x] >= 0 or not _can_step(c, d):
				continue
			_flow[n.y * size.x + n.x] = dist + 1
			queue.append(n)


## The next cell centre downhill from p towards the flow goal, or Vector2.INF.
func flow_step(p: Vector2) -> Vector2:
	if _flow.is_empty():
		return Vector2.INF
	var c := cell_of(p)
	var here := _flow[c.y * size.x + c.x] if inside(c) else -1
	var best := Vector2i(-1, -1)
	var best_d := here if here >= 0 else 1 << 30
	for d in _DIRS:
		var n: Vector2i = c + d
		if not inside(n):
			continue
		var nd := _flow[n.y * size.x + n.x]
		if nd < 0 or nd >= best_d:
			continue
		if here >= 0 and not _can_step(c, d):
			continue
		best_d = nd
		best = n
	if best.x < 0:
		return Vector2.INF
	return Vector2(best * TILE) + Vector2(TILE / 2.0, TILE / 2.0)
