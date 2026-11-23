class_name GroundItems
extends Node2D
## Loot on the ground, the D2 moment. Drops are never drawn as items: each is a
## name label over a glowing ring on the floor and a beam of light whose height
## and colour say how good it is (junk barely glows; a unique stands out across
## the room). A drop flies out of its source as a spark, lands with a flash and
## a ring burst, then its beam shoots up and the name appears. Rare and better
## also light the floor around them. Labels stack so they never overlap.
##
## All of it is unshaded and additive, so the dusk tint and dark floors never
## dim it.

const LABEL_PAD := 3
const LABEL_LIFT := 9 # label bottom sits this far above the drop point
const BEAM_W := 13
const BEAM_COLS := [0.03, 0.06, 0.12, 0.22, 0.42, 0.72, 1.0, 0.72, 0.42, 0.22, 0.12, 0.06, 0.03]
const BURST_RADII := [6, 9, 12, 15, 18, 21]
const BG := Color(0, 0, 0, 0.74)
const BG_HOVER := Color(0.25, 0.2, 0.4, 0.92)

## How each tier glows. beam: height in px (0 = none); ring: floor ring radius;
## glow: ring/beam strength; light: floor light radius (0 = none); motes: specks
## drifting up the beam; border: label outline; halo: dashed outer ring.
const TIERS := {
	"gold": {"color": "#f3c94a", "beam": 0, "ring": 5, "glow": 0.6, "light": 0, "energy": 0.0, "motes": 0, "border": false, "halo": false},
	"crude": {"color": "#8d8d8d", "beam": 14, "ring": 7, "glow": 0.4, "light": 0, "energy": 0.0, "motes": 0, "border": false, "halo": false},
	"normal": {"color": "#ece6d6", "beam": 22, "ring": 8, "glow": 0.5, "light": 0, "energy": 0.0, "motes": 0, "border": false, "halo": false},
	"socketed": {"color": "#c8c8c8", "beam": 28, "ring": 8, "glow": 0.6, "light": 0, "energy": 0.0, "motes": 0, "border": false, "halo": false},
	"magic": {"color": "#7896ff", "beam": 60, "ring": 9, "glow": 0.85, "light": 0, "energy": 0.0, "motes": 2, "border": false, "halo": false},
	"rare": {"color": "#f3d34a", "beam": 100, "ring": 10, "glow": 0.95, "light": 44, "energy": 0.55, "motes": 4, "border": true, "halo": false},
	"rhune": {"color": "#ff9b3d", "beam": 136, "ring": 11, "glow": 1.0, "light": 52, "energy": 0.75, "motes": 6, "border": true, "halo": true},
	"unique": {"color": "#e8b45a", "beam": 184, "ring": 12, "glow": 1.0, "light": 60, "energy": 0.85, "motes": 9, "border": true, "halo": true},
}

## Labels draw above the world; set by the runtime.
var label_layer: Node2D
var fx: Fx
var nav: ZoneNav
var entries: Array = []
var _hovered = null
var _seq := 0

static var _tex := {}
static var _mat: CanvasItemMaterial


static func tier_of(drop: Dictionary) -> String:
	if drop.kind == "gold":
		return "gold"
	var item: Dictionary = drop.item
	var base := ItemBases.get_base(item.baseId)
	if base.get("category", "") == "rhune":
		return "rhune"
	match String(item.quality):
		"unique", "rhuneword":
			return "unique"
		"rare":
			return "rare"
		"magic":
			return "magic"
		"crude":
			return "crude"
	if int(item.get("sockets", 0)) > 0:
		return "socketed"
	return "normal"


func _label_for(drop: Dictionary) -> Array:
	if drop.kind == "gold":
		return ["%d Gold" % int(drop.amount), Color("#f3d34a")]
	return [ItemText.item_name(drop.item), Color(ItemText.item_color(drop.item))]


func _landing_spot(origin: Vector2, i: int) -> Vector2:
	for tries in 24:
		var a := randf() * TAU
		var r := 24.0 + randf() * (34.0 + i * 5)
		var p := origin + Vector2(cos(a) * r, sin(a) * r * 0.7 + 8)
		if not nav.walkable(p, 4):
			continue
		var crowded := false
		for e in entries:
			if e.pos.distance_to(p) < 22:
				crowded = true
				break
		if not crowded:
			return p
	return origin + Vector2(randf_range(-15, 15), 12)


func spawn(drops: Array, origin: Vector2) -> void:
	for i in drops.size():
		add(drops[i], _landing_spot(origin, i), origin, i * 0.08)
	layout_labels()


