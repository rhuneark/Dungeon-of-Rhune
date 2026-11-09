class_name CharacterSheet
## Character sheet: sums every source of stats into one view.
##
## Sources: base attributes, equipped items (only if requirements are met:
## unmet gear shows red and does nothing, like D2), curios carried in the
## backpack, Discipline ranks, passive skills, and 'stat:' nodes in skill trees.
##
## Sheet: {raw: {stat: n, "<stat>.max": n}, attrs: {might, finesse, vigor, spirit},
##         life, mana, armor, block, res: {fire, cold, lightning, poison, void},
##         damage: [min, max], adds: {type: [min, max]}, attacksPerSec, critChance,
##         critDamage, castSpeed, moveSpeed, lifeRegen, lightRadius, xpGain,
##         fortune: {rarity, quantity, gold, seek: {kind: n}}, unmet: Array[slot]}

const RES_CAP := 75


static func _add(raw: Dictionary, m: Dictionary, scale := 1) -> void:
	raw[m.stat] = raw.get(m.stat, 0) + m.value * scale
	if m.get("value2", null) != null:
		var k: String = m.stat + ".max"
		raw[k] = raw.get(k, 0) + m.value2 * scale


static func meets_reqs(item: Dictionary, hero: Dictionary, attrs: Dictionary) -> bool:
	var v := ItemText.view_item(item)
	return hero.level >= v.reqLevel and attrs.might >= v.reqMight and attrs.finesse >= v.reqFinesse and attrs.spirit >= v.reqSpirit


## Non-item stat sources: disciplines, passives, skill-tree stat nodes.
static func _add_build_sources(hero: Dictionary, raw: Dictionary, item_raw: Dictionary) -> void:
	for d in Disciplines.disciplines():
		var r := SkillRules.rank_of(hero, d.id)
		if r > 0 and d.id in hero.disciplines:
			for m in d.perRank:
				_add(raw, m, r)
	for skill in Disciplines.skills():
		if not skill.discipline in hero.disciplines:
			continue
		if skill.kind == "passive" and not skill.passivePerLevel.is_empty() and SkillRules.rank_of(hero, skill.discipline) >= skill.unlockRank:
			var lvl := SkillRules.effective_level(hero, skill, item_raw)
			for m in skill.passivePerLevel:
				_add(raw, m, lvl)
		var st: Dictionary = hero.skills.get(skill.id, {})
		if not st.get("specialized", false):
			continue
		for node in skill.tree:
			var r := SkillRules.node_rank(hero, skill.id, node.id)
			if r == 0:
				continue
			for e in node.effects:
				if String(e.key).begins_with("stat:"):
					_add(raw, {"stat": String(e.key).substr(5), "value": e.perRank}, r)


static func _sum_items(items: Array) -> Dictionary:
	var raw := {}
	for it in items:
		for m in ItemText.view_item(it).heroMods:
			_add(raw, m)
	return raw


static func _attrs_of(hero: Dictionary, raw: Dictionary) -> Dictionary:
	var out := {}
	for a in HeroData.ATTRS:
		out[a] = floori(hero.attrs[a] + raw.get(a, 0) + raw.get("allAttr", 0))
	return out


