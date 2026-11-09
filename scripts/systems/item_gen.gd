class_name ItemGen
## Item generation: base + item level + quality -> item instance.
## Pure functions over content tables; every roll goes through an Rng.
##
## create_item opts: {ilvl (int, required), quality ("normal"), rng (Rng),
##                    uniqueId (force a specific unique), identified (bool)}


## Roll one stat line -> [v] or [min, max] for ranged stats.
static func roll_stat(roll: Dictionary, rng: Rng) -> Array:
	var v := rng.int_range(mini(roll.min, roll.max), maxi(roll.min, roll.max))
	if not roll.has("min2") or not roll.has("max2") or roll.min2 == null or roll.max2 == null:
		return [v]
	var v2 := maxi(v, rng.int_range(roll.min2, roll.max2))
	return [v, v2]


static func _curio_scale(base: Dictionary) -> float:
	if "curio_small" in base.tags:
		return 0.35
	if "curio_medium" in base.tags:
		return 0.55
	if "curio_large" in base.tags:
		return 0.75
	return 1.0


static func _roll_affix_values(affix: Dictionary, tier_idx: int, base: Dictionary, rng: Rng) -> Array:
	var scale := 1.0 if String(affix.id).begins_with("c_") else _curio_scale(base)
	var out: Array = []
	for roll in affix.tiers[tier_idx].rolls:
		var vals := roll_stat(roll, rng)
		if scale == 1.0 or String(roll.stat).begins_with("skillDisc:"):
			out.append(vals)
		else:
			var scaled: Array = []
			for v in vals:
				scaled.append(maxi(1, Rng.jround(v * scale)))
			out.append(scaled)
	return out


## Candidate (affix, tier) pairs for a base at an item level. Top 3 tiers weighted 1 / 0.6 / 0.3.
static func _candidates(kind: String, base: Dictionary, ilvl: int, used_groups: Dictionary) -> Array:
	var out: Array = []
	const FALLOFF := [1.0, 0.6, 0.3]
	for affix in Affixes.all():
		if affix.kind != kind or affix.weight <= 0 or used_groups.has(affix.group):
			continue
		if not Affixes.allowed_on(affix, base.tags):
			continue
		var eligible: Array = []
		for i in affix.tiers.size():
			var tier: Dictionary = affix.tiers[i]
			if tier.alvl > ilvl:
				continue
			if tier.has("maxIlvl") and ilvl > tier.maxIlvl:
				continue
			if affix.group == "sockets" and tier.rolls[0].max > base.maxSockets:
				continue
			eligible.append(i)
		var top := eligible.slice(-3)
		top.reverse()
		for rank in top.size():
			out.append({"affix": affix, "tier": top[rank], "weight": affix.weight * FALLOFF[rank]})
	return out


static func _pick_affix(kind: String, base: Dictionary, ilvl: int, used: Dictionary, rng: Rng) -> Dictionary:
	var c := _candidates(kind, base, ilvl, used)
	var weights: Array = []
	for x in c:
		weights.append(x.weight)
	var i := rng.weighted(weights)
	if i < 0:
		return {}
	var affix: Dictionary = c[i].affix
	var tier: int = c[i].tier
	used[affix.group] = true
	return {"affixId": affix.id, "tier": tier, "values": _roll_affix_values(affix, tier, base, rng)}


static func _roll_magic(base: Dictionary, ilvl: int, rng: Rng) -> Array:
	var used := {}
	var roll := rng.next_float()
	var want_prefix := roll < 0.75
	var want_suffix := roll >= 0.5 or not want_prefix
	var out: Array = []
	if want_prefix:
		var a := _pick_affix("prefix", base, ilvl, used, rng)
		if not a.is_empty():
			out.append(a)
	if want_suffix or out.is_empty():
		var a := _pick_affix("suffix", base, ilvl, used, rng)
		if not a.is_empty():
			out.append(a)
	return out


static func _roll_rare(base: Dictionary, ilvl: int, rng: Rng) -> Array:
	var max_count := 6 if ilvl >= 20 else (5 if ilvl >= 10 else 4)
	var count := rng.int_range(3, max_count)
	var used := {}
	var out: Array = []
	var prefixes := 0
	var suffixes := 0
	for i in count:
		var can_pre := prefixes < 3
		var can_suf := suffixes < 3
		if not can_pre and not can_suf:
			break
		var kind := "prefix" if can_pre and (not can_suf or rng.chance(0.5)) else "suffix"
		var a := _pick_affix(kind, base, ilvl, used, rng)
		if a.is_empty():
			a = _pick_affix("suffix" if kind == "prefix" else "prefix", base, ilvl, used, rng)
		if a.is_empty():
			break
		out.append(a)
		if Affixes.get_affix(a.affixId).kind == "prefix":
			prefixes += 1
		else:
			suffixes += 1
	return out


