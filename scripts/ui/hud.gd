class_name Hud
extends Control
## D2-style bottom bar: life orb, XP bar, gold and menu buttons, and the
## rejuvenation flask orb (Q). Plus the hover name plate, the zone/floor title
## and toasts. The orbs read the hero live (life changes every hit), the bar
## rebuilds only on Game.changed.

var _bar: PanelContainer
var _life: Orb
var _flask: Orb
var _plate: PanelContainer
var _toasts: VBoxContainer
var _zone: VBoxContainer
var _zone_title: Label
var _zone_sub: Label
var _boss: BossBar


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	_life = Orb.new()
	_life.label = "Life"
	_life.top = Color("#e0533f")
	_life.bottom = Color("#7a1d14")
	add_child(_life)
	_flask = Orb.new()
	_flask.label = "Flask"
	_flask.top = Color("#c68cff")
	_flask.bottom = Color("#3d1b7a")
	_flask.tip = _flask_tip
	_flask.clicked = func(): Game.drink_flask()
	add_child(_flask)
	_bar = PanelContainer.new()
	_bar.add_theme_stylebox_override("panel", UiKit.frame(5))
	_bar.mouse_filter = MOUSE_FILTER_STOP
	add_child(_bar)

	_zone = UiKit.vbox(0)
	_zone_title = UiKit.shadowed(UiKit.label("Thornwick", "head", UiKit.GOLD))
	_zone_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_zone.add_child(_zone_title)
	_zone_sub = UiKit.shadowed(UiKit.label("TOWN · SAFE", "label", UiKit.DIM))
	_zone_sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_zone.add_child(_zone_sub)
	add_child(_zone)

	_plate = PanelContainer.new()
	_plate.add_theme_stylebox_override("panel", UiKit.frame(4))
	_plate.mouse_filter = MOUSE_FILTER_IGNORE
	_plate.visible = false
	add_child(_plate)

	_toasts = UiKit.vbox(2)
	_toasts.alignment = BoxContainer.ALIGNMENT_BEGIN
	add_child(_toasts)

	_boss = BossBar.new()
	_boss.visible = false
	add_child(_boss)

	Game.changed.connect(_rebuild_bar)
	Game.ui_changed.connect(_on_ui)
	Game.toast_added.connect(_toast)
	View.changed.connect(_layout)
	_rebuild_bar()
	_on_ui(["hover_name", "zone_title"])


func _process(_d: float) -> void:
	if not Game.has_hero():
		return
	var sheet := Game.sheet()
	var life := float(Game.hero().life)
	if life != _life.value or float(sheet.life) != _life.max_value:
		_life.value = life
		_life.max_value = sheet.life
		_life.queue_redraw()
	var f := Game.flask_fraction()
	if f != _flask.value:
		_flask.value = f
		_flask.max_value = 1.0
		_flask.queue_redraw()
	var b = Arena.current.boss if Arena.current and is_instance_valid(Arena.current.boss) else null
	_boss.visible = b != null and not b.dead
	if _boss.visible:
		_boss.set_boss(b.title(), b.life / b.max_life)
		_boss.position = Vector2(roundf((View.ui_size.x - _boss.size.x) / 2.0), 28)


func _flask_tip() -> Array:
	var fl: Dictionary = Game.sheet().flask
	var lines := ["Restores %d life. Recovers in %ss." % [int(fl.heal), UiKit.fmt_num(snappedf(fl.cooldown, 0.1))]]
	lines.append("Ready - press Q" if Game.flask_fraction() >= 1.0 else "Refilling...")
	if int(fl.tier) < CharacterSheet.FLASK_TIERS.size() - 1:
		var nxt: Dictionary = CharacterSheet.FLASK_TIERS[int(fl.tier) + 1]
		lines.append("Mother Ysolde brews a %s once you reach floor %d." % [String(nxt.name).replace(" Rejuvenation Flask", ""), int(nxt.floor)])
	return [fl.name, lines]


func _layout() -> void:
	var ui := View.ui_size
	size = ui
	_life.position = Vector2(4, ui.y - 46)
	_flask.position = Vector2(ui.x - 48, ui.y - 46)
	var w := minf(560.0, ui.x - 104)
	_bar.custom_minimum_size.x = w
	_bar.reset_size()
	_bar.position = Vector2(roundf((ui.x - _bar.size.x) / 2.0), ui.y - 3 - _bar.size.y)
	_zone.reset_size()
	_zone.position = Vector2(ui.x - 8 - _zone.size.x, 6)
	_place_plate()
	_toasts.reset_size()
	_toasts.position = Vector2(roundf((ui.x - _toasts.size.x) / 2.0), 40)


