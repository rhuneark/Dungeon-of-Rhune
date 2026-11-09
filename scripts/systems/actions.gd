class_name Actions
## Item flow: the one place items move between ground, backpack, stash,
## paperdoll and cursor. D2 rules: click picks an item up onto the cursor;
## click again to place (swapping with exactly one item); drop a rhune onto
## an item with an open socket to set it. Works on Game.save / Game.hero().

const EQUIP_SLOTS := ["weapon", "offhand", "head", "chest", "hands", "feet", "waist", "neck", "ring1", "ring2"]


## kind: "inv" | "stash" | "crucible". The grid's items Array is the save's own.
static func grid_of(kind: String) -> Dictionary:
	var hero := Game.hero()
	if kind == "inv":
		return Grid.make(HeroData.INV_W, HeroData.INV_H, hero.inventory)
	if kind == "crucible":
		return Grid.make(HeroData.CRUCIBLE_W, HeroData.CRUCIBLE_H, hero.crucible)
	return Grid.make(HeroData.STASH_W, HeroData.STASH_H, Game.save.stash)


static func _find_uid(items: Array, uid: String) -> Dictionary:
	if uid == "":
		return {}
	for it in items:
		if it.uid == uid:
			return it
	return {}


static func _find_base(items: Array, base_id: String) -> Dictionary:
	for it in items:
		if it.baseId == base_id:
			return it
	return {}


static func _has_cursor(hero: Dictionary) -> bool:
	return hero.get("cursor") is Dictionary


# ------------------------------------------------------------------ codex
## Record a first find. Uniques store their best roll quality (0..1).
static func register_find(item: Dictionary) -> void:
	var save := Game.save
	var base := ItemBases.get_base(item.baseId)
	var key := ""
	var score := 1.0
	if base.category == "rhune":
		key = "r:" + Rhunes.rhune_id_from_base(item.baseId)
	elif item.quality == "unique" and item.get("uniqueId", "") != "" and item.identified:
		key = "u:" + item.uniqueId
		var u := Uniques.get_unique(item.uniqueId)
		if not u.is_empty():
			var uv: Array = item.get("uniqueValues", [])
			var total := 0.0
			for i in u.rolls.size():
				var r: Dictionary = u.rolls[i]
				if r.max == r.min:
					total += 1.0
				else:
					var v: float = uv[i][0] if i < uv.size() and not uv[i].is_empty() else r.min
					total += (v - r.min) / float(r.max - r.min)
			score = total / u.rolls.size() if u.rolls.size() > 0 else 1.0
	elif item.quality == "rhuneword" and item.get("rhunewordId", "") != "":
		key = "w:" + item.rhunewordId
	if key == "":
		return
	if not save.codex.has(key):
		save.codex[key] = {"at": HeroData.now_ms(), "best": score}
		if key.begins_with("u:"):
			save.stats.uniquesFound += 1
			Game.toast("Codex: new unique — " + ItemText.item_name(item), ItemText.QUALITY_COLORS.unique)
		if key.begins_with("r:"):
			save.stats.rhunesFound += 1
	elif score > save.codex[key].best:
		save.codex[key].best = score
		if key.begins_with("u:"):
			Game.toast("Codex: better roll on %s (%d%%)" % [ItemText.item_name(item), Rng.jround(score * 100)], ItemText.QUALITY_COLORS.unique)


# ----------------------------------------------------------------- ground
## Picking up from the ground. Returns false if there's no room.
static func pick_up(item: Dictionary) -> bool:
	var hero := Game.hero()
	if not Grid.auto_place(grid_of("inv"), item):
		Game.float_text("I have no room.", "#e8e4d8")
		return false
	register_find(item)
	QuestRules.emit("pickup", item.baseId)
	Game.commit()
	return hero.inventory.has(item)


static func drop_cursor() -> void:
	var hero := Game.hero()
	if not _has_cursor(hero):
		return
	var item: Dictionary = hero.cursor
	hero.cursor = null
	Game.spawn_drops([{"kind": "item", "item": item}], "player")
	Game.commit()


# ---------------------------------------------------------------- sockets
static func can_socket(rhune: Dictionary, target: Dictionary) -> bool:
	return ItemBases.get_base(rhune.baseId).category == "rhune" and target.sockets > target.socketed.size()


