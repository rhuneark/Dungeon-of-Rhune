class_name Economy
## Town services that cost gold: vendors, Odo's sealed goods (gambling), the
## Wishing Well, Brannoc's socket punch and Crucible recipes.

const VENDOR_W := 10
const VENDOR_H := 10
const RESTOCK_MS := 3 * 60 * 1000
## Odo's odds. Uniques are rare; rares less so; everything else is magic.
const GAMBLE_ODDS := {"unique": 0.015, "rare": 0.1}

## npc id -> {grid, level, at}
static var _stocks: Dictionary = {}


static func has_quirk(id: String) -> bool:
	return Game.sheet().raw.get("quirk:" + id, 0) > 0


# ------------------------------------------------------------------ vendors
static func _roll_vendor_stock(level: int) -> Dictionary:
	var rng := Rng.new()
	var grid := Grid.make(VENDOR_W, VENDOR_H, [])
	var pool: Array = []
	var weights: Array = []
	for b in ItemBases.equipment_bases():
		if b.qlvl <= level + 3 and b.category != "curio":
			pool.append(b)
			weights.append(b.weight)
	var i := 0
	while i < 40 and grid.items.size() < 22:
		i += 1
		var base: Dictionary = pool[rng.weighted(weights)]
		var quality := "magic" if base.alwaysMagic or rng.chance(0.45) else ("superior" if rng.chance(0.2) else "normal")
		var it := ItemGen.create_item(base.id, {"ilvl": level + 3, "quality": quality, "rng": rng, "identified": true})
		Grid.auto_place(grid, it)
	return grid


static func _herb_stock(level: int) -> Dictionary:
	var grid := Grid.make(VENDOR_W, 4, [])
	var ids := ["potion_health", "potion_health", "potion_health", "potion_mana", "potion_mana", "potion_mana", "scroll_identify", "scroll_identify"]
	if level >= 8:
		ids.append("potion_rejuv")
	for id in ids:
		Grid.auto_place(grid, ItemGen.create_item(id, {"ilvl": 1}))
	return grid


## The vendor's shelf (restocks on level-up or every 3 minutes).
static func vendor_grid(npc_id: String) -> Dictionary:
	var level: int = Game.hero().level
	var s: Dictionary = _stocks.get(npc_id, {})
	var now := HeroData.now_ms()
	if s.is_empty() or s.level != level or now - s.at > RESTOCK_MS:
		s = {"grid": _herb_stock(level) if npc_id == "ysolde" else _roll_vendor_stock(level), "level": level, "at": now}
		_stocks[npc_id] = s
	return s.grid


static func restock(npc_id: String) -> void:
	_stocks.erase(npc_id)
	Game.changed.emit()


static func vendor_price(item: Dictionary) -> int:
	var p := ItemText.buy_price(item)
	return ceili(p * 0.9 if has_quirk("pickpocket") else float(p))


static func buy(npc_id: String, uid: String) -> void:
	var hero := Game.hero()
	var grid := vendor_grid(npc_id)
	var item: Dictionary = {}
	for it in grid.items:
		if it.uid == uid:
			item = it
			break
	if item.is_empty():
		return
	var price := vendor_price(item)
	if hero.gold < price:
		Game.float_text("Not enough gold.", "#e8e4d8")
		return
	# Ysolde's shelves never run dry: sell a copy.
	var infinite := npc_id == "ysolde"
	var bought := ItemGen.create_item(item.baseId, {"ilvl": item.ilvl}) if infinite else item
	if not Grid.auto_place(Actions.grid_of("inv"), bought):
		Game.float_text("I have no room.", "#e8e4d8")
		return
	if not infinite:
		Grid.remove_item(grid, uid)
	hero.gold -= price
	Game.commit()


# ----------------------------------------------------------------- gambling
## -> [{baseId, price}]
static func gamble_offers() -> Array:
	var hero := Game.hero()
	var ruin := 1.1 if has_quirk("ruin") else 1.0
	var out: Array = []
	for b in ItemBases.equipment_bases():
		if b.qlvl <= hero.level + 5 and b.category != "curio":
			var price := Rng.jround((b.price * 2.5 + 60 * hero.level) * (1 + b.qlvl / 15.0) * (2 if b.category == "jewelry" else 1) * ruin)
			out.append({"baseId": b.id, "price": price})
	return out


static func gamble(base_id: String) -> void:
	var hero := Game.hero()
	var offer := {}
	for o in gamble_offers():
		if o.baseId == base_id:
			offer = o
			break
	if offer.is_empty():
		return
	if hero.gold < offer.price:
		Game.float_text("Not enough gold.", "#e8e4d8")
		return
	var rng := Rng.new()
	var ilvl := maxi(1, hero.level + rng.int_range(-2, 4))
	var base := ItemBases.get_base(base_id)
	var quality := "magic"
	var r := rng.next_float()
	if r < GAMBLE_ODDS.unique and not Uniques.for_base(base_id, ilvl).is_empty():
		quality = "unique"
	elif r < GAMBLE_ODDS.unique + GAMBLE_ODDS.rare and base.category != "curio":
		quality = "rare"
	var item := ItemGen.create_item(base_id, {"ilvl": ilvl, "quality": quality, "rng": rng, "identified": true})
	if not Grid.auto_place(Actions.grid_of("inv"), item):
		Game.float_text("I have no room.", "#e8e4d8")
		return
	hero.gold -= offer.price
	Game.save.stats.gambles += 1
	Actions.register_find(item)
	if item.quality == "unique":
		Game.float_text("!!!", "#c9a46b")
	QuestRules.emit("gamble")
	Game.commit()


