class_name ServicePanels
## Stash, vendors, gambling, Brannoc's crucible and the wishing well.


static func create(id: String) -> UiPanel:
	match id:
		"stash": return StashPanel.new()
		"vendor", "herbs": return VendorPanel.new()
		"gamble": return GamblePanel.new()
		"smith": return SmithPanel.new()
		"well": return WellPanel.new()
	return null


static func centered(l: Label) -> Label:
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


class StashPanel extends UiPanel:
	func _init() -> void:
		title = "Strongbox"

	func build(body: VBoxContainer) -> void:
		body.add_child(UiKit.para("Shared by every hero you make. Right-click to move items.", "t10", UiKit.DIM, HORIZONTAL_ALIGNMENT_CENTER))
		var g := GridView.new(HeroData.STASH_W, HeroData.STASH_H, Game.save.stash)
		g.clicked.connect(func(cx, cy, uid): Actions.click_grid("stash", cx, cy, uid))
		g.right_clicked.connect(func(uid): Actions.right_click_item("stash", uid))
		body.add_child(g)


class VendorPanel extends UiPanel:
	func build(body: VBoxContainer) -> void:
		var npc_id: String = Game.ui.service_npc if Game.ui.service_npc != "" else "pell"
		var npc := Npcs.get_npc(npc_id)
		title = npc.get("name", "Trade")
		var grid: Dictionary = Economy.vendor_grid(npc_id)
		var g := GridView.new(int(grid.w), int(grid.h), grid.items)
		g.tip_ctx = "buy"
		g.price_fn = func(it): return Economy.vendor_price(it)
		g.clicked.connect(func(_cx, _cy, uid): if uid != "": Economy.buy(npc_id, uid))
		body.add_child(g)
		var row := UiKit.hbox(4)
		row.add_child(UiKit.label("Click to buy · right-click your items to sell", "t10", UiKit.DIM))
		row.add_child(UiKit.spacer())
		if npc_id != "ysolde":
			row.add_child(UiKit.button("Fresh stock", func(): Economy.restock(npc_id)))
		body.add_child(row)

	func _rebuild() -> void:
		var npc := Npcs.get_npc(Game.ui.service_npc if Game.ui.service_npc != "" else "pell")
		title = npc.get("name", "Trade")
		super._rebuild()


class GamblePanel extends UiPanel:
	func _init() -> void:
		title = "Sealed Goods"

	func build(body: VBoxContainer) -> void:
		var odds: Dictionary = Economy.GAMBLE_ODDS
		body.add_child(UiKit.para("\"Pick a shape. Pay the man. Open it.\" Magic at worst, rare %d%%, unique %s%%." % [roundi(float(odds.rare) * 100), UiKit.fmt_num(float(odds.unique) * 100)], "t10", UiKit.DIM, HORIZONTAL_ALIGNMENT_CENTER))
		var sa := scroll_area("offers", 300)
		var grid := GridContainer.new()
		grid.columns = 4
		grid.add_theme_constant_override("h_separation", 2)
		grid.add_theme_constant_override("v_separation", 2)
		grid.mouse_filter = MOUSE_FILTER_IGNORE
		var gold := int(Game.hero().gold)
		for o in Economy.gamble_offers():
			grid.add_child(_offer(o, gold))
		sa[1].add_child(grid)
		body.add_child(UiKit.well(sa[0], 3))

	func _offer(o: Dictionary, gold: int) -> Control:
		var b := ItemBases.get_base(o.baseId)
		var btn := Button.new()
		btn.focus_mode = FOCUS_NONE
		btn.custom_minimum_size = Vector2(76, 90)
		var flat := StyleBoxFlat.new()
		flat.bg_color = UiKit.PANEL2
		var flat_hi := StyleBoxFlat.new()
		flat_hi.bg_color = UiKit.PANEL3
		btn.add_theme_stylebox_override("normal", flat)
		btn.add_theme_stylebox_override("hover", flat_hi)
		btn.add_theme_stylebox_override("pressed", flat_hi)
		btn.add_theme_stylebox_override("hover_pressed", flat_hi)
		var art := _Art.new()
		art.base = b
		art.set_anchors_and_offsets_preset(PRESET_TOP_WIDE)
		art.custom_minimum_size = Vector2(76, 66)
		btn.add_child(art)
		var v := UiKit.vbox(0)
		v.position = Vector2(0, 64)
		v.custom_minimum_size = Vector2(76, 0)
		v.add_child(ServicePanels.centered(UiKit.label(b.name, "t10")))
		v.add_child(ServicePanels.centered(UiKit.label(str(int(o.price)), "t10", UiKit.GOLD if gold >= int(o.price) else UiKit.BAD)))
		btn.add_child(v)
		var bid: String = o.baseId
		btn.pressed.connect(func(): Economy.gamble(bid))
		btn.mouse_entered.connect(func(): UiTip.text(btn, b.name, ["Cost: %d gold" % int(o.price), "Base level %d" % int(b.qlvl)]))
		return btn

	class _Art extends Control:
		var base: Dictionary
		func _init() -> void:
			mouse_filter = MOUSE_FILTER_IGNORE
		func _draw() -> void:
			ItemIcon.draw_base_small(self, base, Vector2(38, 34))