static func _socket_into(rhune: Dictionary, target: Dictionary) -> void:
	rhune.erase("x")
	rhune.erase("y")
	target.socketed.append(rhune)
	QuestRules.emit("socket")
	var base := ItemBases.get_base(target.baseId)
	if target.socketed.size() == target.sockets and (target.quality == "normal" or target.quality == "superior"):
		var ids: Array = []
		for s in target.socketed:
			ids.append(Rhunes.rhune_id_from_base(s.baseId))
		var rw := Rhunes.find_rhuneword(ids, base.tags)
		if not rw.is_empty():
			target.quality = "rhuneword"
			target.rhunewordId = rw.id
			var kept: Array = []
			for a in target.affixes:
				if String(a.affixId).begins_with("superior"):
					kept.append(a)
			target.affixes = kept
			register_find(target)
			QuestRules.emit("rhuneword")
			Game.toast("The rhunes speak: %s!" % rw.name, ItemText.QUALITY_COLORS.unique)
			Game.float_text(rw.name, ItemText.QUALITY_COLORS.unique)


# ------------------------------------------------------------- identify
static func identify(item: Dictionary) -> bool:
	if item.identified:
		return false
	item.identified = true
	Game.save.stats.identified += 1
	register_find(item)
	QuestRules.emit("identify")
	return true


static func identify_all() -> int:
	var hero := Game.hero()
	var n := 0
	var all: Array = hero.inventory.duplicate()
	all.append_array(hero.equipped.values())
	if _has_cursor(hero):
		all.append(hero.cursor)
	for it in all:
		if it is Dictionary and identify(it):
			n += 1
	for it in Game.save.stash:
		if identify(it):
			n += 1
	Game.commit()
	return n


static func _use_scroll_on(target: Dictionary) -> void:
	var hero := Game.hero()
	if not target.is_empty() and not target.identified:
		var scroll := _find_base(hero.inventory, "scroll_identify")
		if not scroll.is_empty():
			Grid.remove_item(grid_of("inv"), scroll.uid)
			identify(target)
	Game.set_ui({"cursor_mode": ""})
	Game.commit()


# ------------------------------------------------------------- grid clicks
## Click on a grid at the cell where the cursor item's top-left would land
## (the UI computes it), or on an item (target_uid) when the cursor is empty.
static func click_grid(kind: String, cx: int, cy: int, target_uid := "") -> void:
	var hero := Game.hero()
	var grid := grid_of(kind)

	if Game.ui.get("cursor_mode", "") == "identify":
		_use_scroll_on(_find_uid(grid.items, target_uid))
		return

	if not _has_cursor(hero):
		if target_uid == "":
			return
		var it := Grid.remove_item(grid, target_uid)
		if not it.is_empty():
			hero.cursor = it
		Game.commit()
		return

	# Holding something: socket into the item under the mouse, if possible.
	var target := _find_uid(grid.items, target_uid)
	if not target.is_empty() and can_socket(hero.cursor, target):
		_socket_into(hero.cursor, target)
		hero.cursor = null
		Game.commit()
		return
	var res := Grid.place_or_swap(grid, hero.cursor, cx, cy)
	if res.ok:
		hero.cursor = res.swapped if not res.swapped.is_empty() else null
		Game.commit()


## Right-click: sell / transfer / use / equip.
static func right_click_item(kind: String, uid: String) -> void:
	var hero := Game.hero()
	var left: String = Game.ui.get("left", "")
	var grid := grid_of(kind)
	var item := _find_uid(grid.items, uid)
	if item.is_empty() or _has_cursor(hero):
		return
	var base := ItemBases.get_base(item.baseId)

	if kind == "inv" and left in ["vendor", "herbs", "gamble"]:
		sell(item)
		return
	if left == "stash" or left == "smith" or kind == "crucible":
		var other_kind := "inv" if kind != "inv" else ("crucible" if left == "smith" else "stash")
		var other := grid_of(other_kind)
		Grid.remove_item(grid, uid)
		if not Grid.auto_place(other, item):
			Grid.auto_place(grid, item)
			Game.toast("No room.")
		Game.commit()
		return
	if kind == "inv" and base.use != "":
		use_consumable(item)
		return
	if kind == "inv" and base.slot != "":
		Grid.remove_item(grid, uid)
		hero.cursor = item
		var slot := _best_slot_for(item)
		if slot != "":
			click_equip(slot)
		# Whatever ended up on the cursor goes back to the bag.
		if _has_cursor(hero):
			if not Grid.auto_place(grid, hero.cursor):
				Game.commit()
				return
			hero.cursor = null
		Game.commit()


