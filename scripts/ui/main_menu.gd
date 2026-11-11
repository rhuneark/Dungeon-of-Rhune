class_name MainMenu
extends Control
## Title screen: continue / new hero / delete save / options / quit.

const OPTIONS := preload("res://scripts/ui/panels/options_panel.gd")

var creating := false
var confirm := false
var _options: UiPanel
var _name := ""


func _ready() -> void:
	creating = not Game.has_hero()
	View.changed.connect(_rebuild)
	_rebuild()


func _rebuild() -> void:
	for c in get_children():
		if c != _options:
			remove_child(c)
			c.queue_free()
	size = View.ui_size
	mouse_filter = MOUSE_FILTER_STOP

	var bg := TextureRect.new()
	var grad := Gradient.new()
	grad.set_color(0, Color("#241a12"))
	grad.set_color(1, UiKit.INK)
	grad.set_offset(1, 0.7)
	var gt := GradientTexture2D.new()
	gt.gradient = grad
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(1.0, 0.5)
	gt.width = 256
	gt.height = 144
	bg.texture = gt
	bg.stretch_mode = TextureRect.STRETCH_SCALE
	bg.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	bg.texture_filter = CanvasItem.TEXTURE_FILTER_LINEAR
	bg.size = size
	bg.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(bg)

	var col := UiKit.vbox(8)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	col.size = size
	var t := UiKit.label("Dungeon of Rhune", "logo", UiKit.GOLD)
	t.add_theme_color_override("font_shadow_color", Color.BLACK)
	t.add_theme_constant_override("shadow_offset_x", 2)
	t.add_theme_constant_override("shadow_offset_y", 2)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t)
	var sub := UiKit.label("Thornwick waits above the Sealed Stair.", "t10", UiKit.DIM)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(sub)
	col.add_child(UiKit.gap(6))

	var box := PanelContainer.new()
	box.add_theme_stylebox_override("panel", UiKit.frame(11))
	box.custom_minimum_size.x = 240
	box.size_flags_horizontal = SIZE_SHRINK_CENTER
	var v := UiKit.vbox(6)
	box.add_child(v)
	if not creating and Game.has_hero():
		var hero := Game.hero()
		var n := UiKit.label(hero.name, "t20")
		n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(n)
		var lv := UiKit.label("Level %d %s" % [int(hero.level), Disciplines.combo_title(hero.disciplines[0], hero.disciplines[1])], "t10", UiKit.GOLD)
		lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(lv)
		v.add_child(UiKit.button("Continue", _play, 6))
		v.add_child(UiKit.button("New hero (replaces this one)", func():
			creating = true
			_rebuild()))
		if not confirm:
			v.add_child(UiKit.button("Delete save", func():
				confirm = true
				_rebuild()))
		else:
			var b := UiKit.button("Really delete everything?", _wipe)
			b.add_theme_color_override("font_color", UiKit.BAD)
			v.add_child(b)
	else:
		var p := UiKit.label("Name your wanderer", "t10", UiKit.DIM)
		p.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(p)
		var input := LineEdit.new()
		input.max_length = 16
		input.placeholder_text = "Wanderer"
		input.text = _name
		input.alignment = HORIZONTAL_ALIGNMENT_CENTER
		input.add_theme_font_size_override("font_size", 20)
		input.text_changed.connect(func(s): _name = s)
		input.text_submitted.connect(func(_s): _start())
		v.add_child(input)
		input.grab_focus.call_deferred()
		v.add_child(UiKit.button("Enter Thornwick", _start))
		if Game.has_hero():
			v.add_child(UiKit.button("Back", func():
				creating = false
				_rebuild()))
		v.add_child(UiKit.para("No classes. Choose two Disciplines as you go; everything that makes sense, works.", "t10", UiKit.DIM, HORIZONTAL_ALIGNMENT_CENTER))
	col.add_child(box)

	var row := UiKit.hbox(4)
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_child(UiKit.button("Options", _open_options))
	if Platform.can_quit():
		row.add_child(UiKit.button("Quit to desktop", func(): Platform.quit()))
	col.add_child(row)
	add_child(col)

	var hint := UiKit.label("CLICK TO MOVE · I C K Q L O · %sESC" % ("` LOOT LAB · " if Platform.dev_tools else ""), "label", UiKit.FAINT)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.size = Vector2(size.x, 10)
	hint.position = Vector2(0, size.y - 16)
	add_child(hint)
	if _options:
		move_child(_options, -1)


func _open_options() -> void:
	if _options:
		return
	_options = OPTIONS.new()
	_options.on_close = func():
		_options.queue_free()
		_options = null
	add_child(_options)


func _start() -> void:
	var nm := _name.strip_edges()
	Game.save.hero = HeroData.new_hero(nm if nm != "" else "Wanderer")
	QuestRules.start_auto_quests(Game.save.hero)
	Game.commit()
	_enter()
	get_tree().create_timer(0.6).timeout.connect(func(): Game.toast("Welcome to Thornwick. Talk to Old Varn (the tower, north-east of the square).", "#d9b26a"))


func _play() -> void:
	_enter()


func _enter() -> void:
	Game.set_ui({"left": "", "right": "", "overlay": "", "dialog": {}, "cursor_mode": "", "hover_name": {}})
	Game.set_ui({"phase": "playing"})


func _wipe() -> void:
	SaveIO.wipe_save()
	Game.save = HeroData.default_save()
	Game.commit()
	confirm = false
	creating = true
	_rebuild()