func add(drop: Dictionary, at: Vector2, from: Variant = null, delay := 0.0) -> Dictionary:
	var tier_id := tier_of(drop)
	var tier: Dictionary = TIERS[tier_id]
	var col := Color(String(tier.color))
	var node := Node2D.new()
	node.position = at.round()
	add_child(node)

	# The floor ring (and, for the best drops, a dashed halo around it).
	var ring := Sprite2D.new()
	ring.texture = _ring_tex(int(tier.ring), bool(tier.halo))
	ring.material = glow_mat()
	ring.modulate = Color(col, 0.0)
	node.add_child(ring)

	# The beam, revealed from the floor up when the drop lands.
	var beam: Sprite2D = null
	var beam_h := int(tier.beam)
	if beam_h > 0:
		beam = Sprite2D.new()
		beam.texture = _beam_tex(beam_h)
		beam.centered = false
		beam.region_enabled = true
		beam.region_rect = Rect2(0, beam_h, BEAM_W, 0)
		beam.material = glow_mat()
		beam.modulate = col
		beam.visible = false
		node.add_child(beam)

	var light: PointLight2D = null
	if int(tier.light) > 0:
		light = PointLight2D.new()
		light.texture = Atmosphere.light_texture(int(tier.light))
		light.color = col
		light.energy = 0.0
		light.range_item_cull_mask = Atmosphere.LIGHT_MASK
		light.blend_mode = Light2D.BLEND_MODE_ADD
		light.position = Vector2(0, -6)
		node.add_child(light)

	var motes: CPUParticles2D = null
	if int(tier.motes) > 0:
		motes = _particles(col, int(tier.motes), clampf(beam_h / 30.0, 1.4, 5.0))
		motes.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
		motes.emission_rect_extents = Vector2(2, 1)
		motes.direction = Vector2.UP
		motes.spread = 4.0
		motes.gravity = Vector2(0, -4)
		motes.initial_velocity_min = 12.0
		motes.initial_velocity_max = 22.0
		motes.emitting = false
		node.add_child(motes)

	# In flight: a bright spark with a short trail.
	var spark: Sprite2D = null
	if from != null:
		spark = Sprite2D.new()
		spark.texture = _spark_tex()
		spark.material = glow_mat()
		spark.modulate = col.lerp(Color.WHITE, 0.35)
		spark.visible = false
		node.add_child(spark)
		var trail := _particles(col, 14, 0.28)
		trail.local_coords = false
		trail.scale_amount_min = 1.0
		trail.scale_amount_max = 2.0
		trail.initial_velocity_max = 0.0
		trail.gravity = Vector2.ZERO
		trail.emitting = false
		spark.add_child(trail)

	var info := _label_for(drop)
	var label := Fx.pixel_label(info[0], info[1], 10, 0)
	var bg := StyleBoxFlat.new()
	bg.bg_color = BG
	bg.content_margin_left = LABEL_PAD
	bg.content_margin_right = LABEL_PAD
	bg.content_margin_top = 0
	bg.content_margin_bottom = 0
	if tier.border:
		bg.set_border_width_all(1)
		bg.border_color = Color(col, 0.7)
		bg.content_margin_left = LABEL_PAD + 1
		bg.content_margin_right = LABEL_PAD + 1
		bg.content_margin_top = 1
		bg.content_margin_bottom = 1
	label.add_theme_stylebox_override("normal", bg)
	label_layer.add_child(label)
	label.reset_size()
	label.visible = false

	_seq += 1
	var e := {
		"id": _seq, "drop": drop, "pos": node.position, "node": node, "label": label, "bg": bg,
		"tier": tier, "color": col, "ring": ring, "beam": beam, "beam_h": beam_h, "light": light,
		"motes": motes, "spark": spark, "burst": null,
		"rect": Rect2(), "landed": false, "t": 0.0, "phase": randf() * TAU, "flash": 0.0, "hover": false,
		"anim": {} if from == null else {"from": from, "t": -delay, "dur": 0.5, "h": 26.0 + randf() * 10.0},
	}
	entries.append(e)
	if from == null:
		_land(e, false)
	return e


func remove(e: Dictionary) -> void:
	entries.erase(e)
	e.label.queue_free()
	if is_same(_hovered, e):
		_hovered = null
	var node: Node2D = e.node
	if e.light:
		e.light.queue_free()
	if e.motes:
		e.motes.emitting = false
	var tw := node.create_tween()
	tw.tween_property(node, "modulate:a", 0.0, 0.15)
	tw.tween_callback(node.queue_free)
	layout_labels()