func _place_plate() -> void:
	_plate.reset_size()
	var off := 90.0 if Game.ui.left != "" else 0.0
	_plate.position = Vector2(roundf((View.ui_size.x - _plate.size.x) / 2.0 + off), 6)


func _on_ui(keys: Array) -> void:
	if "hover_name" in keys or "left" in keys or "overlay" in keys:
		for c in _plate.get_children():
			_plate.remove_child(c)
			c.queue_free()
		var h: Dictionary = Game.ui.hover_name
		_plate.visible = not h.is_empty() and Game.ui.overlay == ""
		if _plate.visible:
			var v := UiKit.vbox(0)
			var t := UiKit.label(h.text, "t10", Color(h.get("color", "#e8dcc0")))
			t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			v.add_child(t)
			if h.get("sub", "") != "":
				var s := UiKit.label(String(h.sub).to_upper(), "label", UiKit.DIM)
				s.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
				v.add_child(s)
			_plate.add_child(v)
		_place_plate.call_deferred()
	if "zone_title" in keys or "zone_sub" in keys:
		_zone_title.text = Game.ui.get("zone_title", "Thornwick")
		_zone_sub.text = String(Game.ui.get("zone_sub", "")).to_upper()
		_layout.call_deferred()
	if "left" in keys or "right" in keys or "location" in keys:
		_rebuild_bar()


func _toast(text: String, color: String) -> void:
	var l := UiKit.label(text, "t10", Color(color) if color != "" else UiKit.PARCH)
	var bg := StyleBoxFlat.new()
	bg.bg_color = Color(0, 0, 0, 0.6)
	bg.content_margin_left = 6
	bg.content_margin_right = 6
	bg.content_margin_top = 1
	bg.content_margin_bottom = 1
	l.add_theme_stylebox_override("normal", bg)
	l.size_flags_horizontal = SIZE_SHRINK_CENTER
	_toasts.add_child(l)
	while _toasts.get_child_count() > 6:
		_toasts.get_child(0).free()
	_layout.call_deferred()
	get_tree().create_timer(3.8).timeout.connect(func():
		if is_instance_valid(l):
			l.queue_free()
			_layout.call_deferred())


func _toggle_left(p: String) -> void:
	Game.set_ui({"left": "" if Game.ui.left == p else p, "dialog": {}})


func _rebuild_bar() -> void:
	if not Game.has_hero():
		return
	var hero := Game.hero()
	for c in _bar.get_children():
		_bar.remove_child(c)
		c.queue_free()
	var v := UiKit.vbox(2)
	var need := HeroData.xp_to_next(int(hero.level))
	var xp := UiKit.bar(float(hero.xp) / need, UiKit.GOLD, 0, 2)
	xp.gui_input.connect(func(e): if e is InputEventMouseMotion: UiTip.text(xp, "", ["Level %d" % int(hero.level), "%d / %d xp" % [int(hero.xp), need]]))
	v.add_child(xp)
	var row := UiKit.hbox(3)
	row.add_child(UiKit.label(" Lv %d" % int(hero.level), "t10", UiKit.PARCH))
	row.add_child(UiKit.label("  %sg" % UiKit.fmt_int(int(hero.gold)), "t10", UiKit.GOLD))
	row.add_child(UiKit.label("  Best floor %d" % int(hero.get("bestFloor", 0)), "t10", UiKit.DIM))
	row.add_child(UiKit.spacer())
	var ui := Game.ui
	var unspent := int(hero.attrPoints) > 0
	var buttons := [
		["Char!" if unspent else "Char", "C", ui.left == "character", func(): _toggle_left("character")],
		["Inv", "I", ui.right == "inventory", func(): Game.set_ui({"right": "" if Game.ui.right != "" else "inventory"})],
		["Codex", "L", ui.left == "codex", func(): _toggle_left("codex")],
		["Opts", "O", ui.left == "options", func(): _toggle_left("options")],
	]
	if ui.get("location", "town") == "dungeon":
		buttons.append(["Town", "T", false, func(): Game.return_to_town()])
	if Platform.dev_tools:
		buttons.append(["Lab", "`", ui.left == "lab", func(): _toggle_left("lab")])
	var btns := UiKit.hbox(2)
	for b in buttons:
		var btn := UiKit.button(b[0], b[3], 4, b[2])
		var hk := UiKit.label(b[1], "label", UiKit.DIM)
		btn.text = String(b[0]) + "  "
		hk.position = Vector2(0, 4)
		btn.add_child(hk)
		btn.resized.connect(func(): hk.position = Vector2(btn.size.x - 9, 4))
		btns.add_child(btn)
	row.add_child(btns)
	v.add_child(row)
	_bar.add_child(v)
	_layout.call_deferred()


