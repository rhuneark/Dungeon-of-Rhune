extends UiPanel
## Disciplines & skill trees.
##  Left:   the four Disciplines — choose two, raise their rank with Path Points.
##  Middle: skills from your Disciplines — specialize up to 5.
##  Right:  the selected skill's own tree — spend its points (one per skill level).

const KIND_LABEL := {"attack": "Attack", "spell": "Spell", "passive": "Passive", "buff": "Buff", "summon": "Summon", "movement": "Movement"}
const NODE := 30
const GY := 56

var selected := ""


func _init() -> void:
	side = "full"
	title = "Disciplines & Skills"


static func err(msg: String) -> void:
	if msg != "":
		Game.toast(msg, "#d9534f")
	else:
		Game.commit()


static func node_text(node: Dictionary, rank: int) -> String:
	var fx: Array = node.get("effects", [])
	var v := absf(float(fx[0].get("perRank", 0)) * maxi(1, rank)) if fx.size() > 0 else 0.0
	return String(node.text).replace("{v}", UiKit.fmt_num(v))


func _tipper(c: Control, title_fn: Callable) -> void:
	c.mouse_filter = MOUSE_FILTER_STOP if c.mouse_filter == MOUSE_FILTER_IGNORE else c.mouse_filter
	c.gui_input.connect(func(e): if e is InputEventMouseMotion: title_fn.call(c))


func _bind_hotbar(idx: int, sid: String) -> void:
	var hb: Array = Game.hero().hotbar
	for j in hb.size():
		if j == idx:
			hb[j] = null if hb[j] == sid else sid
		elif hb[j] == sid:
			hb[j] = null
	Game.commit()


func _select(id: String) -> void:
	selected = id
	mark()


func build(body: VBoxContainer) -> void:
	var hero := Game.hero()
	body.size_flags_vertical = SIZE_EXPAND_FILL
	var top := UiKit.hbox(4)
	var pp := int(hero.pathPoints)
	top.add_child(UiKit.label("%d Path Point%s" % [pp, "" if pp == 1 else "s"], "t10", UiKit.GOLD))
	top.add_child(UiKit.spacer())
	top.add_child(UiKit.label(Disciplines.combo_title(hero.disciplines[0], hero.disciplines[1])))
	top.add_child(UiKit.spacer())
	top.add_child(UiKit.label("Path Points: 1 per level + lore quests. Skills level up as you gain XP.", "t10", UiKit.DIM))
	body.add_child(top)

	var cols := UiKit.hbox(6)
	cols.size_flags_vertical = SIZE_EXPAND_FILL
	body.add_child(cols)
	cols.add_child(_disciplines())

	var mine := []
	for sk in Disciplines.skills():
		if sk.discipline in hero.disciplines:
			mine.append(sk)
	if selected == "" or Disciplines.get_skill(selected).is_empty() or not (Disciplines.get_skill(selected).discipline in hero.disciplines):
		selected = mine[0].id if mine.size() > 0 else ""
	cols.add_child(_skill_list(mine))
	if selected != "":
		cols.add_child(_tree(Disciplines.get_skill(selected)))
	else:
		cols.add_child(UiKit.para("Choose two Disciplines. Any pair works — each pairing has a name, and the trees cross-pollinate.", "t10", UiKit.DIM))


func _disciplines() -> Control:
	var hero := Game.hero()
	var col := UiKit.vbox(4)
	col.custom_minimum_size.x = 196
	var slot_free: bool = null in hero.disciplines
	for d in Disciplines.disciplines():
		var chosen := SkillRules.is_chosen(hero, d.id)
		var rank := SkillRules.rank_of(hero, d.id)
		var color := Color(d.color)
		var box := UiKit.vbox(2)
		var head := UiKit.hbox(4)
		head.add_child(UiKit.label(d.name, "head", color))
		head.add_child(UiKit.spacer())
		head.add_child(UiKit.label("%d/%d" % [rank, int(d.maxRank)], "t10", UiKit.DIM))
		box.add_child(head)
		box.add_child(UiKit.bar(float(rank) / float(d.maxRank), color, 0, 3))
		var row := UiKit.hbox(3)
		var did: String = d.id
		if not chosen:
			var b := UiKit.button("Choose (1 pt)", func(): err(SkillRules.choose_discipline(Game.hero(), did)))
			b.disabled = not slot_free or int(hero.pathPoints) < 1
			row.add_child(b)
		else:
			var up := UiKit.button("+ Rank", func(): err(SkillRules.raise_rank(Game.hero(), did)))
			up.disabled = int(hero.pathPoints) < 1 or rank >= int(d.maxRank)
			row.add_child(up)
			row.add_child(UiKit.button("Forget", func():
				SkillRules.forget_discipline(Game.hero(), did)
				Game.commit()))
		row.add_child(UiKit.spacer())
		for sk in Disciplines.skills_of(d.id):
			row.add_child(UiKit.label(str(int(sk.unlockRank)), "label", color if chosen and rank >= int(sk.unlockRank) else UiKit.FAINT))
		box.add_child(row)
		var w := UiKit.well(box, 4)
		w.modulate.a = 1.0 if chosen or slot_free else 0.45
		var per := []
		for m in d.perRank:
			per.append(Stats.describe_mod(m))
		_tipper(w, func(c): UiTip.text(c, d.name, [d.tagline, "Per rank: " + ", ".join(per), d.lore], d.color))
		col.add_child(w)
	return col