## Stack labels upward so none overlap (bottom-most first).
func layout_labels() -> void:
	var placed: Array[Rect2] = []
	var sorted := entries.duplicate()
	sorted.sort_custom(func(a, b): return a.pos.y > b.pos.y)
	for e in sorted:
		var sz: Vector2 = e.label.size
		var r := Rect2(roundf(e.pos.x - sz.x / 2.0), roundf(e.pos.y - LABEL_LIFT - sz.y), sz.x, sz.y)
		for guard in 30:
			var hit := false
			for p in placed:
				if r.intersects(p):
					r.position.y = p.position.y - r.size.y - 1
					hit = true
					break
			if not hit:
				break
		e.rect = r
		e.label.position = r.position
		placed.append(r)


## Entry whose label (or floor ring) is under a world point.
func hit(p: Vector2):
	for i in range(entries.size() - 1, -1, -1):
		var e = entries[i]
		if not e.landed:
			continue
		if e.rect.has_point(p):
			return e
		if absf(p.x - e.pos.x) < 12 and absf(p.y - e.pos.y) < 7:
			return e
	return null


func set_hovered(e) -> void:
	if is_same(_hovered, e):
		return
	if _hovered:
		_hovered.bg.bg_color = BG
		_hovered.hover = false
	_hovered = e
	if e:
		e.bg.bg_color = BG_HOVER
		e.hover = true


func _process(delta: float) -> void:
	for e in entries:
		if e.anim.is_empty():
			_glow(e, delta)
			continue
		var a: Dictionary = e.anim
		a.t += delta
		var spark: Sprite2D = e.spark
		if a.t < 0:
			continue
		if not spark.visible:
			spark.visible = true
			spark.get_child(0).emitting = true
		var k := minf(1.0, a.t / a.dur)
		var p: Vector2 = a.from.lerp(e.pos, k) - Vector2(0, sin(k * PI) * a.h)
		spark.position = (p - e.pos).round()
		if k >= 1.0:
			e.anim = {}
			_land(e, true)


## Touchdown: flash, ring burst, the beam shoots up, the name appears.
func _land(e: Dictionary, flourish: bool) -> void:
	e.landed = true
	e.label.visible = true
	var tier: Dictionary = e.tier
	var col: Color = e.color
	var node: Node2D = e.node
	if e.spark:
		var spark: Sprite2D = e.spark
		spark.visible = false
		var trail: CPUParticles2D = spark.get_child(0)
		trail.emitting = false
		var tw := spark.create_tween()
		tw.tween_interval(0.4)
		tw.tween_callback(spark.queue_free)
		e.spark = null
	if e.beam:
		e.beam.visible = true
	if e.motes:
		e.motes.emitting = true
	if not flourish:
		e.t = 1.0
		return
	e.flash = 1.0
	if e.drop.kind == "gold":
		return
	var burst := Sprite2D.new()
	burst.material = glow_mat()
	burst.modulate = col.lerp(Color.WHITE, 0.25)
	burst.texture = _outline_tex(BURST_RADII[0])
	node.add_child(burst)
	e.burst = burst
	if int(tier.light) > 0:
		var puff := _particles(col, 6 + int(tier.motes), 0.7)
		puff.one_shot = true
		puff.explosiveness = 1.0
		puff.direction = Vector2.UP
		puff.spread = 40.0
		puff.initial_velocity_min = 20.0
		puff.initial_velocity_max = 46.0
		puff.gravity = Vector2(0, 30)
		puff.position = Vector2(0, -4)
		node.add_child(puff)
		puff.emitting = true
		var tw := puff.create_tween()
		tw.tween_interval(1.0)
		tw.tween_callback(puff.queue_free)


## Idle glow: the beam rises in, then breathes; hover brightens it.
func _glow(e: Dictionary, delta: float) -> void:
	e.t += delta
	var t: float = e.t
	var tier: Dictionary = e.tier
	var col: Color = e.color
	var glow: float = tier.glow
	var pulse := 0.88 + 0.12 * sin(t * 2.4 + float(e.phase))
	var lift := 0.3 if e.hover else 0.0
	var flash: float = e.flash
	if flash > 0.0:
		e.flash = maxf(0.0, flash - delta / 0.4)
	var bright := 1.0 + flash * 1.6
	e.ring.modulate = Color(col.r * bright, col.g * bright, col.b * bright, clampf(glow * pulse + lift, 0.0, 1.0))
	if e.beam:
		var beam: Sprite2D = e.beam
		var h: int = e.beam_h
		var shown := h if t >= 0.22 else maxi(1, roundi(h * ease(t / 0.22, 0.4)))
		beam.region_rect = Rect2(0, h - shown, BEAM_W, shown)
		beam.position = Vector2(-(BEAM_W / 2), -shown - 1)
		beam.modulate = Color(col.r * bright, col.g * bright, col.b * bright, clampf(glow * pulse + lift, 0.0, 1.0))
	if e.light:
		var light: PointLight2D = e.light
		var rise := minf(1.0, t / 0.3)
		light.energy = float(tier.energy) * rise * (0.9 + 0.1 * sin(t * 2.4 + float(e.phase))) * (1.0 + flash)
	if e.burst:
		var burst: Sprite2D = e.burst
		var f := int(t / 0.05)
		if f >= BURST_RADII.size():
			burst.queue_free()
			e.burst = null
		else:
			burst.texture = _outline_tex(BURST_RADII[f])
			burst.modulate.a = 1.0 - float(f) / BURST_RADII.size()


