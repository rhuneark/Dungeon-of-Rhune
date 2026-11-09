class_name Grid
## Grid containers (backpack, stash, vendor, crucible): D2-style "tetris":
## every item occupies base.w x base.h cells at (x, y).
## A grid is {w, h, items: Array[item]} — `items` is the SAME Array as the
## save's list, so mutations land in the save.


static func make(w: int, h: int, items: Array) -> Dictionary:
	return {"w": w, "h": h, "items": items}


static func size_of(item: Dictionary) -> Vector2i:
	var b := ItemBases.get_base(item.baseId)
	return Vector2i(b.w, b.h)


## Items overlapping a w x h rectangle at (x, y).
static func overlapping(grid: Dictionary, x: int, y: int, w: int, h: int, ignore_uid := "") -> Array:
	var out: Array = []
	for it in grid.items:
		if ignore_uid != "" and it.uid == ignore_uid:
			continue
		var s := size_of(it)
		if it.x < x + w and it.x + s.x > x and it.y < y + h and it.y + s.y > y:
			out.append(it)
	return out


static func in_bounds(grid: Dictionary, x: int, y: int, w: int, h: int) -> bool:
	return x >= 0 and y >= 0 and x + w <= grid.w and y + h <= grid.h


static func can_place(grid: Dictionary, item: Dictionary, x: int, y: int) -> bool:
	var s := size_of(item)
	return in_bounds(grid, x, y, s.x, s.y) and overlapping(grid, x, y, s.x, s.y, item.uid).is_empty()


## First free spot, scanning column by column from the top-left (like D2).
## Returns Vector2i(-1, -1) when there is no room.
static func find_spot(grid: Dictionary, item: Dictionary) -> Vector2i:
	var s := size_of(item)
	for x in range(0, grid.w - s.x + 1):
		for y in range(0, grid.h - s.y + 1):
			if overlapping(grid, x, y, s.x, s.y, item.uid).is_empty():
				return Vector2i(x, y)
	return Vector2i(-1, -1)


## Try to auto-place; returns false when there is no room. Mutates grid.items.
static func auto_place(grid: Dictionary, item: Dictionary) -> bool:
	var spot := find_spot(grid, item)
	if spot.x < 0:
		return false
	item.x = spot.x
	item.y = spot.y
	grid.items.append(item)
	return true


## Removes and returns the item, or {} if it isn't there.
static func remove_item(grid: Dictionary, uid: String) -> Dictionary:
	for i in grid.items.size():
		if grid.items[i].uid == uid:
			var it: Dictionary = grid.items[i]
			grid.items.remove_at(i)
			return it
	return {}


## Item covering cell (cx, cy), or {}.
static func item_at_cell(grid: Dictionary, cx: int, cy: int) -> Dictionary:
	var hits := overlapping(grid, cx, cy, 1, 1)
	return hits[0] if not hits.is_empty() else {}


## Drop `item` with its top-left at (x, y). If exactly one item is in the way,
## it is swapped out and returned (it goes onto the cursor). Returns
## {ok: false, swapped: {}} if blocked by 2+ items or out of bounds.
static func place_or_swap(grid: Dictionary, item: Dictionary, x: int, y: int) -> Dictionary:
	var s := size_of(item)
	if not in_bounds(grid, x, y, s.x, s.y):
		return {"ok": false, "swapped": {}}
	var hits := overlapping(grid, x, y, s.x, s.y, item.uid)
	if hits.size() > 1:
		return {"ok": false, "swapped": {}}
	var swapped := {}
	if hits.size() == 1:
		swapped = remove_item(grid, hits[0].uid)
	item.x = x
	item.y = y
	grid.items.append(item)
	return {"ok": true, "swapped": swapped}
