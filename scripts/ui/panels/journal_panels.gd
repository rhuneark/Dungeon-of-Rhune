class_name JournalPanels
## Lore quests and Varn's Codex (uniques found, rhunes, rhunewords, lore).


class QuestsPanel extends UiPanel:
	func _init() -> void:
		title = "Lore Quests"
		panel_width = 360

	func build(body: VBoxContainer) -> void:
		var hero := Game.hero()
		var sa := scroll_area("q", 330)
		var box: VBoxContainer = sa[1]
		var active := []
		var done := []
		for id in hero.quests:
			if hero.quests[id].state == "active":
				active.append(id)
			elif hero.quests[id].state == "done":
				done.append(id)
		if active.is_empty():
			box.add_child(UiKit.para("No open quests. Talk to people — they always want something.", "t10", UiKit.DIM))
		for id in active:
			var q := QuestDefs.get_quest(id)
			if q.is_empty():
				continue
			var st: Dictionary = hero.quests[id]
			box.add_child(UiKit.para("%s — %s" % [q.title, Npcs.get_npc(q.giver).get("name", "")], "t10", UiKit.GOLD))
			box.add_child(UiKit.para(q.summary))
			for o in q.objectives:
				var p := int(st.progress.get(o.id, 0))
				var c := int(o.count)
				var ok := p >= c
				box.add_child(UiKit.para("%s %s%s" % ["+" if ok else "·", o.text, " (%d/%d)" % [p, c] if c > 1 else ""], "t10", UiKit.GOOD if ok else UiKit.DIM))
			box.add_child(UiKit.gap(2))
			box.add_child(UiKit.hline(UiKit.ROW_LINE))
			box.add_child(UiKit.gap(2))
		if not done.is_empty():
			box.add_child(UiKit.label("COMPLETED", "s8", UiKit.DIM))
			for id in done:
				box.add_child(UiKit.label("+ %s" % QuestDefs.get_quest(id).get("title", id), "t10", UiKit.FAINT))
		var unseen := 0
		for q in QuestDefs.all():
			if not hero.quests.has(q.id):
				unseen += 1
		if unseen > 0:
			box.add_child(UiKit.gap(4))
			box.add_child(UiKit.para("%d more quest%s waiting to be found in Thornwick." % [unseen, "s" if unseen > 1 else ""], "t10", UiKit.DIM))
		body.add_child(sa[0])