# -------------------------------------------------------------- textures
static func glow_mat() -> CanvasItemMaterial:
	if _mat == null:
		_mat = CanvasItemMaterial.new()
		_mat.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
		_mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	return _mat


static func _particles(col: Color, amount: int, lifetime: float) -> CPUParticles2D:
	var p := CPUParticles2D.new()
	p.amount = amount
	p.lifetime = lifetime
	var ramp := Gradient.new()
	ramp.colors = PackedColorArray([col.lerp(Color.WHITE, 0.4), Color(col, 0.0)])
	p.color_ramp = ramp
	p.material = glow_mat()
	return p


## Pixels of a 1px ellipse outline around (0, 0).
static func _ellipse(rx: int, ry: int) -> Array[Vector2i]:
	var pts: Array[Vector2i] = []
	var steps := maxi(24, rx * 12)
	for i in steps:
		var a := TAU * i / steps
		var p := Vector2i(roundi(cos(a) * rx), roundi(sin(a) * ry))
		if not pts.has(p):
			pts.append(p)
	return pts


static func _ry(rx: int) -> int:
	return maxi(2, roundi(rx * 0.45))


## Floor ring: a soft glow pool with a crisp 1px rim (+ dashed halo).
static func _ring_tex(rx: int, halo: bool) -> Texture2D:
	var key := "ring%d%s" % [rx, "h" if halo else ""]
	if _tex.has(key):
		return _tex[key]
	var ry := _ry(rx)
	var cx := rx + (5 if halo else 1)
	var cy := ry + (3 if halo else 1)
	var img := Image.create_empty(cx * 2 + 1, cy * 2 + 1, false, Image.FORMAT_RGBA8)
	for y in img.get_height():
		for x in img.get_width():
			var d := Vector2((x - cx) / float(rx), (y - cy) / float(ry)).length()
			if d < 1.0:
				img.set_pixel(x, y, Color(1, 1, 1, pow(1.0 - d, 1.1) * 0.75))
	for p in _ellipse(rx, ry):
		img.set_pixel(cx + p.x, cy + p.y, Color(1, 1, 1, 0.95))
	if halo:
		var hp := _ellipse(rx + 4, ry + 2)
		for i in hp.size():
			if i % 4 < 2:
				img.set_pixel(cx + hp[i].x, cy + hp[i].y, Color(1, 1, 1, 0.45))
	var t := ImageTexture.create_from_image(img)
	_tex[key] = t
	return t


static func _outline_tex(rx: int) -> Texture2D:
	var key := "outline%d" % rx
	if _tex.has(key):
		return _tex[key]
	var ry := _ry(rx)
	var img := Image.create_empty(rx * 2 + 3, ry * 2 + 3, false, Image.FORMAT_RGBA8)
	for p in _ellipse(rx, ry):
		img.set_pixel(rx + 1 + p.x, ry + 1 + p.y, Color(1, 1, 1, 0.9))
	var t := ImageTexture.create_from_image(img)
	_tex[key] = t
	return t


## A beam: bright 1px core, soft sides, fading out towards the top.
static func _beam_tex(h: int) -> Texture2D:
	var key := "beam%d" % h
	if _tex.has(key):
		return _tex[key]
	var img := Image.create_empty(BEAM_W, h, false, Image.FORMAT_RGBA8)
	for y in h:
		var v := pow(float(y + 1) / h, 1.15)
		for x in BEAM_W:
			var c: float = BEAM_COLS[x]
			img.set_pixel(x, y, Color(1, 1, 1, clampf(c * v, 0.0, 1.0)))
	var t := ImageTexture.create_from_image(img)
	_tex[key] = t
	return t


static func _spark_tex() -> Texture2D:
	if _tex.has("spark"):
		return _tex.spark
	var img := Image.create_empty(7, 7, false, Image.FORMAT_RGBA8)
	for y in 7:
		for x in 7:
			var d := Vector2(x - 3, y - 3).length() / 3.5
			img.set_pixel(x, y, Color(1, 1, 1, 1.0 if d == 0.0 else pow(maxf(0.0, 1.0 - d), 1.5)))
	var t := ImageTexture.create_from_image(img)
	_tex.spark = t
	return t