## Defense roll for armor; weapons keep base damage (affixes modify it).
static func _roll_base_numbers(base: Dictionary, rng: Rng) -> Array:
	if not base.armor.is_empty():
		return [rng.int_range(base.armor[0], base.armor[1])]
	return []


static func _roll_plain_sockets(base: Dictionary, rng: Rng) -> int:
	if base.maxSockets <= 0 or not rng.chance(0.25):
		return 0
	# Weighted toward fewer sockets: 1 is common, max is rare.
	var weights: Array = []
	for i in base.maxSockets:
		weights.append(1.0 / (i + 1))
	return rng.weighted(weights) + 1


static func create_item(base_id: String, opts: Dictionary = {}) -> Dictionary:
	var rng: Rng = opts.get("rng") if opts.get("rng") != null else Rng.new()
	var base := ItemBases.get_base(base_id)
	var ilvl := maxi(1, Rng.jround(float(opts.get("ilvl", 1))))
	var quality: String = opts.get("quality", "normal")

	var item := {
		"uid": Rng.uid(),
		"baseId": base_id,
		"quality": quality,
		"ilvl": ilvl,
		"seed": rng.int_range(0, 2147483647),
		"identified": true,
		"affixes": [],
		"baseRoll": _roll_base_numbers(base, rng),
		"sockets": 0,
		"socketed": [],
	}

	if base.category in ["consumable", "quest", "rhune"]:
		item.quality = "normal"
		if base.category == "consumable":
			item.qty = 1
		return item

	if base.alwaysMagic and quality in ["normal", "superior", "crude"]:
		quality = "magic"
	if base.category == "curio" and quality == "rare":
		quality = "magic"

	if quality == "unique":
		var pool: Array = []
		var forced: String = opts.get("uniqueId", "")
		if forced != "":
			for u in Uniques.for_base(base_id, 999):
				if u.id == forced:
					pool.append(u)
		else:
			pool = Uniques.for_base(base_id, ilvl)
		var weights: Array = []
		for u in pool:
			weights.append(u.weight)
		var i := rng.weighted(weights)
		if i >= 0:
			var u: Dictionary = pool[i]
			item.quality = "unique"
			item.uniqueId = u.id
			var vals: Array = []
			for roll in u.rolls:
				vals.append(roll_stat(roll, rng))
			item.uniqueValues = vals
			item.identified = opts.get("identified", false)
			return item
		# No unique exists for this base at this level: D2 makes it a rare instead.
		quality = "magic" if base.category == "curio" else "rare"

	item.quality = quality
	match quality:
		"rare":
			item.affixes = _roll_rare(base, ilvl, rng)
			item.rareName = [rng.int_range(0, RareNames.FIRST.size() - 1), rng.int_range(0, 1000)]
			item.identified = opts.get("identified", false)
		"magic":
			item.affixes = _roll_magic(base, ilvl, rng)
			item.identified = opts.get("identified", false)
		"superior", "crude":
			var armor_like: bool = not base.armor.is_empty()
			var aid := (quality + ("_a" if armor_like else "_w"))
			var a := Affixes.get_affix(aid)
			if not base.damage.is_empty() or armor_like:
				item.affixes = [{"affixId": a.id, "tier": 0, "values": _roll_affix_values(a, 0, base, rng)}]
			item.sockets = _roll_plain_sockets(base, rng)
		_:
			item.sockets = _roll_plain_sockets(base, rng)
	# Socket prefixes ("Graven") add sockets on magic/rare items.
	for a in item.affixes:
		if Affixes.get_affix(a.affixId).get("group", "") == "sockets":
			item.sockets = mini(base.maxSockets, item.sockets + a.values[0][0])
	return item


## Second word of a rare name, by slot.
static func rare_second_pool(base: Dictionary) -> Array:
	if base.category == "curio":
		return RareNames.SECOND.curio
	if base.category == "weapon":
		if "caster" in base.tags:
			return RareNames.SECOND.caster
		if "ranged" in base.tags:
			return RareNames.SECOND.ranged
		return RareNames.SECOND.weapon
	var slot: String = base.slot if base.slot != "" else "weapon"
	return RareNames.SECOND.get(slot, RareNames.SECOND.weapon)


static func make_consumable(base_id: String, qty := 1) -> Dictionary:
	var item := create_item(base_id, {"ilvl": 1})
	item.qty = qty
	return item
