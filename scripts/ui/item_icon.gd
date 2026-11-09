class_name ItemIcon
## Drawing helpers for item art at 32 UI px per inventory cell, with socket
## rings (and the rhunes in them) and stack counts on top.

const CELL := 32

static var _socket: ImageTexture


static func socket_tex() -> ImageTexture:
	if _socket:
		return _socket
	var img := Image.create(16, 16, false, Image.FORMAT_RGBA8)
	for y in 16:
		for x in 16:
			var d := Vector2(x + 0.5 - 8.0, y + 0.5 - 8.0).length()
			if d <= 8.0:
				img.set_pixel(x, y, UiKit.EDGE_HI if d > 7.0 else Color(0, 0, 0, 0.45))
	_socket = ImageTexture.create_from_image(img)
	return _socket


static func size_px(item: Dictionary) -> Vector2:
	var b := ItemBases.get_base(item.baseId)
	return Vector2(int(b.w) * CELL, int(b.h) * CELL)


static func socket_layout(n: int, cw: int, ch: int) -> Array[Vector2]:
	var pts: Array[Vector2] = []
	if n <= 0:
		return pts
	var w := cw * CELL
	var h := ch * CELL
	if cw == 1 or n <= 3:
		for i in n:
			pts.append(Vector2(w / 2.0, float(h * (i + 1)) / (n + 1)))
	else:
		var rows := ceili(n / 2.0)
		for i in n:
			var r := i / 2
			var lone := n % 2 == 1 and i == n - 1
			var x := w / 2.0 if lone else (w / 4.0 + 2 if i % 2 == 0 else 3.0 * w / 4.0 - 2)
			pts.append(Vector2(x, float(h * (r + 1)) / (rows + 1)))
	return pts


## Faint quality tint behind items in grids and slots.
static func quality_bg(item: Dictionary) -> Color:
	var b := ItemBases.get_base(item.baseId)
	if b.category == "rhune":
		return Color(1.0, 155 / 255.0, 61 / 255.0, 0.16)
	match item.quality:
		"magic": return Color(120 / 255.0, 150 / 255.0, 1.0, 0.13)
		"rare": return Color(243 / 255.0, 211 / 255.0, 74 / 255.0, 0.13)
		"unique", "rhuneword": return Color(201 / 255.0, 164 / 255.0, 107 / 255.0, 0.20)
	return Color(1, 1, 1, 0.04)


static func draw(ci: CanvasItem, item: Dictionary, at: Vector2, show_sockets := true, tint := Color.WHITE) -> void:
	var b := ItemBases.get_base(item.baseId)
	var sz := Vector2(int(b.w) * CELL, int(b.h) * CELL)
	var tex := Art.icon_texture(ItemText.item_art(item))
	if tex:
		ci.draw_texture_rect(tex, Rect2(at.round(), sz), false, tint)
	if show_sockets:
		var socketed: Array = item.get("socketed", [])
		var pts := socket_layout(int(item.get("sockets", 0)), int(b.w), int(b.h))
		for i in pts.size():
			var p: Vector2 = (at + pts[i] - Vector2(8, 8)).round()
			ci.draw_texture(socket_tex(), p, tint)
			if i < socketed.size() and socketed[i] != null:
				var rt := Art.icon_texture(ItemText.item_art(socketed[i]))
				if rt:
					ci.draw_texture_rect(rt, Rect2(p, Vector2(16, 16)), false, tint)
	var qty := int(item.get("qty", 0)) if item.get("qty") != null else 0
	if qty > 1:
		var s := str(qty)
		var w := UiKit.F_BODY.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
		var pos := (at + Vector2(sz.x - 2 - w, sz.y - 2)).round()
		ci.draw_string(UiKit.F_BODY, pos + Vector2(1, 1), s, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.BLACK)
		ci.draw_string(UiKit.F_BODY, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UiKit.PARCH)


## Base art (gamble/codex listings) at half size: 16 UI px per cell.
static func draw_base_small(ci: CanvasItem, base: Dictionary, center: Vector2, tint := Color.WHITE) -> void:
	var art: Array = base.get("art", [])
	if art.is_empty():
		return
	var tex := Art.icon_texture(art[0])
	if tex == null:
		return
	var sz := Vector2(int(base.w) * 16, int(base.h) * 16)
	ci.draw_texture_rect(tex, Rect2((center - sz / 2.0).round(), sz), false, tint)