static func use_consumable(item: Dictionary) -> void:
	var hero := Game.hero()
	var base := ItemBases.get_base(item.baseId)
	var sheet := Game.sheet()
	match base.use:
		"heal":
			hero.life = sheet.life
			Grid.remove_item(grid_of("inv"), item.uid)
			Game.float_text("+life", "#e05050")
		"mana":
			hero.mana = sheet.mana
			Grid.remove_item(grid_of("inv"), item.uid)
			Game.float_text("+mana", "#5a7cff")
		"rejuv":
			hero.life = sheet.life
			hero.mana = sheet.mana
			Grid.remove_item(grid_of("inv"), item.uid)
			Game.float_text("Rejuvenated", "#b57cff")
		"identify":
			Game.set_ui({"cursor_mode": "identify"})
			Game.toast("Click an unidentified item.")
			return
	Game.commit()


# ---------------------------------------------------------------- equipping
static func slot_fits(item: Dictionary, slot: String) -> bool:
	var base := ItemBases.get_base(item.baseId)
	if base.slot == "":
		return false
	if base.slot == "ring":
		return slot == "ring1" or slot == "ring2"
	return base.slot == slot


static func _best_slot_for(item: Dictionary) -> String:
	var base := ItemBases.get_base(item.baseId)
	if base.slot == "":
		return ""
	if base.slot == "ring":
		var eq: Dictionary = Game.hero().equipped
		return "ring1" if not eq.has("ring1") else ("ring2" if not eq.has("ring2") else "ring1")
	return base.slot


static func click_equip(slot: String) -> void:
	var hero := Game.hero()
	var current: Dictionary = hero.equipped.get(slot, {})
	var held = hero.cursor

	if Game.ui.get("cursor_mode", "") == "identify":
		_use_scroll_on(current)
		return

	if not held is Dictionary:
		if not current.is_empty():
			hero.equipped.erase(slot)
			hero.cursor = current
			Game.commit()
		return
	if not current.is_empty() and can_socket(held, current):
		_socket_into(held, current)
		hero.cursor = null
		Game.commit()
		return
	if not slot_fits(held, slot):
		Game.float_text("I can't use that there.", "#e8e4d8")
		return
	var base := ItemBases.get_base(held.baseId)
	if slot == "offhand" and hero.equipped.has("weapon") and ItemBases.get_base(hero.equipped.weapon.baseId).twoHanded:
		Game.float_text("Both hands are busy.", "#e8e4d8")
		return
	if slot == "weapon" and base.twoHanded and hero.equipped.has("offhand"):
		# Move the off-hand to the bag first; refuse if it won't fit.
		if not Grid.auto_place(grid_of("inv"), hero.equipped.offhand):
			Game.float_text("No room for my off-hand.", "#e8e4d8")
			return
		hero.equipped.erase("offhand")
	held.erase("x")
	held.erase("y")
	hero.equipped[slot] = held
	hero.cursor = current if not current.is_empty() else null
	Game.commit()


# ------------------------------------------------------------------ selling
static func sell(item: Dictionary) -> void:
	var hero := Game.hero()
	var base := ItemBases.get_base(item.baseId)
	if base.category == "quest":
		Game.toast("Varn would never forgive you.")
		return
	var price := ItemText.sell_price(item)
	Grid.remove_item(grid_of("inv"), item.uid)
	hero.gold += price
	Game.float_text("+%d gold" % price, ItemText.QUALITY_COLORS.gold)
	Game.commit()


## Free backpack cells, for the HUD bag counter.
static func free_cells(hero: Dictionary) -> int:
	var used := 0
	for it in hero.inventory:
		var s := Grid.size_of(it)
		used += s.x * s.y
	return HeroData.INV_W * HeroData.INV_H - used
