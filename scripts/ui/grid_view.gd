class_name GridView
extends Control
## A D2-style item grid with a placement preview for the item on the cursor.
## `clicked(cx, cy, uid)`: cx/cy = where the held item's top-left would go,
## uid = item under the pointer ("" if none).

signal clicked(cx: int, cy: int, uid: String)
signal right_clicked(uid: String)

const CELL := 32

var gw := 1
var gh := 1
var items: Array = []
var tip_ctx := "none"
## func(item) -> int price (or -1)
var price_fn: Callable
## func(item) -> bool: red cell when requirements aren't met
var unusable_fn: Callable
var _hover := Vector2(-1, -1)


func _init(w: int, h: int, list: Array) -> void:
	gw = w
	gh = h
	items = list
	custom_minimum_size = Vector2(w * CELL + 2, h * CELL + 2)
	mouse_filter = MOUSE_FILTER_STOP
	size_flags_horizontal = SIZE_SHRINK_CENTER


func _held():
	if not Game.has_hero():
		return null
	return Game.hero().get("cursor")


func _grid() -> Dictionary:
	return {"w": gw, "h": gh, "items": items}


func _placement(p: Vector2) -> Dictionary:
	var held = _held()
	if held == null:
		return {}
	var sz := Grid.size_of(held)
	var cx := clampi(roundi(p.x / CELL - sz.x / 2.0), 0, maxi(0, gw - sz.x))
	var cy := clampi(roundi(p.y / CELL - sz.y / 2.0), 0, maxi(0, gh - sz.y))
	var hits := Grid.overlapping(_grid(), cx, cy, sz.x, sz.y, held.uid)
	return {"cx": cx, "cy": cy, "w": sz.x, "h": sz.y, "ok": hits.size() <= 1 and sz.x <= gw and sz.y <= gh}


func _under(p: Vector2) -> Dictionary:
	if p.x < 0 or p.y < 0:
		return {}
	var hits := Grid.overlapping(_grid(), floori(p.x / CELL), floori(p.y / CELL), 1, 1)
	return hits[0] if hits.size() > 0 else {}


func _gui_input(e: InputEvent) -> void:
	if e is InputEventMouseMotion:
		_hover = e.position - Vector2.ONE
		queue_redraw()
		var it := _under(_hover)
		if not it.is_empty() and _held() == null:
			UiTip.item(self, it, tip_ctx, price_fn.call(it) if price_fn.is_valid() else -1)
		else:
			UiTip.clear(self)
	elif e is InputEventMouseButton and e.pressed:
		var p: Vector2 = e.position - Vector2.ONE
		var it := _under(p)
		if e.button_index == MOUSE_BUTTON_LEFT:
			var pl := _placement(p)
			UiTip.clear()
			accept_event()
			clicked.emit(int(pl.get("cx", 0)), int(pl.get("cy", 0)), String(it.get("uid", "")))
		elif e.button_index == MOUSE_BUTTON_RIGHT:
			accept_event()
			if not it.is_empty():
				UiTip.clear()
				right_clicked.emit(String(it.uid))


func _notification(what: int) -> void:
	if what == NOTIFICATION_MOUSE_EXIT:
		_hover = Vector2(-1, -1)
		queue_redraw()


func _draw() -> void:
	var inner := Vector2(gw * CELL, gh * CELL)
	draw_rect(Rect2(Vector2.ZERO, inner + Vector2(2, 2)), Color.BLACK)
	draw_rect(Rect2(Vector2.ONE, inner), UiKit.WELL)
	var line := Color("#2a2018")
	for x in gw:
		draw_rect(Rect2(Vector2(1 + x * CELL, 1), Vector2(1, inner.y)), line)
	for y in gh:
		draw_rect(Rect2(Vector2(1, 1 + y * CELL), Vector2(inner.x, 1)), line)
	draw_rect(Rect2(Vector2.ONE, inner), UiKit.EDGE, false, 1.0)

	var held = _held()
	var under := _under(_hover) if _hover.x >= 0 else {}
	for it in items:
		var sz := Grid.size_of(it)
		var r := Rect2(Vector2(1 + int(it.x) * CELL, 1 + int(it.y) * CELL), Vector2(sz.x * CELL, sz.y * CELL))
		var bad: bool = unusable_fn.is_valid() and unusable_fn.call(it)
		draw_rect(r, Color(200 / 255.0, 40 / 255.0, 40 / 255.0, 0.28) if bad else ItemIcon.quality_bg(it))
		ItemIcon.draw(self, it, r.position)
		if held == null and not under.is_empty() and under.uid == it.uid:
			draw_rect(r.grow(-0.5), UiKit.EDGE_HI, false, 1.0)
	if held != null and _hover.x >= 0:
		var pl := _placement(_hover)
		var r := Rect2(Vector2(1 + pl.cx * CELL, 1 + pl.cy * CELL), Vector2(pl.w * CELL, pl.h * CELL))
		draw_rect(r, Color(90 / 255.0, 200 / 255.0, 90 / 255.0, 0.18) if pl.ok else Color(220 / 255.0, 60 / 255.0, 60 / 255.0, 0.22))