static func compute_sheet(hero: Dictionary) -> Dictionary:
	var curios: Array = []
	for it in hero.inventory:
		if ItemBases.get_base(it.baseId).category == "curio":
			curios.append(it)
	var equipped: Dictionary = hero.equipped

	# Pass 1: assume everything is usable, to get attribute totals for requirement checks.
	var first_items := _sum_items(equipped.values() + curios)
	var first := first_items.duplicate()
	_add_build_sources(hero, first, first_items)
	var attrs1 := _attrs_of(hero, first)

	# Pass 2: drop gear whose requirements fail.
	var unmet: Array = []
	var usable: Array = []
	for slot in equipped:
		if meets_reqs(equipped[slot], hero, attrs1):
			usable.append(equipped[slot])
		else:
			unmet.append(slot)
	for c in curios:
		if meets_reqs(c, hero, attrs1):
			usable.append(c)
	var item_raw := _sum_items(usable)
	var raw := item_raw.duplicate()
	_add_build_sources(hero, raw, item_raw)
	var attrs := _attrs_of(hero, raw)
	var g := func(k: String) -> float: return float(raw.get(k, 0))

	# Life / mana
	var life := floori((40 + hero.level * 4 + attrs.vigor * 3 + g.call("life")) * (1 + g.call("lifePct") / 100.0))
	var mana := floori((20 + hero.level * 2 + attrs.spirit * 2 + g.call("mana")) * (1 + g.call("manaPct") / 100.0))

	# Armor: worn defense + flat, scaled by %armor; Finesse adds a little.
	var worn := 0
	var block := 0.0
	for slot in equipped:
		if slot in unmet:
			continue
		var v := ItemText.view_item(equipped[slot])
		if v.armor > 0:
			worn += v.armor
		if slot == "offhand" and v.block > 0:
			block += v.block
	var armor := floori((worn + g.call("armor") + attrs.finesse / 4.0) * (1 + g.call("armorPct") / 100.0))
	block = minf(75.0, block + g.call("block"))

	var res := {}
	for t in Stats.DAMAGE_TYPES:
		if t != "phys":
			res[t] = floori(g.call("res:" + t) + g.call("resAll"))

	# Weapon damage
	var weapon := {}
	if equipped.has("weapon") and not "weapon" in unmet:
		weapon = ItemText.view_item(equipped.weapon)
	var base_dmg: Array = weapon.damage if not weapon.is_empty() and not weapon.damage.is_empty() else [1, 3]
	var phys_pct: float = attrs.might + g.call("dmgPct:phys") + g.call("dmgPctAll")
	var damage := [
		floori((base_dmg[0] + g.call("addDmg:phys")) * (1 + phys_pct / 100.0)),
		floori((base_dmg[1] + g.call("addDmg:phys.max")) * (1 + phys_pct / 100.0)),
	]
	var adds := {}
	for t in Stats.DAMAGE_TYPES:
		if t == "phys":
			continue
		var mn: float = g.call("addDmg:" + t)
		var mx: float = g.call("addDmg:" + t + ".max")
		if mn != 0 or mx != 0:
			var pct: float = 1 + (g.call("dmgPct:" + t) + g.call("dmgPctAll")) / 100.0
			adds[t] = [floori(mn * pct), floori(mx * pct)]
	var speed: float = weapon.speed if not weapon.is_empty() and weapon.speed > 0 else 1.2
	var attacks_per_sec: float = speed * (1 + (g.call("attackSpeed") + attrs.finesse / 5.0) / 100.0)

	var seek := {}
	for k in Stats.SEEK_KINDS:
		seek[k] = g.call("seek:" + k)
	return {
		"raw": raw,
		"attrs": attrs,
		"life": life,
		"mana": mana,
		"armor": armor,
		"block": block,
		"res": res,
		"damage": damage,
		"adds": adds,
		"attacksPerSec": attacks_per_sec,
		"critChance": 5 + g.call("critChance") + attrs.finesse * 0.2,
		"critDamage": 50 + g.call("critDamage"),
		"castSpeed": g.call("castSpeed"),
		"moveSpeed": g.call("moveSpeed"),
		"lifeRegen": g.call("lifeRegen"),
		"lightRadius": 6 + g.call("lightRadius"),
		"xpGain": g.call("xpGain"),
		"fortune": {"rarity": g.call("findRarity"), "quantity": g.call("findQuantity"), "gold": g.call("findGold"), "seek": seek},
		"unmet": unmet,
	}


## Effective skill level for UI (with gear bonuses).
static func skill_level_for(hero: Dictionary, skill_id: String, sheet: Dictionary) -> int:
	var s := Disciplines.get_skill(skill_id)
	return SkillRules.effective_level(hero, s, sheet.raw) if not s.is_empty() else 0
