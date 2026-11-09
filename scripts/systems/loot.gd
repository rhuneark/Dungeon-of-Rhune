class_name Loot
## Drop resolution: treasure class + fortune -> concrete drops.
##
## Fortune is the player's loot profile:
##   rarity   - Rarity Find: better quality rolls (diminishing on unique/rare)
##   quantity - fewer "nothing" picks
##   gold     - bigger gold piles
##   seek     - per-kind multipliers on what gets picked (weapon/armor/...),
##              and seek.unique boosts only the unique roll
##
## Fortune: {rarity, quantity, gold, seek: {kind: pct}}
## Drop:    {kind: "item", item} | {kind: "gold", amount}
## Context: {ilvl, fortune, rng (optional Rng)}

const NO_FORTUNE := {"rarity": 0, "quantity": 0, "gold": 0, "seek": {}}


static func _dim(rf: float, k: float) -> float:
	return (rf * k) / (rf + k) if k > 0 else rf


## D2-style best-first quality roll.
static func roll_quality(ilvl: int, qlvl: int, fortune: Dictionary, bonus: Dictionary, rng: Rng) -> String:
	var over := maxi(0, ilvl - qlvl)
	var T := TreasureClasses.QUALITY_TUNING
	var rf := float(fortune.get("rarity", 0))
	var seek: Dictionary = fortune.get("seek", {})
	var p_unique: float = T.unique.base * (1 + over * T.unique.perLevelOver) * (1 + _dim(rf, T.unique.dimK) / 100.0) \
		* (1 + seek.get("unique", 0) / 100.0) * bonus.get("unique", 1)
	if rng.chance(p_unique):
		return "unique"
	var p_rare: float = T.rare.base * (1 + over * T.rare.perLevelOver) * (1 + _dim(rf, T.rare.dimK) / 100.0) * bonus.get("rare", 1)
	if rng.chance(p_rare):
		return "rare"
	var p_magic: float = T.magic.base * (1 + rf / 100.0) * bonus.get("magic", 1)
	if rng.chance(p_magic):
		return "magic"
	if rng.chance(T.superior):
		return "superior"
	if ilvl < T.crude.belowIlvl and rng.chance(T.crude.chance):
		return "crude"
	return "normal"


static func _pick_equip_base(category: String, ilvl: int, rng: Rng) -> Dictionary:
	var pool: Array = []
	var weights: Array = []
	for b in ItemBases.equipment_bases():
		if b.qlvl <= ilvl and ItemBases.seek_kind_of(b) == category:
			pool.append(b)
			# Favour bases near the item level so deep drops aren't all daggers.
			weights.append(b.weight * (0.5 + float(b.qlvl) / maxi(1, ilvl)))
	var i := rng.weighted(weights)
	return pool[i] if i >= 0 else {}


static func _pick_rhune(ilvl: int, rng: Rng) -> String:
	var pool: Array = []
	var weights: Array = []
	for r in Rhunes.all():
		if r.qlvl <= ilvl:
			pool.append(r)
			weights.append(r.weight)
	var i := rng.weighted(weights)
	return "rhune_" + pool[i].id if i >= 0 else ""


static func _entry_seek_kind(pick: Dictionary) -> String:
	if pick.kind == "equip":
		return pick.category
	if pick.kind == "rhune":
		return "rhune"
	return ""


static func _resolve_pick(pick: Dictionary, ctx: Dictionary, bonus: Dictionary, out: Array, depth: int) -> void:
	var ilvl: int = ctx.ilvl
	var fortune: Dictionary = ctx.fortune
	var rng: Rng = ctx.rng
	match pick.kind:
		"gold":
			var amount := maxi(1, Rng.jround(ilvl * rng.int_range(4, 12) * pick.get("mult", 1) * (1 + fortune.get("gold", 0) / 100.0)))
			out.append({"kind": "gold", "amount": amount})
		"potion":
			var id := "potion_rejuv" if ilvl >= 8 and rng.chance(0.06) else ("potion_health" if rng.chance(0.6) else "potion_mana")
			out.append({"kind": "item", "item": ItemGen.create_item(id, {"ilvl": ilvl, "rng": rng})})
		"scroll":
			out.append({"kind": "item", "item": ItemGen.create_item("scroll_identify", {"ilvl": ilvl, "rng": rng})})
		"rhune":
			var id := _pick_rhune(ilvl, rng)
			if id != "":
				out.append({"kind": "item", "item": ItemGen.create_item(id, {"ilvl": ilvl, "rng": rng})})
		"base":
			out.append({"kind": "item", "item": ItemGen.create_item(pick.id, {"ilvl": ilvl, "rng": rng})})
		"equip":
			var base := _pick_equip_base(pick.category, ilvl, rng)
			if base.is_empty():
				return
			var quality := roll_quality(ilvl, base.qlvl, fortune, bonus, rng)
			out.append({"kind": "item", "item": ItemGen.create_item(base.id, {"ilvl": ilvl, "quality": quality, "rng": rng})})
		"tc":
			if depth < 4:
				_resolve_tc_into(pick.id, ctx, out, depth + 1)


static func _resolve_tc_into(tc_id: String, ctx: Dictionary, out: Array, depth: int) -> void:
	var tc := TreasureClasses.get_tc(tc_id)
	var fortune: Dictionary = ctx.fortune
	var rng: Rng = ctx.rng
	var seek: Dictionary = fortune.get("seek", {})
	var no_drop: float = (tc.noDrop * 100.0) / (100.0 + maxf(0.0, fortune.get("quantity", 0)))
	var weights: Array = []
	var total := 0.0
	for e in tc.entries:
		var kind := _entry_seek_kind(e.pick)
		var s: float = seek.get(kind, 0) if kind != "" else 0.0
		var w: float = e.weight * (1 + s / 100.0)
		weights.append(w)
		total += w
	for p in tc.picks:
		if rng.next_float() * (total + no_drop) >= total:
			continue # the "nothing" pick
		var i := rng.weighted(weights)
		if i >= 0:
			_resolve_pick(tc.entries[i].pick, ctx, tc.get("quality", {}), out, depth)


## Roll a treasure class.
static func roll_treasure(tc_id: String, ctx: Dictionary) -> Array:
	var full := {
		"ilvl": int(ctx.get("ilvl", 1)),
		"fortune": ctx.get("fortune", NO_FORTUNE),
		"rng": ctx.get("rng") if ctx.get("rng") != null else Rng.new(),
	}
	var out: Array = []
	_resolve_tc_into(tc_id, full, out, 0)
	return out


## Simulate N rolls and tally quality/kind (powers the Loot Lab panel).
## Returns {tally: {key: count}, gold, n}; keys: gold, rhune, consumable, or a quality.
static func simulate_drops(tc_id: String, ctx: Dictionary, n: int) -> Dictionary:
	var rng: Rng = ctx.get("rng") if ctx.get("rng") != null else Rng.new(12345)
	var c := ctx.duplicate()
	c.rng = rng
	var tally := {}
	var gold := 0
	for i in n:
		for d in roll_treasure(tc_id, c):
			if d.kind == "gold":
				gold += d.amount
				tally.gold = tally.get("gold", 0) + 1
			else:
				var base := ItemBases.get_base(d.item.baseId)
				var key: String = "rhune" if base.category == "rhune" else ("consumable" if base.category == "consumable" else d.item.quality)
				tally[key] = tally.get(key, 0) + 1
	return {"tally": tally, "gold": gold, "n": n}