func _skill_list(mine: Array) -> Control:
	var hero := Game.hero()
	var sheet := Game.sheet()
	var sa := scroll_area("skills", 0)
	var sc: ScrollContainer = sa[0]
	sc.size_flags_vertical = SIZE_EXPAND_FILL
	var box: VBoxContainer = sa[1]
	if mine.is_empty():
		box.add_child(UiKit.para("Choose a Discipline to see its skills.", "t10", UiKit.DIM))
	for sk in mine:
		var unlocked := SkillRules.is_unlocked(hero, sk)
		var st = hero.skills.get(sk.id)
		var btn := Button.new()
		btn.focus_mode = FOCUS_NONE
		btn.custom_minimum_size = Vector2(0, 32)
		var on := StyleBoxFlat.new()
		on.bg_color = UiKit.PANEL3
		var hov := StyleBoxFlat.new()
		hov.bg_color = UiKit.PANEL2
		btn.add_theme_stylebox_override("normal", on if selected == sk.id else StyleBoxEmpty.new())
		btn.add_theme_stylebox_override("hover", on if selected == sk.id else hov)
		btn.add_theme_stylebox_override("pressed", on)
		btn.add_theme_stylebox_override("hover_pressed", on)
		var h := UiKit.hbox(4)
		h.position = Vector2(2, 2)
		h.add_child(UiKit.skill_glyph(sk, 28, not unlocked))
		var t := UiKit.vbox(0)
		t.add_child(UiKit.label(sk.name, "t10", UiKit.PARCH if unlocked else UiKit.FAINT))
		var sub := ("%s · lvl %d" % [KIND_LABEL.get(sk.kind, sk.kind), SkillRules.effective_level(hero, sk, sheet.raw)]) if unlocked else "Rank %d" % int(sk.unlockRank)
		var sh := UiKit.hbox(2)
		sh.add_child(UiKit.label(sub, "t10", UiKit.DIM))
		if st != null and st.get("specialized", false):
			sh.add_child(UiKit.label("*", "t10", UiKit.GOLD))
		t.add_child(sh)
		h.add_child(t)
		btn.add_child(h)
		btn.pressed.connect(_select.bind(String(sk.id)))
		box.add_child(btn)
	var outer := UiKit.vbox(2)
	outer.custom_minimum_size.x = 176
	outer.size_flags_vertical = SIZE_EXPAND_FILL
	outer.add_child(sc)
	outer.add_child(UiKit.label("Specialized: %d/%d" % [SkillRules.specialized_count(hero), Disciplines.MAX_SPECIALIZED], "t10", UiKit.DIM))
	var w := UiKit.well(outer, 3)
	w.size_flags_vertical = SIZE_EXPAND_FILL
	return w


