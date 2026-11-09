extends UiPanel
## Loot Lab (dev tool, toggle with `): roll any treasure class at any level
## with any fortune, or simulate thousands of drops to see the odds. This is
## where loot tuning happens.

const ORDER := ["gold", "consumable", "crude", "normal", "superior", "magic", "rare", "unique", "rhune"]

var tc := "elite"
var level := 12
var use_mine := true
var rf := 100
var seek := {}
var sim := {}


func _init() -> void:
	title = "Loot Lab"
	panel_width = 350


func _fortune() -> Dictionary:
	if use_mine:
		return Game.sheet().fortune
	return {"rarity": rf, "quantity": 0, "gold": 0, "seek": seek.duplicate()}


## [-] value [+] (shift = x10)
func _stepper(value: int, setter: Callable, mn := 0, mx := 999, step := 1) -> HBoxContainer:
	var h := UiKit.hbox(1)
	var dec := func():
		var k := step * (10 if Input.is_key_pressed(KEY_SHIFT) else 1)
		setter.call(clampi(value - k, mn, mx))
		mark()
	var inc := func():
		var k := step * (10 if Input.is_key_pressed(KEY_SHIFT) else 1)
		setter.call(clampi(value + k, mn, mx))
		mark()
	h.add_child(UiKit.button("-", dec, 3))
	var l := UiKit.label(str(value), "t10", UiKit.PARCH)
	l.custom_minimum_size.x = 26
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	h.add_child(l)
	h.add_child(UiKit.button("+", inc, 3))
	return h


func _cycle_tc(dir: int) -> void:
	var all: Array = TreasureClasses.all()
	var i := 0
	for k in all.size():
		if all[k].id == tc:
			i = k
	tc = all[posmod(i + dir, all.size())].id
	sim = {}
	mark()


func _set_level(v: int) -> void:
	level = v


func _set_rf(v: int) -> void:
	rf = v


func _toggle_mine() -> void:
	use_mine = not use_mine
	mark()


func _roll(n: int) -> void:
	var drops := []
	for i in n:
		drops.append_array(Loot.roll_treasure(tc, {"ilvl": level, "fortune": _fortune()}))
	Game.spawn_drops(drops, "player")


func _simulate() -> void:
	sim = Loot.simulate_drops(tc, {"ilvl": level, "fortune": _fortune()}, 5000)
	mark()


func build(body: VBoxContainer) -> void:
	body.add_child(UiKit.para("Dev tool: toggle with the ` key. Rolls real drops at your feet.", "t10", UiKit.DIM, HORIZONTAL_ALIGNMENT_CENTER))
	var row := UiKit.hbox(4)
	row.add_child(UiKit.label("Source", "t10", UiKit.DIM))
	row.add_child(UiKit.button("<", _cycle_tc.bind(-1), 3))
	var tcl := UiKit.label(TreasureClasses.get_tc(tc).get("name", tc), "t10", UiKit.GOLD)
	tcl.custom_minimum_size.x = 96
	tcl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	row.add_child(tcl)
	row.add_child(UiKit.button(">", _cycle_tc.bind(1), 3))
	row.add_child(UiKit.label("Level", "t10", UiKit.DIM))
	row.add_child(_stepper(level, _set_level, 1, 40))
	body.add_child(row)

	var mine := UiKit.button(("[x] " if use_mine else "[ ] ") + "Use my gear's Fortune (RF %s%%)" % UiKit.fmt_num(Game.sheet().fortune.rarity), _toggle_mine)
	mine.alignment = HORIZONTAL_ALIGNMENT_LEFT
	body.add_child(mine)
	if not use_mine:
		var g := GridContainer.new()
		g.columns = 2
		g.add_theme_constant_override("h_separation", 6)
		g.add_child(_labeled("Rarity", _stepper(rf, _set_rf, 0, 999, 10)))
		for k in Stats.SEEK_KINDS:
			var kk: String = k
			g.add_child(_labeled(Stats.SEEK_NAMES[k], _stepper(int(seek.get(k, 0)), func(v): seek[kk] = v, 0, 999, 10)))
		body.add_child(g)

	var btns := UiKit.hbox(3)
	btns.add_child(UiKit.button("Roll drop", _roll.bind(1)))
	btns.add_child(UiKit.button("Roll x10", _roll.bind(10)))
	btns.add_child(UiKit.button("Simulate 5,000", _simulate))
	body.add_child(btns)

	if not sim.is_empty():
		var box := UiKit.vbox(0)
		box.add_child(UiKit.label("%d x %s @ lvl %d" % [int(sim.n), TreasureClasses.get_tc(tc).get("name", tc), level], "t10", UiKit.DIM))
		for k in ORDER:
			var c := int(sim.tally.get(k, 0))
			if c <= 0:
				continue
			var r := UiKit.hbox(4)
			r.add_child(UiKit.label(String(k).capitalize()))
			r.add_child(UiKit.spacer())
			r.add_child(UiKit.label("%d" % c, "t10", UiKit.GOLD))
			r.add_child(UiKit.label("(1 in %.1f kills)" % (float(sim.n) / c), "t10", UiKit.DIM))
			box.add_child(r)
		body.add_child(UiKit.well(box, 4))

	body.add_child(UiKit.gap(4))
	body.add_child(UiKit.label("CHEATS", "s8", UiKit.DIM))
	var ch := UiKit.hbox(3)
	ch.add_child(UiKit.button("+5,000 gold", func():
		Game.hero().gold = int(Game.hero().gold) + 5000
		Game.commit()))
	ch.add_child(UiKit.button("+1,000 xp", func():
		Progression.gain_xp(Game.hero(), 1000)
		Game.commit()))
	ch.add_child(UiKit.button("+5 Path Points", func():
		Game.hero().pathPoints = int(Game.hero().pathPoints) + 5
		Game.commit()))
	body.add_child(ch)


func _labeled(name: String, c: Control) -> Control:
	var h := UiKit.hbox(2)
	h.add_child(UiKit.label(name, "t10", UiKit.DIM))
	h.add_child(UiKit.spacer())
	h.add_child(c)
	h.size_flags_horizontal = SIZE_EXPAND_FILL
	return h
