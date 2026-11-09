class_name GroundItems
extends Node2D
## Loot on the ground — the D2 moment. Drops arc out of their source, land
## with a little spin, and sit under a coloured, clickable label. Uniques get
## a light beam, rhunes a beam + sparkle, rares a sparkle. Labels stack so
## they never overlap.

const LABEL_H := 11
const LABEL_PAD := 3

## Labels draw above the world; set by the runtime.
var label_layer: Node2D
var fx: Fx
var nav: ZoneNav
var entries: Array = []
var _hovered = null
var _seq := 0


func _label_for(drop: Dictionary) -> Array:
	if drop.kind == "gold":
		return ["%d Gold" % int(drop.amount), Color("#f3d34a")]
	return [ItemText.item_name(drop.item), Color(ItemText.item_color(drop.item))]


func _landing_spot(origin: Vector2, i: int) -> Vector2:
	for tries in 24:
		var a := randf() * TAU
		var r := 18.0 + randf() * (26.0 + i * 4)
		var p := origin + Vector2(cos(a) * r, sin(a) * r * 0.7 + 8)
		if not nav.walkable(p, 4):
			continue
		var crowded := false
		for e in entries:
			if e.pos.distance_to(p) < 14:
				crowded = true
				break
		if not crowded:
			return p
	return origin + Vector2(randf_range(-15, 15), 12)


func spawn(drops: Array, origin: Vector2) -> void:
	for i in drops.size():
		add(drops[i], _landing_spot(origin, i), origin, i * 0.08)
	layout_labels()


func add(drop: Dictionary, at: Vector2, from: Variant = null, delay := 0.0, placed_key := "") -> Dictionary:
	var node := Node2D.new()
	var art := "gold" if drop.kind == "gold" else ItemText.item_art(drop.item)
	var icon := Sprite2D.new()
	icon.texture = Art.icon_texture(art)
	icon.centered = false
	icon.scale = Vector2(0.5, 0.5)
	if icon.texture:
		icon.offset = Vector2(-icon.texture.get_width() / 2.0, -icon.texture.get_height())
	node.add_child(icon)
	node.position = at.round()
	add_child(node)

	var info := _label_for(drop)
	var label := Fx.pixel_label(info[0], info[1], 10, 0)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.72)
	bg.content_margin_left = LABEL_PAD
	bg.content_margin_right = LABEL_PAD
	bg.content_margin_top = 0
	bg.content_margin_bottom = 0
	label.add_theme_stylebox_override("normal", bg)
	label_layer.add_child(label)
	label.reset_size()
	label.visible = from == null

	_seq += 1
	var e := {
		"id": _seq, "drop": drop, "pos": at, "node": node, "icon": icon, "label": label, "bg": bg,
		"rect": Rect2(), "landed": from == null, "placed_key": placed_key,
		"anim": {} if from == null else {"from": from, "t": -delay, "dur": 0.5, "h": 26.0 + randf() * 10.0},
	}
	entries.append(e)
	return e


func remove(e: Dictionary) -> void:
	entries.erase(e)
	e.node.queue_free()
	e.label.queue_free()
	if _hovered == e:
		_hovered = null
	layout_labels()


## Stack labels upward so none overlap (bottom-most first).
func layout_labels() -> void:
	var placed: Array[Rect2] = []
	var sorted := entries.duplicate()
	sorted.sort_custom(func(a, b): return a.pos.y > b.pos.y)
	for e in sorted:
		var w: float = e.label.size.x
		var r := Rect2(roundf(e.pos.x - w / 2.0), roundf(e.pos.y - 20 - LABEL_H), w, LABEL_H)
		for guard in 30:
			var hit := false
			for p in placed:
				if r.intersects(p):
					r.position.y = p.position.y - LABEL_H - 1
					hit = true
					break
			if not hit:
				break
		e.rect = r
		e.label.position = r.position
		placed.append(r)


## Entry whose label (or icon) is under a world point.
func hit(p: Vector2):
	for i in range(entries.size() - 1, -1, -1):
		var e = entries[i]
		if not e.landed:
			continue
		if e.rect.has_point(p):
			return e
		if absf(p.x - e.pos.x) < 9 and p.y <= e.pos.y + 2 and p.y >= e.pos.y - 18:
			return e
	return null


func set_hovered(e) -> void:
	if _hovered == e:
		return
	if _hovered:
		_hovered.bg.bg_color = Color(0, 0, 0, 0.72)
	_hovered = e
	if e:
		e.bg.bg_color = Color(0.25, 0.2, 0.4, 0.9)


func _process(delta: float) -> void:
	for e in entries:
		if e.anim.is_empty():
			continue
		var a: Dictionary = e.anim
		a.t += delta
		if a.t < 0:
			e.node.visible = false
			continue
		e.node.visible = true
		var k := minf(1.0, a.t / a.dur)
		var p: Vector2 = a.from.lerp(e.pos, k) - Vector2(0, sin(k * PI) * a.h)
		e.node.position = p.round()
		e.icon.rotation = (1.0 - k) * 6.0 * (1 if e.id % 2 else -1) if k < 1 else 0.0
		if k >= 1.0:
			e.anim = {}
			e.landed = true
			e.label.visible = true
			e.icon.rotation = 0
			_on_land(e)


func _on_land(e: Dictionary) -> void:
	if e.drop.kind != "item":
		return
	var item: Dictionary = e.drop.item
	var base := ItemBases.get_base(item.baseId)
	if item.quality == "unique" or item.quality == "rhuneword":
		fx.beam(e.pos, Color("#c9a46b"), 6.0)
	elif base.category == "rhune":
		fx.beam(e.pos, Color("#ff9b3d"), 3.0)
		fx.sparkle(e.pos, Color("#ffb060"))
	elif item.quality == "rare":
		fx.sparkle(e.pos, Color("#f3d34a"))