class Orb extends Control:
	var value := 1.0
	var max_value := 1.0
	var top := Color.RED
	var bottom := Color.DARK_RED
	var label := ""
	## Optional: tooltip provider -> [title, lines], and a click action.
	var tip: Callable
	var clicked: Callable

	func _init() -> void:
		custom_minimum_size = Vector2(44, 44)
		size = Vector2(44, 44)
		mouse_filter = MOUSE_FILTER_STOP

	func _gui_input(e: InputEvent) -> void:
		if e is InputEventMouseMotion:
			if tip.is_valid():
				var t: Array = tip.call()
				UiTip.text(self, t[0], t[1])
			else:
				UiTip.text(self, "", ["%s: %d / %d" % [label, roundi(value), int(max_value)]])
		elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT and clicked.is_valid():
			clicked.call()
			accept_event()

	func _draw() -> void:
		var r := 22.0
		var pct := clampf(value / max_value, 0.0, 1.0) if max_value > 0 else 0.0
		var level := 44.0 - roundf(pct * 44.0)
		# Rings outside the orb: black, bright edge, dark (1px each).
		for ring in [[r + 3, UiKit.DARK], [r + 2, UiKit.EDGE_HI], [r + 1, Color.BLACK]]:
			_disc(ring[0], ring[1])
		for y in 44:
			var dy := y + 0.5 - r
			var hw := floorf(sqrt(maxf(0.0, r * r - dy * dy)) + 0.5)
			if hw <= 0:
				continue
			var c := Color("#0a0806")
			if y >= level:
				c = top.lerp(bottom, float(y) / 43.0)
			draw_rect(Rect2(r - hw, y, hw * 2, 1), c)
		draw_rect(Rect2(9, 6, 12, 8), Color(1, 1, 1, 0.0))
		# A soft highlight blob (D2 glass).
		for hy in 8:
			var w := floorf(6.0 * sqrt(maxf(0.0, 1.0 - pow((hy + 0.5 - 4.0) / 4.0, 2))))
			draw_rect(Rect2(15 - w, 6 + hy, w * 2, 1), Color(1, 1, 1, 0.25))

	func _disc(rad: float, c: Color) -> void:
		var r := 22.0
		for y in range(-int(rad), int(rad)):
			var dy := y + 0.5
			var hw := floorf(sqrt(maxf(0.0, rad * rad - dy * dy)) + 0.5)
			if hw > 0:
				draw_rect(Rect2(r - hw, r + y, hw * 2, 1), c)


## The Warden's life, top-centre.
class BossBar extends Control:
	var label := ""
	var frac := 1.0

	func _init() -> void:
		size = Vector2(260, 18)
		mouse_filter = MOUSE_FILTER_IGNORE

	func set_boss(n: String, f: float) -> void:
		if n != label or not is_equal_approx(f, frac):
			label = n
			frac = clampf(f, 0.0, 1.0)
			queue_redraw()

	func _draw() -> void:
		var r := Rect2(0, 8, size.x, 6)
		draw_rect(r.grow(2), Color.BLACK)
		draw_rect(r.grow(1), UiKit.EDGE_HI)
		draw_rect(r, Color("#2a0d0a"))
		draw_rect(Rect2(r.position, Vector2(roundf(size.x * frac), r.size.y)), Color("#c0392b"))
		var tw := UiKit.F_BODY.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
		var p := Vector2(roundf((size.x - tw) / 2.0), 5)
		draw_string(UiKit.F_BODY, p + Vector2(1, 1), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, Color.BLACK)
		draw_string(UiKit.F_BODY, p, label, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UiKit.GOLD)

