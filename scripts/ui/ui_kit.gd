class_name UiKit
## Palette, pixel fonts, pixel frames and small widget factories for the UI.
## Everything is in UI PIXELS; the UI CanvasLayer scales by View.ui_scale.
## Text is the plain Jersey 10 (crisp at 10 and 20); the gothic Jacquarda
## Bastarda 9 is only for the game's logo (36).

const F_BODY := preload("res://assets/fonts/jersey10.woff2")
const F_TITLE := preload("res://assets/fonts/jacquarda9.woff2")

const INK := Color("#0d0b09")
const PANEL := Color("#17120e")
const PANEL2 := Color("#221a13")
const PANEL3 := Color("#2c2219")
const EDGE := Color("#4a3826")
const EDGE_HI := Color("#8a6a42")
const DARK := Color("#120d09")
const WELL := Color("#0e0b08")
const ROW_LINE := Color("#241b13")
const GOLD := Color("#d9b26a")
const PARCH := Color("#e8dcc0")
const DIM := Color("#bcae92")
const FAINT := Color("#82765f")
const MAGIC := Color("#7896ff")
const RARE := Color("#f3d34a")
const UNIQUE := Color("#c9a46b")
const RHUNE := Color("#ff9b3d")
const GOOD := Color("#6fbf5a")
const BAD := Color("#d9534f")

## style id -> [font, size]. t10 body, t20 big text, head = window titles,
## label = captions (same face as body; colour sets them apart), logo = title screen.
const STYLES := {
	"t10": [F_BODY, 10], "t20": [F_BODY, 20],
	"head": [F_BODY, 20], "label": [F_BODY, 10],
	"logo": [F_TITLE, 36],
}

static var _theme: Theme
static var _cache := {}


# ------------------------------------------------------------ pixel frames
## A (2n+1)² image of concentric 1px rings around a centre colour, used as a
## 9-slice StyleBoxTexture so every frame line is exactly one UI pixel.
static func _rings(rings: Array, center: Color) -> ImageTexture:
	var n := rings.size()
	var s := n * 2 + 1
	var img := Image.create(s, s, false, Image.FORMAT_RGBA8)
	img.fill(center)
	for i in n:
		var c: Color = rings[i]
		for k in range(i, s - i):
			img.set_pixel(k, i, c)
			img.set_pixel(k, s - 1 - i, c)
			img.set_pixel(i, k, c)
			img.set_pixel(s - 1 - i, k, c)
	return ImageTexture.create_from_image(img)


static func _sb(tex: Texture2D, margin: int, content: Array) -> StyleBoxTexture:
	var sb := StyleBoxTexture.new()
	sb.texture = tex
	sb.texture_margin_left = margin
	sb.texture_margin_top = margin
	sb.texture_margin_right = margin
	sb.texture_margin_bottom = margin
	sb.content_margin_left = content[0]
	sb.content_margin_top = content[1]
	sb.content_margin_right = content[2]
	sb.content_margin_bottom = content[3]
	return sb


## The panel frame (black, bright edge, dark, edge, then panel fill).
static func frame(pad := 7, fill := PANEL) -> StyleBoxTexture:
	var key := "frame%d%s" % [pad, fill.to_html()]
	if not _cache.has(key):
		_cache[key] = _sb(_rings([Color.BLACK, EDGE_HI, DARK, EDGE], fill), 4, [pad, pad, pad, pad])
	return _cache[key]


static func tip_frame() -> StyleBoxTexture:
	if not _cache.has("tip"):
		_cache.tip = _sb(_rings([Color.BLACK, EDGE_HI, DARK, EDGE], Color(10 / 255.0, 8 / 255.0, 6 / 255.0, 0.94)), 4, [9, 6, 9, 6])
	return _cache.tip


## Sunken well (inventory cells, slots, bars).
static func inset(pad := 2, fill := WELL) -> StyleBoxTexture:
	var key := "inset%d%s" % [pad, fill.to_html()]
	if not _cache.has(key):
		_cache[key] = _sb(_rings([Color.BLACK, EDGE], fill), 2, [pad, pad, pad, pad])
	return _cache[key]


