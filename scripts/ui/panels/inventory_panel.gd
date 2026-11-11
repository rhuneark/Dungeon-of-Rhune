extends UiPanel
## Paperdoll + backpack grid.

const SLOTS := {
	"weapon": [8, 0, 64, 128, "Weapon"],
	"head": [128, 0, 64, 64, "Head"],
	"neck": [204, 16, 32, 32, "Neck"],
	"offhand": [248, 0, 64, 128, "Off-hand"],
	"chest": [128, 66, 64, 96, "Chest"],
	"hands": [8, 132, 64, 64, "Hands"],
	"ring1": [84, 132, 32, 32, "Ring"],
	"waist": [128, 164, 64, 32, "Waist"],
	"ring2": [204, 132, 32, 32, "Ring"],
	"feet": [248, 132, 64, 64, "Feet"],
}


func _init() -> void:
	side = "right"
	panel_width = 336
	title = "Inventory"


func build(body: VBoxContainer) -> void:
	var hero := Game.hero()
	var sheet := Game.sheet()
	var left: String = Game.ui.left
	var selling := left in ["vendor", "herbs", "gamble"]

	var doll := Paperdoll.new()
	doll.size_flags_horizontal = SIZE_SHRINK_CENTER
	body.add_child(doll)
	body.add_child(UiKit.gap(4))

	var grid := GridView.new(HeroData.INV_W, HeroData.INV_H, hero.inventory)
	grid.tip_ctx = "sell" if selling else "none"
	if selling:
		grid.price_fn = func(it): return ItemText.sell_price(it)
	grid.unusable_fn = func(it): return ItemBases.get_base(it.baseId).category == "curio" and not CharacterSheet.meets_reqs(it, hero, sheet.attrs)
	grid.clicked.connect(func(cx, cy, uid): Actions.click_grid("inv", cx, cy, uid))
	grid.right_clicked.connect(func(uid): Actions.right_click_item("inv", uid))
	body.add_child(grid)

	var row := UiKit.hbox(4)
	row.add_child(UiKit.label("%s gold" % UiKit.fmt_int(int(hero.gold)), "t10", UiKit.GOLD))
	row.add_child(UiKit.spacer())
	var hint := "Right-click to sell" if selling else ("Right-click: move to stash" if left == "stash" else "Right-click: use / equip")
	row.add_child(UiKit.label(hint, "t10", UiKit.DIM))
	body.add_child(row)


class Paperdoll extends Control:
	func _init() -> void:
		custom_minimum_size = Vector2(320, 196)
		mouse_filter = MOUSE_FILTER_STOP

	func _slot_at(p: Vector2) -> String:
		for s in SLOTS:
			var r: Array = SLOTS[s]
			if Rect2(r[0], r[1], r[2], r[3]).has_point(p):
				return s
		return ""

	func _gui_input(e: InputEvent) -> void:
		var hero := Game.hero()
		if e is InputEventMouseMotion:
			var s := _slot_at(e.position)
			if s == "":
				UiTip.clear(self)
				return
			var it = hero.equipped.get(s)
			if it != null and hero.get("cursor") == null:
				UiTip.item(self, it)
			else:
				UiTip.text(self, "", [SLOTS[s][4]])
		elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			var s := _slot_at(e.position)
			accept_event()
			if s != "":
				UiTip.clear()
				Actions.click_equip(s)

	func _draw() -> void:
		var hero := Game.hero()
		var sheet := Game.sheet()
		var held = hero.get("cursor")
		var unmet: Array = sheet.get("unmet", [])
		for s in SLOTS:
			var r: Array = SLOTS[s]
			var rect := Rect2(r[0], r[1], r[2], r[3])
			var it = hero.equipped.get(s)
			draw_rect(rect, Color.BLACK)
			var fill := UiKit.WELL
			draw_rect(rect.grow(-1), fill)
			if s in unmet:
				draw_rect(rect.grow(-1), Color(200 / 255.0, 40 / 255.0, 40 / 255.0, 0.3))
			elif it != null:
				draw_rect(rect.grow(-1), ItemIcon.quality_bg(it))
			elif held != null and Actions.slot_fits(held, s):
				draw_rect(rect.grow(-1), Color(90 / 255.0, 200 / 255.0, 90 / 255.0, 0.15))
			draw_rect(rect.grow(-1.5), UiKit.EDGE, false, 1.0)
			if it != null:
				var sz := ItemIcon.size_px(it)
				ItemIcon.draw(self, it, (rect.get_center() - sz / 2.0).floor())
			elif s == "offhand" and hero.equipped.get("weapon") != null and ItemBases.get_base(hero.equipped.weapon.baseId).twoHanded:
				var w: Dictionary = hero.equipped.weapon
				var sz := ItemIcon.size_px(w)
				ItemIcon.draw(self, w, (rect.get_center() - sz / 2.0).floor(), false, Color(1, 1, 1, 0.3))
			else:
				var lab: String = r[4]
				var tw := UiKit.F_BODY.get_string_size(lab, HORIZONTAL_ALIGNMENT_LEFT, -1, 10).x
				draw_string(UiKit.F_BODY, (rect.get_center() + Vector2(-tw / 2.0, 3)).round(), lab, HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UiKit.FAINT)