class CodexPanel extends UiPanel:
	var tab := "uniques"
	var lore := ""

	func _init() -> void:
		title = "Varn's Codex"
		panel_width = 380

	func _set_tab(id: String) -> void:
		tab = id
		mark()

	func _set_lore(id: String) -> void:
		lore = id
		mark()

	func build(body: VBoxContainer) -> void:
		var codex: Dictionary = Game.save.codex
		var found := 0
		for u in Uniques.all():
			if codex.has("u:%s" % u.id):
				found += 1
		var tabs := UiKit.hbox(3)
		tabs.alignment = BoxContainer.ALIGNMENT_CENTER
		for t in [["uniques", "Uniques %d/%d" % [found, Uniques.all().size()]], ["rhunes", "Rhunes"], ["words", "Rhunewords"], ["lore", "Lore"]]:
			var id: String = t[0]
			tabs.add_child(UiKit.button(t[1], _set_tab.bind(id), 6, tab == id))
		body.add_child(tabs)
		body.add_child(UiKit.gap(2))
		var sa := scroll_area(tab, 320)
		var box: VBoxContainer = sa[1]
		match tab:
			"uniques": _uniques(box, codex)
			"rhunes": _rhunes(box, codex)
			"words": _words(box, codex)
			"lore": _lore(box)
		body.add_child(sa[0])

	func _tile(sz: Vector2, draw_fn: Callable, tip: Callable) -> Control:
		var c := _Tile.new()
		c.custom_minimum_size = sz
		c.draw_fn = draw_fn
		c.mouse_entered.connect(func(): tip.call(c))
		return c

	func _uniques(box: VBoxContainer, codex: Dictionary) -> void:
		var g := GridContainer.new()
		g.columns = 6
		g.add_theme_constant_override("h_separation", 3)
		g.add_theme_constant_override("v_separation", 3)
		g.mouse_filter = MOUSE_FILTER_IGNORE
		for u in Uniques.all():
			var rec = codex.get("u:%s" % u.id)
			var b := ItemBases.get_base(u.baseId)
			var tint := Color.WHITE if rec != null else Color(0, 0, 0, 0.35)
			var tip := func(c):
				if rec != null:
					var when := Time.get_date_string_from_unix_time(int(float(rec.get("at", 0)) / 1000.0))
					UiTip.text(c, u.name, [b.name, "Best roll: %d%%" % roundi(float(rec.get("best", 0)) * 100), "Found %s" % when, u.get("flavor", "")], "#c9a46b")
				else:
					UiTip.text(c, "???", ["A unique %s" % b.name, "Item level %d+" % int(u.qlvl)], "#c9a46b")
			g.add_child(_tile(Vector2(56, 56), func(ci: Control): ItemIcon.draw_base_small(ci, b, ci.size / 2.0, tint), tip))
		box.add_child(g)

	func _rhunes(box: VBoxContainer, codex: Dictionary) -> void:
		var g := GridContainer.new()
		g.columns = 4
		g.add_theme_constant_override("h_separation", 3)
		g.add_theme_constant_override("v_separation", 3)
		g.mouse_filter = MOUSE_FILTER_IGNORE
		for r in Rhunes.all():
			var has := codex.has("r:%s" % r.id)
			var tex := Art.icon_texture("rhune_%s" % r.id)
			var draw_fn := func(ci: Control):
				if tex:
					ci.draw_texture_rect(tex, Rect2(Vector2(floorf(ci.size.x / 2 - 16), 3), Vector2(32, 32)), false, Color.WHITE if has else Color(0.5, 0.5, 0.5, 0.4))
				var nm: String = r.name
				var w := UiKit.F_BODY.get_string_size(nm, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
				ci.draw_string(UiKit.F_BODY, Vector2(roundf(ci.size.x / 2 - w / 2), 46), nm, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UiKit.RHUNE if has else UiKit.FAINT)
			var tip := func(c):
				UiTip.text(c, "%s Rhune" % r.name, [r.lore, "Weapon: " + ItemTooltip._join(r.effects.weapon), "Armor: " + ItemTooltip._join(r.effects.armor), "Shield: " + ItemTooltip._join(r.effects.shield)], "#ff9b3d")
			g.add_child(_tile(Vector2(84, 52), draw_fn, tip))
		box.add_child(g)

	func _words(box: VBoxContainer, codex: Dictionary) -> void:
		box.add_child(UiKit.para("Socket these rhunes, in order, into a plain item with exactly that many sockets.", "t10", UiKit.DIM))
		for w in Rhunes.rhunewords():
			var made := codex.has("w:%s" % w.id)
			var names := []
			for r in w.rhunes:
				names.append(String(r).capitalize())
			var line := UiKit.hbox(4)
			line.add_child(UiKit.label(w.name, "t10", UiKit.UNIQUE if made else UiKit.PARCH))
			line.add_child(UiKit.label("'%s'" % " + ".join(names), "t10", UiKit.RHUNE))
			line.add_child(UiKit.label("%d-socket %s" % [w.rhunes.size(), " / ".join(w.tags)], "t10", UiKit.DIM))
			if made:
				line.add_child(UiKit.label("+", "t10", UiKit.GOOD))
			box.add_child(line)
			box.add_child(UiKit.para(ItemTooltip._join(w.stats), "t10", UiKit.MAGIC))
			box.add_child(UiKit.hline(UiKit.ROW_LINE))

	func _lore(box: VBoxContainer) -> void:
		var hero := Game.hero()
		var row := UiKit.hbox(6)
		var list := UiKit.vbox(1)
		list.custom_minimum_size.x = 130
		for l in Lore.all():
			var has: bool = l.id in hero.lore
			var b := UiKit.button(l.title if has else "— undiscovered —", _set_lore.bind(String(l.id)), 3, lore == l.id)
			b.alignment = HORIZONTAL_ALIGNMENT_LEFT
			b.disabled = not has
			b.clip_text = true
			b.custom_minimum_size.x = 130
			list.add_child(b)
		row.add_child(list)
		var text: String = Lore.get_lore(lore).get("text", "") if lore != "" else "Lore is found by poking at the world. Pick an entry."
		row.add_child(UiKit.para(text))
		box.add_child(row)

	class _Tile extends PanelContainer:
		var draw_fn: Callable
		func _init() -> void:
			add_theme_stylebox_override("panel", UiKit.inset())
			mouse_filter = MOUSE_FILTER_STOP
		func _draw() -> void:
			if draw_fn.is_valid():
				draw_fn.call(self)
