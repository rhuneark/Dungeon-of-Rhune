extends UiPanel
## Paperdoll (four rings: two each side) + the belt's charm strip + backpack.

const SLOTS := {
	"weapon": [8, 0, 64, 128, "Weapon"],
	"head": [128, 0, 64, 64, "Head"],
	"neck": [204, 16, 32, 32, "Neck"],
	"offhand": [248, 0, 64, 128, "Off-hand"],
	"chest": [128, 66, 64, 96, "Chest"],
	"hands": [8, 132, 64, 64, "Hands"],
	"ring1": [84, 132, 32, 32, "Ring"],
	"ring2": [84, 166, 32, 32, "Ring"],
	"waist": [128, 164, 64, 32, "Waist"],
	"ring3": [204, 132, 32, 32, "Ring"],
	"ring4": [204, 166, 32, 32, "Ring"],
	"feet": [248, 132, 64, 64, "Feet"],
}
## The belt strip: one 32px cell per charm slot (a belt has 1-8).
const BELT_CELLS := 8


func _init() -> void:
	side = "right"
	panel_width = 336
	title = "Inventory"


func build(body: VBoxContainer) -> void:
	var hero := Game.hero()
	var sheet := Game.sheet()
	var left: String = Game.ui.left
	var selling := left in ["vendor", "gamble"]

	var doll := Paperdoll.new()
	doll.size_flags_horizontal = SIZE_SHRINK_CENTER
	body.add_child(doll)
	body.add_child(UiKit.gap(2))
	var belt := BeltStrip.new()
	belt.size_flags_horizontal = SIZE_SHRINK_CENTER
	body.add_child(belt)
	body.add_child(UiKit.gap(2))

	var grid := GridView.new(HeroData.INV_W, HeroData.INV_H, hero.inventory)
	grid.tip_ctx = "sell" if selling else "none"
	if selling:
		grid.price_fn = func(it): return ItemText.sell_price(it)
	grid.unusable_fn = func(it): return ItemBases.get_base(it.baseId).slot != "" and not CharacterSheet.meets_reqs(it, hero, sheet.attrs)
	grid.clicked.connect(func(cx, cy, uid): Actions.click_grid("inv", cx, cy, uid))
	grid.right_clicked.connect(func(uid): Actions.right_click_item("inv", uid))
	body.add_child(grid)

	var row := UiKit.hbox(4)
	row.add_child(UiKit.label("%s gold" % UiKit.fmt_int(int(hero.gold)), "t10", UiKit.GOLD))
	row.add_child(UiKit.spacer())
	var hint := "Right-click to sell" if selling else ("Right-click: move to stash" if left == "stash" else "Right-click: equip / slot charm")
	row.add_child(UiKit.label(hint, "t10", UiKit.DIM))
	body.add_child(row)


class Paperdoll extends Control:
	func _init() -> void:
		custom_minimum_size = Vector2(320, 198)
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


## The equipped belt's charm slots. Charms lie on their side here, each
## spanning as many cells as it takes (small 1, large 2, grand 3). Click with
## a charm to slot it; click a slotted charm to take it out.
class BeltStrip extends Control:
	const CELL := 32

	func _init() -> void:
		custom_minimum_size = Vector2(CELL * BELT_CELLS + 64, CELL)
		mouse_filter = MOUSE_FILTER_STOP

	func _belt() -> Dictionary:
		return Game.hero().equipped.get("waist", {})

	## Index into belt.charms under x, or -1 (empty cell / no charm).
	func _charm_at(x: float) -> int:
		var cx := floori((x - 64) / CELL)
		var i := 0
		var used := 0
		for c in _belt().get("charms", []):
			var n := Actions.charm_size(c)
			if cx >= used and cx < used + n:
				return i
			used += n
			i += 1
		return -1

	func _gui_input(e: InputEvent) -> void:
		var belt := _belt()
		if e is InputEventMouseMotion:
			if belt.is_empty():
				UiTip.text(self, "Charms", ["Equip a belt to carry charms. Belts have 1 to 8 charm slots; small charms take 1, large 2, grand 3."])
				return
			var i := _charm_at(e.position.x)
			if i >= 0 and Game.hero().get("cursor") == null:
				UiTip.item(self, belt.charms[i])
			else:
				UiTip.text(self, "Belt charms %d / %d" % [Actions.belt_used(belt), Actions.belt_capacity(belt)], ["Charms only work while slotted here.", "Small charm: 1 slot. Large: 2. Grand: 3.", "Right-click a charm in your pack to slot it."])
		elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
			accept_event()
			if e.position.x < 64:
				return
			UiTip.clear()
			Actions.click_belt_charm(_charm_at(e.position.x))

	func _draw() -> void:
		var belt := _belt()
		var cap := Actions.belt_capacity(belt) if not belt.is_empty() else 0
		var used := Actions.belt_used(belt) if not belt.is_empty() else 0
		draw_string(UiKit.F_BODY, Vector2(0, 14), "CHARMS", HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UiKit.DIM)
		draw_string(UiKit.F_BODY, Vector2(0, 26), "%d / %d" % [used, cap], HORIZONTAL_ALIGNMENT_LEFT, -1, 10, UiKit.PARCH if cap > 0 else UiKit.FAINT)
		var held = Game.hero().get("cursor")
		var fits: bool = held != null and Actions.charm_size(held) > 0 and used + Actions.charm_size(held) <= cap
		for i in BELT_CELLS:
			var r := Rect2(64 + i * CELL, 0, CELL, CELL)
			draw_rect(r, Color.BLACK)
			if i < cap:
				draw_rect(r.grow(-1), UiKit.WELL)
				if fits and i >= used and i < used + Actions.charm_size(held):
					draw_rect(r.grow(-1), Color(90 / 255.0, 200 / 255.0, 90 / 255.0, 0.15))
				draw_rect(r.grow(-1.5), UiKit.EDGE, false, 1.0)
			else:
				draw_rect(r.grow(-1), Color("#0a0806"))
		var x := 64
		for c in belt.get("charms", []):
			var n := Actions.charm_size(c)
			var span := Rect2(x, 0, n * CELL, CELL)
			draw_rect(span.grow(-1), ItemIcon.quality_bg(c))
			# The icon is 32 x (32*n), standing up: lay it down (a 90 degree turn keeps pixels whole).
			draw_set_transform(Vector2(x, CELL), -PI / 2.0)
			ItemIcon.draw(self, c, Vector2.ZERO, false)
			draw_set_transform(Vector2.ZERO)
			x += n * CELL

	func _process(_d: float) -> void:
		queue_redraw()