static func _btn_tex(bg: Color, top: Color, bottom: Color) -> ImageTexture:
	var img := Image.create(5, 5, false, Image.FORMAT_RGBA8)
	img.fill(Color.BLACK)
	for x in range(1, 4):
		img.set_pixel(x, 1, top)
		img.set_pixel(x, 2, bg)
		img.set_pixel(x, 3, bottom)
	return ImageTexture.create_from_image(img)


static func btn_box(state: String, px := 6) -> StyleBoxTexture:
	var key := "btn_%s_%d" % [state, px]
	if not _cache.has(key):
		var tex: ImageTexture
		match state:
			"hover": tex = _btn_tex(Color("#3a2d20"), EDGE_HI, DARK)
			"pressed": tex = _btn_tex(PANEL3, DARK, EDGE_HI)
			"disabled": tex = _btn_tex(PANEL2, EDGE_HI, DARK)
			_: tex = _btn_tex(PANEL3, EDGE_HI, DARK)
		_cache[key] = _sb(tex, 2, [px + 1, 3, px + 1, 4])
	return _cache[key]


# ------------------------------------------------------------------- theme
static func theme() -> Theme:
	if _theme:
		return _theme
	var t := Theme.new()
	t.default_font = F_BODY
	t.default_font_size = 10
	t.set_color("font_color", "Label", PARCH)
	t.set_constant("line_spacing", "Label", 0)

	for st in ["normal", "hover", "pressed", "disabled"]:
		t.set_stylebox(st, "Button", btn_box(st))
	t.set_stylebox("hover_pressed", "Button", btn_box("pressed"))
	t.set_stylebox("focus", "Button", StyleBoxEmpty.new())
	t.set_color("font_color", "Button", PARCH)
	t.set_color("font_hover_color", "Button", Color.WHITE)
	t.set_color("font_pressed_color", "Button", Color.WHITE)
	t.set_color("font_hover_pressed_color", "Button", Color.WHITE)
	t.set_color("font_focus_color", "Button", PARCH)
	t.set_color("font_disabled_color", "Button", FAINT)

	t.set_stylebox("normal", "LineEdit", inset(4))
	t.set_stylebox("focus", "LineEdit", StyleBoxEmpty.new())
	t.set_stylebox("read_only", "LineEdit", inset(4))
	t.set_color("font_color", "LineEdit", PARCH)
	t.set_color("font_placeholder_color", "LineEdit", FAINT)
	t.set_color("caret_color", "LineEdit", GOLD)
	t.set_color("selection_color", "LineEdit", Color(GOLD, 0.35))

	t.set_stylebox("panel", "PanelContainer", frame())

	var grab := StyleBoxFlat.new()
	grab.bg_color = EDGE
	grab.content_margin_left = 2
	grab.content_margin_right = 2
	var grab_hi := grab.duplicate()
	grab_hi.bg_color = EDGE_HI
	var track := StyleBoxFlat.new()
	track.bg_color = WELL
	track.content_margin_left = 2
	track.content_margin_right = 2
	t.set_stylebox("scroll", "VScrollBar", track)
	t.set_stylebox("grabber", "VScrollBar", grab)
	t.set_stylebox("grabber_highlight", "VScrollBar", grab_hi)
	t.set_stylebox("grabber_pressed", "VScrollBar", grab_hi)
	for ic in ["increment", "decrement", "increment_highlight", "decrement_highlight", "increment_pressed", "decrement_pressed"]:
		t.set_icon(ic, "VScrollBar", ImageTexture.create_from_image(Image.create(1, 1, false, Image.FORMAT_RGBA8)))
	_theme = t
	return t


# ----------------------------------------------------------------- widgets
static func label(text: String, style := "t10", color := PARCH) -> Label:
	var l := Label.new()
	l.text = text
	var s: Array = STYLES[style]
	l.add_theme_font_override("font", s[0])
	l.add_theme_font_size_override("font_size", s[1])
	l.add_theme_color_override("font_color", color)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