# ------------------------------------------------------------- wishing well
static func wish_cost() -> int:
	return 25 + 15 * int(Game.hero().level)


static func make_wish() -> void:
	var hero := Game.hero()
	var cost := wish_cost()
	if hero.gold < cost:
		Game.float_text("Not enough gold.", "#e8e4d8")
		return
	hero.gold -= cost
	Game.save.stats.wishes += 1
	var fortune: Dictionary = Game.sheet().fortune
	var r := Rng.world().next_float()
	var drops := Loot.roll_treasure("well", {"ilvl": hero.level + 1, "fortune": fortune})
	if r < 0.03:
		# Jackpot: the well is in a generous mood.
		drops.append_array(Loot.roll_treasure("well", {"ilvl": hero.level + 2, "fortune": fortune}))
		drops.append_array(Loot.roll_treasure("well", {"ilvl": hero.level + 2, "fortune": fortune}))
		Game.toast("The well gurgles happily.", "#7ec8e3")
	elif r < 0.05:
		drops = [{"kind": "gold", "amount": cost * 3}]
		Game.toast("The well burps up your coin. And some of someone else’s.", "#7ec8e3")
	Game.spawn_drops(drops, "well")
	QuestRules.emit("wish")
	Game.commit()


# -------------------------------------------------------------- the smith
static func socket_cost(item: Dictionary) -> int:
	return 150 + int(item.ilvl) * 25


static func can_punch(item: Dictionary) -> bool:
	var base := ItemBases.get_base(item.baseId)
	return (item.quality == "normal" or item.quality == "superior") and item.sockets == 0 and base.maxSockets > 0


static func punch_sockets(item: Dictionary) -> void:
	var hero := Game.hero()
	if not can_punch(item):
		return
	var cost := socket_cost(item)
	if hero.gold < cost:
		Game.float_text("Not enough gold.", "#e8e4d8")
		return
	var mx: int = ItemBases.get_base(item.baseId).maxSockets
	hero.gold -= cost
	item.sockets = Rng.world().int_range(ceili(mx / 2.0), mx)
	Game.toast("Brannoc punches %d socket%s." % [item.sockets, "s" if item.sockets > 1 else ""], "#a3a3a3")
	Game.commit()


# ------------------------------------------------------------- the crucible
const RECIPES := [
	{"id": "rhune_up", "name": "Ascend", "text": "3 identical Rhunes -> the next Rhune"},
	{"id": "reforge", "name": "Reforge", "text": "3 magic items of the same slot -> a new magic item of that slot (item level +2)"},
	{"id": "unsocket", "name": "Unspeak", "text": "A socketed item + an Ash Rhune -> the item with empty sockets (its rhunes are lost)"},
]


## -> [{id, name, text}]
static func recipes() -> Array:
	return RECIPES


static func _is_rhune(i: Dictionary) -> bool:
	return ItemBases.get_base(i.baseId).category == "rhune"


static func _matches(id: String, it: Array) -> bool:
	match id:
		"rhune_up":
			if it.size() != 3:
				return false
			for i in it:
				if not _is_rhune(i) or i.baseId != it[0].baseId:
					return false
			return not Rhunes.next_rhune(Rhunes.rhune_id_from_base(it[0].baseId)).is_empty()
		"reforge":
			if it.size() != 3:
				return false
			var slot: String = ItemBases.get_base(it[0].baseId).slot
			for i in it:
				var s: String = ItemBases.get_base(i.baseId).slot
				if i.quality != "magic" or s == "" or s != slot:
					return false
			return true
		"unsocket":
			if it.size() != 2:
				return false
			var ash := false
			var socketed := false
			for i in it:
				if i.baseId == "rhune_ash":
					ash = true
				if not i.socketed.is_empty():
					socketed = true
			return ash and socketed
	return false


static func _make(id: String, it: Array) -> Array:
	match id:
		"rhune_up":
			var nxt := Rhunes.next_rhune(Rhunes.rhune_id_from_base(it[0].baseId))
			return [ItemGen.create_item("rhune_" + nxt.id, {"ilvl": 99})]
		"reforge":
			var slot: String = ItemBases.get_base(it[0].baseId).slot
			var total := 0
			for i in it:
				total += int(i.ilvl)
			var ilvl := Rng.jround(total / 3.0) + 2
			var pool: Array = []
			for b in ItemBases.all():
				if b.slot == slot and b.qlvl <= ilvl:
					pool.append(b)
			var b: Dictionary = pool[Rng.world().int_range(0, pool.size() - 1)]
			return [ItemGen.create_item(b.id, {"ilvl": ilvl, "quality": "magic", "identified": true})]
		"unsocket":
			var target: Dictionary = {}
			for i in it:
				if not i.socketed.is_empty():
					target = i
					break
			target.socketed = []
			if target.quality == "rhuneword":
				target.quality = "normal"
				target.erase("rhunewordId")
			return [target]
	return []


## The recipe these crucible contents match, or {}.
static func find_recipe(contents: Array) -> Dictionary:
	for r in RECIPES:
		if _matches(r.id, contents):
			return r
	return {}


## Run whichever recipe matches the crucible contents. Returns the products
## ([] if nothing matched). The caller replaces the crucible contents.
static func transmute(contents: Array) -> Array:
	var recipe := find_recipe(contents)
	if recipe.is_empty():
		return []
	var out := _make(recipe.id, contents)
	for o in out:
		Actions.register_find(o)
	Game.toast("The crucible hisses: %s." % recipe.name, "#ff9b3d")
	return out
