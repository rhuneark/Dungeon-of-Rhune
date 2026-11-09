class_name Affixes
## Prefix / suffix pool. Magic items roll up to 1 prefix + 1 suffix; rares
## roll 3-6 affixes (max 3 of each kind). A tier rolls only when the item
## level >= its alvl — so the SAME base gets better affixes deeper in the Pit.
##
## Affix: {id, kind: "prefix"|"suffix", group, tags, excludeTags, weight, tiers}
## Tier:  {name, alvl, rolls: Array[{stat, min, max, (min2, max2)}]}
## Two affixes of the same group never roll together. Order matters (it is the
## candidate order the item generator walks).

static var _all: Array = []
static var _by_id: Dictionary = {}


static func r(stat: String, mn: int, mx: int, mn2 = null, mx2 = null) -> Dictionary:
	var d := {"stat": stat, "min": mn, "max": mx}
	if mn2 != null and mx2 != null:
		d.min2 = mn2
		d.max2 = mx2
	return d


static func t(name: String, alvl: int, rolls: Array) -> Dictionary:
	return {"name": name, "alvl": alvl, "rolls": rolls}


static func _a(id: String, kind: String, group: String, tags: Array, weight: int, tiers: Array, exclude: Array = []) -> Dictionary:
	return {"id": id, "kind": kind, "group": group, "tags": tags, "excludeTags": exclude, "weight": weight, "tiers": tiers}