class SmithPanel extends UiPanel:
	func _init() -> void:
		title = "Brannoc's Crucible"

	func build(body: VBoxContainer) -> void:
		var hero := Game.hero()
		var contents: Array = hero.crucible
		var recipe := Economy.find_recipe(contents)
		var punchable = contents[0] if contents.size() == 1 and Economy.can_punch(contents[0]) else null
		body.add_child(UiKit.para("Put items in the crucible (right-click from your pack), then work them.", "t10", UiKit.DIM, HORIZONTAL_ALIGNMENT_CENTER))
		var row := UiKit.hbox(8)
		var g := GridView.new(HeroData.CRUCIBLE_W, HeroData.CRUCIBLE_H, contents)
		g.size_flags_vertical = SIZE_SHRINK_BEGIN
		g.clicked.connect(func(cx, cy, uid): Actions.click_grid("crucible", cx, cy, uid))
		g.right_clicked.connect(func(uid): Actions.right_click_item("crucible", uid))
		row.add_child(g)
		var side_box := UiKit.vbox(4)
		side_box.size_flags_horizontal = SIZE_EXPAND_FILL
		var tb := UiKit.button("Transmute: %s" % recipe.name if not recipe.is_empty() else "Transmute", _transmute)
		tb.disabled = recipe.is_empty()
		side_box.add_child(tb)
		var pb := UiKit.button("Punch sockets (%dg)" % Economy.socket_cost(punchable) if punchable != null else "Punch sockets", func(): if punchable != null: Economy.punch_sockets(punchable))
		pb.disabled = punchable == null
		side_box.add_child(pb)
		side_box.add_child(UiKit.label("RECIPES", "s8", UiKit.DIM))
		for r in Economy.recipes():
			var on: bool = not recipe.is_empty() and recipe.id == r.id
			side_box.add_child(UiKit.para("%s: %s" % [r.name, r.text], "t10", UiKit.GOOD if on else UiKit.PARCH))
		side_box.add_child(UiKit.para("Sockets: one plain (white) item with no sockets.", "t10", UiKit.PARCH))
		row.add_child(side_box)
		body.add_child(row)

	func _transmute() -> void:
		var hero := Game.hero()
		var out: Array = Economy.transmute(hero.crucible.duplicate())
		if out.is_empty():
			return
		hero.crucible.clear()
		var grid: Dictionary = Actions.grid_of("crucible")
		for it in out:
			Grid.auto_place(grid, it)
		Game.commit()


class WellPanel extends UiPanel:
	func _init() -> void:
		title = "The Wishing Well"

	func build(body: VBoxContainer) -> void:
		var cost: int = Economy.wish_cost()
		body.add_child(UiKit.para("Toss in a coin and the well coughs something up — gear, rhunes, potions, coin. Your Rarity and Targeted Find apply. Sometimes it is generous. Nobody has checked the bottom.", "t10", UiKit.PARCH, HORIZONTAL_ALIGNMENT_CENTER))
		body.add_child(UiKit.gap(4))
		var b := UiKit.button("Make a wish (%d gold)" % cost, func(): Economy.make_wish(), 12)
		b.disabled = int(Game.hero().gold) < cost
		b.size_flags_horizontal = SIZE_SHRINK_CENTER
		body.add_child(b)
		body.add_child(ServicePanels.centered(UiKit.label("Wishes made: %d" % int(Game.save.stats.get("wishes", 0)), "t10", UiKit.DIM)))