## Word-wrapped label that fills its container's width.
static func para(text: String, style := "t10", color := PARCH, align := HORIZONTAL_ALIGNMENT_LEFT) -> Label:
	var l := label(text, style, color)
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.horizontal_alignment = align
	l.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	l.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
	l.custom_minimum_size.x = 1
	return l


static func shadowed(l: Label) -> Label:
	l.add_theme_color_override("font_shadow_color", Color.BLACK)
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	l.add_theme_constant_override("shadow_outline_size", 0)
	return l


static func button(text: String, on_press: Callable = Callable(), px := 6, active := false) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	if px != 6:
		for st in ["normal", "hover", "pressed", "disabled"]:
			b.add_theme_stylebox_override(st, btn_box(st, px))
		b.add_theme_stylebox_override("hover_pressed", btn_box("pressed", px))
	if active:
		b.add_theme_color_override("font_color", GOLD)
		b.add_theme_color_override("font_hover_color", GOLD)
	if on_press.is_valid():
		b.pressed.connect(on_press)
	return b


static func hbox(gap := 4) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", gap)
	h.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return h


static func vbox(gap := 2) -> VBoxContainer:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", gap)
	v.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return v


static func spacer() -> Control:
	var c := Control.new()
	c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


static func gap(h: int) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return c


static func hline(color := EDGE) -> ColorRect:
	var r := ColorRect.new()
	r.color = color
	r.custom_minimum_size = Vector2(0, 1)
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return r


## Sunken box around content.
static func well(content: Control, pad := 2) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", inset(pad))
	p.mouse_filter = Control.MOUSE_FILTER_PASS
	p.add_child(content)
	return p


## Horizontal fill bar in a sunken well (xp, discipline rank).
static func bar(pct: float, color: Color, w := 0, h := 4) -> Control:
	var c := _Bar.new()
	c.pct = clampf(pct, 0.0, 1.0)
	c.color = color
	c.custom_minimum_size = Vector2(w, h + 2)
	if w == 0:
		c.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	c.mouse_filter = Control.MOUSE_FILTER_PASS
	return c


class _Bar extends Control:
	var pct := 0.0
	var color := GOLD

	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), Color.BLACK)
		draw_rect(Rect2(Vector2.ONE, size - Vector2(2, 2)), UiKit.WELL)
		draw_rect(Rect2(Vector2.ONE, Vector2(floorf((size.x - 2) * pct), size.y - 2)), color)


## A row in the Character sheet: label left, value right, faint underline.
static func stat_row(name: String, value: String, color := PARCH) -> Control:
	var v := vbox(0)
	var h := hbox(4)
	h.add_child(label(name, "t10", DIM))
	h.add_child(spacer())
	h.add_child(label(value, "t10", color))
	v.add_child(h)
	v.add_child(hline(ROW_LINE))
	return v


static func fmt_int(n: int) -> String:
	var s := str(absi(n))
	var out := ""
	while s.length() > 3:
		out = "," + s.substr(s.length() - 3) + out
		s = s.substr(0, s.length() - 3)
	return ("-" if n < 0 else "") + s + out


static func fmt_num(v: float, decimals := 1) -> String:
	return str(int(v)) if is_equal_approx(v, roundf(v)) else String.num(v, decimals)


## Discipline-coloured letter tile standing in for skill icons.
static func skill_glyph(skill: Dictionary, sz := 28, dim := false) -> Control:
	var d := Disciplines.get_discipline(skill.discipline)
	var color: Color = FAINT if dim else Color(d.get("color", "#aaaaaa"))
	var p := PanelContainer.new()
	var sb := _sb(_rings([Color("#3a2c1e") if dim else color], WELL), 1, [0, 0, 0, 0])
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2(sz, sz)
	p.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var l := label(String(skill.name).substr(0, 1), "t20" if sz >= 28 else "t10", color)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	p.add_child(l)
	return p