func _tree(skill: Dictionary) -> Control:
	var hero := Game.hero()
	var sheet := Game.sheet()
	var st = hero.skills.get(skill.id)
	var specialized: bool = st != null and st.get("specialized", false)
	var unlocked := SkillRules.is_unlocked(hero, skill)
	var pts := SkillRules.points_available(hero, skill, sheet.raw)
	var color := Color(Disciplines.get_discipline(skill.discipline).get("color", "#aaaaaa"))
	var col := UiKit.vbox(2)
	col.size_flags_horizontal = SIZE_EXPAND_FILL
	col.size_flags_vertical = SIZE_EXPAND_FILL

	var head := UiKit.hbox(6)
	head.add_child(UiKit.skill_glyph(skill, 32, not unlocked))
	var info := UiKit.vbox(0)
	info.size_flags_horizontal = SIZE_EXPAND_FILL
	var tl := UiKit.hbox(6)
	tl.add_child(UiKit.label(skill.name, "head", color))
	var tags: Array = skill.get("tags", [])
	tl.add_child(UiKit.label(KIND_LABEL.get(skill.kind, skill.kind) + (" · " + ", ".join(tags) if tags.size() > 0 else ""), "t10", UiKit.DIM))
	info.add_child(tl)
	info.add_child(UiKit.para(skill.description))
	info.add_child(UiKit.para(" · ".join(skill.get("baseInfo", [])), "t10", UiKit.MAGIC))
	var ppl: Array = skill.get("passivePerLevel", [])
	if ppl.size() > 0:
		info.add_child(UiKit.para("Per level: " + ItemTooltip._join(ppl), "t10", UiKit.MAGIC))
	head.add_child(info)
	col.add_child(head)

	var bar := UiKit.hbox(4)
	var sid: String = skill.id
	if not unlocked:
		bar.add_child(UiKit.label("Unlocks at %s rank %d." % [Disciplines.get_discipline(skill.discipline).get("name", ""), int(skill.unlockRank)], "t10", UiKit.DIM))
	elif specialized:
		bar.add_child(UiKit.label("Level %d · %d point%s to spend" % [int(st.level), pts, "" if pts == 1 else "s"], "t10", UiKit.GOLD))
		bar.add_child(UiKit.label("(%d/%d skill xp)" % [int(st.xp), HeroData.skill_xp_to_next(int(st.level))], "t10", UiKit.DIM))
		bar.add_child(UiKit.button("Unspecialize", func():
			SkillRules.unspecialize(Game.hero(), sid)
			Game.commit()))
	else:
		bar.add_child(UiKit.button("Specialize — open its tree", func(): err(SkillRules.specialize(Game.hero(), sid))))
	if unlocked and skill.kind != "passive":
		bar.add_child(UiKit.spacer())
		bar.add_child(UiKit.label("Hotbar", "t10", UiKit.DIM))
		for i in hero.hotbar.size():
			bar.add_child(UiKit.button(str(i + 1), _bind_hotbar.bind(i, sid), 4, hero.hotbar[i] == sid))
	col.add_child(bar)

	var canvas := _TreeCanvas.new()
	canvas.skill = skill
	canvas.color = color
	canvas.size_flags_horizontal = SIZE_EXPAND_FILL
	canvas.size_flags_vertical = SIZE_EXPAND_FILL
	canvas.custom_minimum_size = Vector2(0, 3 * GY + 14)
	canvas.modulate.a = 1.0 if specialized else 0.5
	var gx := maxi(56, mini(74, floori((View.ui_size.x - 472) / 4.0)))
	for n in skill.tree:
		var p := Vector2(14 + int(n.col) * gx, 8 + int(n.row) * GY)
		canvas.pos[n.id] = p
		var r := SkillRules.node_rank(hero, skill.id, n.id)
		var why: String = SkillRules.can_allocate(hero, skill, n, sheet.raw)
		var maxed := r >= int(n.maxRank)
		var nb := Button.new()
		nb.focus_mode = FOCUS_NONE
		nb.text = "%d/%d" % [r, int(n.maxRank)]
		nb.position = p
		nb.size = Vector2(NODE, NODE)
		nb.custom_minimum_size = Vector2(NODE, NODE)
		var ring := Color("#d9b26a") if maxed else (color if r > 0 else (Color("#3a2c1e") if why != "" else UiKit.EDGE_HI))
		var sb := UiKit._sb(UiKit._rings([ring], UiKit.PANEL3 if r > 0 else UiKit.WELL), 1, [0, 0, 0, 0])
		for stn in ["normal", "hover", "pressed", "hover_pressed"]:
			nb.add_theme_stylebox_override(stn, sb)
		nb.add_theme_color_override("font_color", color if r > 0 else UiKit.DIM)
		nb.add_theme_color_override("font_hover_color", Color.WHITE)
		var node: Dictionary = n
		nb.pressed.connect(func(): err(SkillRules.allocate(Game.hero(), skill, node, Game.sheet().raw)))
		nb.gui_input.connect(func(e):
			if e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_RIGHT:
				err(SkillRules.deallocate(Game.hero(), skill, node))
			elif e is InputEventMouseMotion:
				var lines := [("Now: " + node_text(node, r)) if r > 0 else node_text(node, 1)]
				if r > 0 and not maxed:
					lines.append("Next: " + node_text(node, r + 1))
				if why != "" and not maxed:
					lines.append(why)
				lines.append("Click: add point · Right-click: refund")
				UiTip.text(nb, "%s (%d/%d)" % [node.name, r, int(node.maxRank)], lines, color.to_html(false)))
		canvas.add_child(nb)
		var nl := UiKit.label(n.name, "t10", UiKit.PARCH if r > 0 else UiKit.DIM)
		nl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		nl.position = p + Vector2(-20, NODE)
		nl.custom_minimum_size = Vector2(NODE + 40, 0)
		canvas.add_child(nl)
	var w := UiKit.well(canvas, 1)
	w.size_flags_vertical = SIZE_EXPAND_FILL
	w.clip_contents = true
	col.add_child(w)
	return col


## Draws the links between tree nodes (children are the node buttons).
class _TreeCanvas extends Control:
	var skill: Dictionary
	var color: Color
	var pos := {}

	func _init() -> void:
		mouse_filter = MOUSE_FILTER_PASS

	func _draw() -> void:
		var hero := Game.hero()
		for n in skill.tree:
			var req = n.get("requires")
			if req == null or (req is Dictionary and req.is_empty()):
				continue
			if not pos.has(req.node):
				continue
			var a: Vector2 = pos[req.node] + Vector2(15, 15)
			var b: Vector2 = pos[n.id] + Vector2(15, 15)
			var met := SkillRules.node_rank(hero, skill.id, req.node) >= int(req.points)
			draw_line(a.floor(), b.floor(), color if met else Color("#3a2c1e"), 2.0)