static func all() -> Array:
	if not _all.is_empty():
		return _all
	var ARMOR := ["armor", "shield"]
	var DEFENSIVE := ["armor", "shield", "jewelry", "curio"]
	var a: Array = []
	# ================================================================ PREFIXES
	a.append(_a("ed_weapon", "prefix", "ed", ["weapon"], 30, [
		t("Jagged", 1, [r("localDmgPct", 10, 20)]),
		t("Deadly", 5, [r("localDmgPct", 21, 30)]),
		t("Vicious", 10, [r("localDmgPct", 31, 40)]),
		t("Brutal", 16, [r("localDmgPct", 41, 55)]),
		t("Ruinous", 22, [r("localDmgPct", 56, 70)]),
		t("Savage", 28, [r("localDmgPct", 71, 90)]),
	]))
	a.append(_a("ed_armor", "prefix", "ed", ARMOR, 30, [
		t("Sturdy", 1, [r("localArmorPct", 10, 20)]),
		t("Stout", 6, [r("localArmorPct", 21, 30)]),
		t("Glorious", 12, [r("localArmorPct", 31, 40)]),
		t("Hallowed", 18, [r("localArmorPct", 41, 55)]),
		t("Saintly", 26, [r("localArmorPct", 56, 70)]),
	]))
	a.append(_a("flat_armor", "prefix", "flatdef", ARMOR, 20, [
		t("Hardened", 1, [r("localArmor", 3, 8)]),
		t("Reinforced", 8, [r("localArmor", 9, 15)]),
		t("Bulwarked", 16, [r("localArmor", 16, 30)]),
	]))
	a.append(_a("mana", "prefix", "mana", ["helm", "chest", "jewelry", "caster", "curio"], 20, [
		t("Glinting", 1, [r("mana", 5, 10)]),
		t("Lucent", 6, [r("mana", 11, 20)]),
		t("Radiant", 12, [r("mana", 21, 30)]),
		t("Brilliant", 20, [r("mana", 31, 45)]),
	]))
	for e in [
		["fire", ["Charred", "Kilnfired", "Emberwoven"]],
		["cold", ["Frosted", "Rimebound", "Wintersworn"]],
		["lightning", ["Grounded", "Stormsealed", "Thunderproof"]],
		["poison", ["Mossy", "Antivenom", "Viperskin"]],
		["void", ["Shaded", "Umbral", "Starless"]],
	]:
		var ty: String = e[0]
		var n: Array = e[1]
		a.append(_a("res_" + ty, "prefix", "res_" + ty, DEFENSIVE, 14, [
			t(n[0], 1, [r("res:" + ty, 5, 10)]), t(n[1], 10, [r("res:" + ty, 11, 20)]), t(n[2], 20, [r("res:" + ty, 21, 30)]),
		]))
	a.append(_a("res_all", "prefix", "res_all", ["shield", "amulet", "ring", "curio"], 8, [
		t("Shimmering", 5, [r("resAll", 3, 8)]), t("Warded", 14, [r("resAll", 9, 15)]), t("Prismatic", 24, [r("resAll", 16, 22)]),
	]))
	for e in [
		["phys", ["Keen", "Honed", "Whetted"]],
		["fire", ["Searing", "Scorching", "Infernal"]],
		["cold", ["Biting", "Frigid", "Hoarfrost"]],
		["lightning", ["Crackling", "Sparking", "Thundering"]],
		["poison", ["Noxious", "Venomous", "Pestilent"]],
		["void", ["Hollow", "Abyssal", "Eclipsed"]],
	]:
		var ty: String = e[0]
		var n: Array = e[1]
		a.append(_a("dmgpct_" + ty, "prefix", "dmgpct_" + ty, ["caster", "jewelry", "tome", "gloves"], 10, [
			t(n[0], 3, [r("dmgPct:" + ty, 5, 10)]), t(n[1], 10, [r("dmgPct:" + ty, 11, 20)]), t(n[2], 20, [r("dmgPct:" + ty, 21, 30)]),
		]))
	for e in [
		["projectile", "Piercing", "Impaling"],
		["area", "Sweeping", "Cataclysmic"],
		["spell", "Arcane", "Eldritch"],
		["melee", "Martial", "Warlord's"],
		["minion", "Commanding", "Sovereign"],
		["dot", "Festering", "Lingering"],
	]:
		var tag: String = e[0]
		a.append(_a("tag_" + tag, "prefix", "tag_" + tag, ["weapon", "jewelry", "offhand", "gloves"], 8, [
			t(e[1], 4, [r("tagPct:" + tag, 8, 15)]), t(e[2], 16, [r("tagPct:" + tag, 16, 30)]),
		]))
	# +Discipline skills — the D2 "class amulet" homage. Rare, chase-worthy.
	for d in Disciplines.DISCIPLINE_IDS:
		var names: Array = Disciplines.DISCIPLINE_AFFIX_NAMES[d]
		a.append(_a("skilldisc_" + d, "prefix", "skilldisc", ["amulet", "caster", "helm", "curio_large"], 3, [
			t(names[0], 10, [r("skillDisc:" + d, 1, 1)]), t(names[1], 26, [r("skillDisc:" + d, 2, 2)]),
		]))
	a.append(_a("gold", "prefix", "gold", ["armor", "jewelry", "curio"], 10, [
		t("Gilded", 1, [r("findGold", 15, 40)]), t("Avaricious", 10, [r("findGold", 41, 80)]),
	]))
	# Targeted Find — hunt the KIND of loot you want.
	for e in [
		["weapon", "Quartermaster's"],
		["armor", "Outfitter's"],
		["jewelry", "Jeweler's"],
		["curio", "Collector's"],
		["rhune", "Scribe's"],
		["unique", "Grailseeker's"],
	]:
		var kind: String = e[0]
		var nm: String = e[1]
		a.append(_a("seek_" + kind, "prefix", "seek", ["helm", "gloves", "boots", "belt", "jewelry", "curio"], 3 if kind == "unique" else 6, [
			t(nm, 4, [r("seek:" + kind, 10, 20)]), t(nm, 14, [r("seek:" + kind, 21, 35)]), t(nm, 24, [r("seek:" + kind, 36, 50)]),
		]))
	a.append(_a("sockets", "prefix", "sockets", ["weapon", "shield", "helm", "chest"], 6, [
		t("Hollowed", 1, [r("sockets", 1, 1)]), t("Carved", 10, [r("sockets", 2, 2)]), t("Graven", 20, [r("sockets", 3, 3)]),
	], ["caster"]))

	# ================================================================ SUFFIXES
	a.append(_a("life", "suffix", "life", ["armor", "shield", "jewelry"], 30, [
		t("of the Hare", 1, [r("life", 5, 10)]),
		t("of the Stag", 6, [r("life", 11, 20)]),
		t("of the Boar", 12, [r("life", 21, 30)]),
		t("of the Bear", 20, [r("life", 31, 40)]),
		t("of the Wyrm", 28, [r("life", 41, 55)]),
	]))
	for e in [
		["might", ["of the Ox", "of the Bull", "of the Titan"]],
		["finesse", ["of the Fox", "of the Lynx", "of the Viper"]],
		["vigor", ["of the Oak", "of the Mountain", "of the Ages"]],
		["spirit", ["of the Owl", "of the Sage", "of the Oracle"]],
	]:
		var st: String = e[0]
		var n: Array = e[1]
		a.append(_a("attr_" + st, "suffix", "attr_" + st, ["armor", "shield", "jewelry", "weapon"], 14, [
			t(n[0], 1, [r(st, 1, 4)]), t(n[1], 10, [r(st, 5, 9)]), t(n[2], 22, [r(st, 10, 15)]),
		]))
	a.append(_a("attack_speed", "suffix", "ias", ["weapon", "gloves", "jewelry"], 12, [
		t("of Readiness", 3, [r("attackSpeed", 8, 12)]), t("of Alacrity", 12, [r("attackSpeed", 13, 20)]), t("of Flurries", 24, [r("attackSpeed", 21, 30)]),
	], ["caster"]))
	a.append(_a("cast_speed", "suffix", "fcr", ["caster", "jewelry", "chest", "tome"], 12, [
		t("of Murmurs", 3, [r("castSpeed", 8, 12)]), t("of Incantation", 12, [r("castSpeed", 13, 20)]), t("of the Choir", 24, [r("castSpeed", 21, 30)]),
	]))
	a.append(_a("move_speed", "suffix", "frw", ["boots"], 25, [
		t("of Wandering", 2, [r("moveSpeed", 10, 10)]), t("of the Wind", 12, [r("moveSpeed", 20, 20)]), t("of the Gale", 22, [r("moveSpeed", 30, 30)]),
	]))
	a.append(_a("max_dmg", "suffix", "maxdmg", ["weapon"], 20, [
		t("of Wounding", 1, [r("localMaxDmg", 1, 3)]), t("of Ruin", 10, [r("localMaxDmg", 4, 8)]), t("of Carnage", 20, [r("localMaxDmg", 9, 15)]),
	]))
	a.append(_a("min_dmg", "suffix", "mindmg", ["weapon"], 14, [
		t("of the Fang", 1, [r("localMinDmg", 1, 2)]), t("of the Tusk", 10, [r("localMinDmg", 3, 5)]), t("of the Maw", 20, [r("localMinDmg", 6, 9)]),
	]))
	for e in [
		["fire", ["of Embers", "of Flame", "of Immolation"], [[1, 2, 3, 5], [3, 5, 7, 10], [6, 10, 14, 22]]],
		["cold", ["of Frost", "of Ice", "of the Glacier"], [[1, 2, 2, 4], [3, 4, 6, 9], [5, 8, 12, 18]]],
		["lightning", ["of Sparks", "of Thunder", "of the Storm"], [[1, 1, 4, 8], [1, 3, 10, 18], [2, 5, 22, 35]]],
		["poison", ["of Venom", "of the Asp", "of Pestilence"], [[2, 3, 4, 6], [4, 6, 8, 12], [8, 12, 16, 24]]],
		["void", ["of Shadows", "of the Hollow", "of the Abyss"], [[1, 2, 3, 5], [2, 4, 5, 8], [5, 8, 12, 18]]],
	]:
		var ty: String = e[0]
		var n: Array = e[1]
		var v: Array = e[2]
		var tiers: Array = []
		var alvls := [1, 10, 22]
		for i in 3:
			tiers.append(t(n[i], alvls[i], [r("addDmg:" + ty, v[i][0], v[i][1], v[i][2], v[i][3])]))
		a.append(_a("add_" + ty, "suffix", "add_" + ty, ["weapon", "gloves", "ring", "curio"], 10, tiers, ["caster"]))
	a.append(_a("crit_chance", "suffix", "crit", ["weapon", "ring", "amulet", "gloves"], 10, [
		t("of Precision", 5, [r("critChance", 3, 5)]), t("of Lethality", 18, [r("critChance", 6, 10)]),
	]))
	a.append(_a("crit_damage", "suffix", "critdmg", ["weapon", "amulet"], 8, [
		t("of Ferocity", 8, [r("critDamage", 10, 20)]), t("of Slaughter", 20, [r("critDamage", 21, 35)]),
	]))
	a.append(_a("life_leech", "suffix", "leech", ["weapon", "gloves", "ring", "amulet"], 8, [
		t("of the Leech", 5, [r("lifeLeech", 2, 4)]), t("of the Lamprey", 15, [r("lifeLeech", 5, 7)]),
	], ["caster"]))
	a.append(_a("mana_leech", "suffix", "mleech", ["weapon", "gloves", "ring", "amulet"], 6, [
		t("of the Moth", 5, [r("manaLeech", 2, 4)]), t("of the Wisp", 15, [r("manaLeech", 5, 7)]),
	]))
	a.append(_a("life_on_kill", "suffix", "lok", ["weapon", "gloves", "ring"], 8, [
		t("of the Vulture", 3, [r("lifeOnKill", 2, 4)]), t("of the Carrion", 14, [r("lifeOnKill", 5, 9)]),
	]))
	a.append(_a("life_regen", "suffix", "regen", ["jewelry", "chest", "belt", "helm"], 10, [
		t("of Mending", 1, [r("lifeRegen", 1, 2)]), t("of Renewal", 12, [r("lifeRegen", 3, 5)]),
	]))
	a.append(_a("mana_regen", "suffix", "mregen", ["jewelry", "caster", "helm", "tome"], 10, [
		t("of the Spring", 3, [r("manaRegen", 10, 20)]), t("of the Wellspring", 14, [r("manaRegen", 21, 40)]),
	]))
	a.append(_a("thorns", "suffix", "thorns", ["chest", "shield"], 8, [
		t("of Brambles", 1, [r("thorns", 2, 5)]), t("of Thorns", 10, [r("thorns", 6, 12)]), t("of Spite", 20, [r("thorns", 13, 25)]),
	]))
	a.append(_a("dmg_reduce", "suffix", "dr", ["chest", "shield", "helm", "belt"], 8, [
		t("of Warding", 5, [r("dmgReduce", 1, 2)]), t("of Iron Skin", 15, [r("dmgReduce", 3, 5)]),
	]))
	a.append(_a("block", "suffix", "block", ["shield"], 12, [
		t("of Deflection", 3, [r("block", 5, 10)]), t("of the Bastion", 15, [r("block", 11, 20)]),
	]))
	a.append(_a("light", "suffix", "light", ["helm", "ring", "amulet", "weapon"], 8, [
		t("of the Candle", 1, [r("lightRadius", 1, 1)]), t("of the Lantern", 6, [r("lightRadius", 2, 2)]), t("of the Sun", 15, [r("lightRadius", 3, 3)]),
	]))
	a.append(_a("rarity_find", "suffix", "mf", ["armor", "jewelry"], 12, [
		t("of Luck", 1, [r("findRarity", 5, 10)]), t("of Fortune", 10, [r("findRarity", 11, 20)]), t("of Providence", 20, [r("findRarity", 21, 30)]),
	]))
	a.append(_a("quantity_find", "suffix", "quantity", ["jewelry", "gloves"], 5, [
		t("of Plenty", 10, [r("findQuantity", 5, 10)]), t("of Abundance", 22, [r("findQuantity", 11, 20)]),
	]))
	a.append(_a("xp_gain", "suffix", "xp", ["amulet", "helm"], 4, [
		t("of the Scholar", 8, [r("xpGain", 2, 4)]), t("of the Archivist", 20, [r("xpGain", 5, 8)]),
	]))

	# ======================= pseudo-affixes (never roll normally: weight 0, no tags)
	# Quality tiers below magic express their bonus/penalty as an affix line.
	a.append(_a("superior_w", "prefix", "quality", [], 0, [t("Superior", 1, [r("localDmgPct", 5, 15)])]))
	a.append(_a("superior_a", "prefix", "quality", [], 0, [t("Superior", 1, [r("localArmorPct", 5, 15)])]))
	a.append(_a("crude_w", "prefix", "quality", [], 0, [t("Crude", 1, [r("localDmgPct", -25, -15)])]))
	a.append(_a("crude_a", "prefix", "quality", [], 0, [t("Crude", 1, [r("localArmorPct", -25, -15)])]))

	# ============================================ CURIO-ONLY affixes (backpack charms)
	a.append(_a("c_life", "suffix", "life", ["curio"], 30, [
		t("of Vitality", 1, [r("life", 3, 8)]), t("of Vigor", 10, [r("life", 9, 15)]), t("of Hardiness", 20, [r("life", 16, 25)]),
	]))
	a.append(_a("c_mf", "suffix", "mf", ["curio"], 15, [
		t("of Good Luck", 1, [r("findRarity", 2, 5)]), t("of Charmed Luck", 12, [r("findRarity", 6, 9)]),
	]))
	a.append(_a("c_add", "prefix", "c_add", ["curio_medium", "curio_large"], 12, [
		t("Bristling", 10, [r("addDmg:phys", 1, 2, 2, 4)]), t("Serrated", 20, [r("addDmg:phys", 2, 4, 5, 8)]),
	]))
	a.append(_a("c_res", "prefix", "c_res", ["curio"], 15, [
		t("Tinted", 1, [r("resAll", 2, 3)]), t("Iridescent", 14, [r("resAll", 4, 6)]),
	]))
	_all = a
	for af in _all:
		_by_id[af.id] = af
	return _all


static func get_affix(id: String) -> Dictionary:
	all()
	return _by_id.get(id, {})


## Curio bases only take affixes whose tags explicitly mention curio.
static func allowed_on(affix: Dictionary, base_tags: Array) -> bool:
	var is_curio := "curio" in base_tags
	if is_curio:
		var mentions := false
		for tg in affix.tags:
			if String(tg).begins_with("curio"):
				mentions = true
				break
		if not mentions:
			return false
	var any := false
	for tg in affix.tags:
		if tg in base_tags:
			any = true
			break
	if not any:
		return false
	for tg in affix.get("excludeTags", []):
		if tg in base_tags:
			return false
	return true
