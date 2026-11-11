class_name Iso
## 2:1 isometric grid math, matching a TileMapLayer with TILE_SHAPE_ISOMETRIC,
## TILE_LAYOUT_DIAMOND_DOWN and 64x32 tiles at the zone origin.
##
## Map space: cell (x, y); +x runs down-right on screen, +y down-left. The
## town's "south" is map +y, so building fronts face the lower left.
## Vertex space: corner (u, v) of cells; cell (x, y) spans u in [x, x+1],
## v in [y, y+1]. Its top corner is vertex (x, y), its bottom (x+1, y+1).

const TILE_W := 64
const TILE_H := 32
const HALF_W := 32.0
const HALF_H := 16.0


## World position of vertex (u, v); fractional values are fine.
static func vertex(u: float, v: float) -> Vector2:
	return Vector2(HALF_W + (u - v) * HALF_W, (u + v) * HALF_H)


## Centre of cell c (== TileMapLayer.map_to_local).
static func cell_center(c: Vector2i) -> Vector2:
	return vertex(c.x + 0.5, c.y + 0.5)


## Fractional vertex-space coordinates of a world point.
static func to_map(p: Vector2) -> Vector2:
	var a := (p.x - HALF_W) / HALF_W # u - v
	var b := p.y / HALF_H # u + v
	return Vector2((a + b) * 0.5, (b - a) * 0.5)


## Cell containing a world point (== TileMapLayer.local_to_map).
static func cell_of(p: Vector2) -> Vector2i:
	var m := to_map(p)
	return Vector2i(floori(m.x), floori(m.y))


## World outline of a cell rect: [top, right, bottom, left].
static func rect_corners(r: Rect2i) -> PackedVector2Array:
	return PackedVector2Array([
		vertex(r.position.x, r.position.y),
		vertex(r.end.x, r.position.y),
		vertex(r.end.x, r.end.y),
		vertex(r.position.x, r.end.y),
	])


## Bounding box (world) of a w x h map.
static func map_bounds(size: Vector2i) -> Rect2:
	var left := vertex(0, size.y).x
	var right := vertex(size.x, 0).x
	return Rect2(left, 0, right - left, (size.x + size.y) * HALF_H)
