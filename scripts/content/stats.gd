class_name Stats
## Stat registry — every number an item, rhune, skill or passive can grant.
##
## Stats are plain string ids so content stays data-driven:
##   "might", "res:fire", "addDmg:cold", "tagPct:projectile", "seek:rhune",
##   "skill:cinder_bolt", "skillDisc:emberwright", "quirk:honk" ...
##
## Design rule ("most things viable if they make sense"): damage scaling is by
## TAG and DAMAGE TYPE, never by a specific skill. Skill trees convert
## tags/types, so gear stays relevant across builds.
##
## A stat mod is a Dictionary {stat: String, value: number, value2?: number}
## (value2 is the max of an "X-Y" range).

const DAMAGE_TYPES: Array[String] = ["phys", "fire", "cold", "lightning", "poison", "void"]
const DAMAGE_TYPE_NAMES := {
	"phys": "Physical",
	"fire": "Fire",
	"cold": "Cold",
	"lightning": "Lightning",
	"poison": "Poison",
	"void": "Void",
}

## Skill/attack tags that "+% <Tag> Damage" stats scale.
const DAMAGE_TAGS: Array[String] = ["melee", "ranged", "spell", "projectile", "area", "minion", "dot"]
const DAMAGE_TAG_NAMES := {
	"melee": "Melee",
	"ranged": "Ranged",
	"spell": "Spell",
	"projectile": "Projectile",
	"area": "Area",
	"minion": "Minion",
	"dot": "Damage over Time",
}

## Targeted Find ("seek") categories. Rarity Find makes drops BETTER; seek makes
## drops of one KIND more likely (and seek:unique only boosts the unique roll).
const SEEK_KINDS: Array[String] = ["weapon", "armor", "jewelry", "curio", "rhune", "unique"]
const SEEK_NAMES := {
	"weapon": "Weapon",
	"armor": "Armor",
	"jewelry": "Jewelry",
	"curio": "Curio",
	"rhune": "Rhune",
	"unique": "Unique",
}

static var _defs: Dictionary = {}


static func _d(text: String, group: String, order: int, local := false) -> Dictionary:
	return {"text": text, "group": group, "order": order, "local": local}


## All static stat definitions: id -> {text, group, order, local}.
static func defs() -> Dictionary:
	if not _defs.is_empty():
		return _defs
	var d := {
		# skills (always first in tooltips, like D2)
		"skillAll": _d("+{0} to All Skills", "skill", 0),
		# attributes
		"might": _d("+{0} to Might", "attribute", 10),
		"finesse": _d("+{0} to Finesse", "attribute", 11),
		"vigor": _d("+{0} to Vigor", "attribute", 12),
		"spirit": _d("+{0} to Spirit", "attribute", 13),
		"allAttr": _d("+{0} to All Attributes", "attribute", 9),
		# local item modifiers
		"localDmgPct": _d("+{0}% Enhanced Damage", "offense", 20, true),
		"localMinDmg": _d("+{0} to Minimum Damage", "offense", 21, true),
		"localMaxDmg": _d("+{0} to Maximum Damage", "offense", 22, true),
		"localArmorPct": _d("+{0}% Enhanced Defense", "defense", 20, true),
		"localArmor": _d("+{0} Defense", "defense", 21, true),
		"sockets": _d("Socketed ({0})", "utility", 99, true),
		# offense
		"attackSpeed": _d("+{0}% Increased Attack Speed", "offense", 30),
		"castSpeed": _d("+{0}% Faster Cast Rate", "offense", 31),
		"critChance": _d("+{0}% Critical Strike Chance", "offense", 32),
		"critDamage": _d("+{0}% Critical Strike Damage", "offense", 33),
		"dmgPctAll": _d("+{0}% Damage", "offense", 34),
		"lifeLeech": _d("{0}% Life Stolen per Hit", "offense", 40),
		"manaLeech": _d("{0}% Mana Stolen per Hit", "offense", 41),
		"lifeOnKill": _d("+{0} Life after each Kill", "offense", 42),
		"manaOnKill": _d("+{0} Mana after each Kill", "offense", 43),
		"projectiles": _d("+{0} Projectiles", "offense", 44),
		"areaPct": _d("+{0}% Area of Effect", "offense", 45),
		# defense
		"life": _d("+{0} to Life", "defense", 50),
		"lifePct": _d("+{0}% Maximum Life", "defense", 51),
		"mana": _d("+{0} to Mana", "defense", 52),
		"manaPct": _d("+{0}% Maximum Mana", "defense", 53),
		"lifeRegen": _d("Replenish Life +{0}", "defense", 54),
		"manaRegen": _d("Regenerate Mana {0}%", "defense", 55),
		"armor": _d("+{0} Armor", "defense", 56),
		"armorPct": _d("+{0}% Armor", "defense", 57),
		"block": _d("{0}% Increased Chance of Blocking", "defense", 58),
		"resAll": _d("All Resistances +{0}", "defense", 60),
		"dmgReduce": _d("Damage Reduced by {0}", "defense", 66),
		"thorns": _d("Attacker Takes Damage of {0}", "defense", 67),
		# fortune (the loot stats)
		"findRarity": _d("+{0}% Rarity Find", "fortune", 80),
		"findQuantity": _d("+{0}% Item Quantity", "fortune", 81),
		"findGold": _d("+{0}% Extra Gold", "fortune", 82),
		# utility
		"moveSpeed": _d("+{0}% Faster Run/Walk", "utility", 90),
		"lightRadius": _d("+{0} to Light Radius", "utility", 91),
		"xpGain": _d("+{0}% Experience Gained", "utility", 92),
		"reqPct": _d("Requirements -{0}%", "utility", 98),
	}
	for t in DAMAGE_TYPES:
		var n: String = DAMAGE_TYPE_NAMES[t]
		d["dmgPct:" + t] = _d("+{0}% " + n + " Damage", "offense", 35)
		d["addDmg:" + t] = _d("Adds {0}-{1} " + n + " Damage", "offense", 25)
		if t != "phys":
			d["res:" + t] = _d(n + " Resistance +{0}%", "defense", 61)
		d["pen:" + t] = _d("-{0}% to Enemy " + n + " Resistance", "offense", 37)
	for tag in DAMAGE_TAGS:
		d["tagPct:" + tag] = _d("+{0}% " + DAMAGE_TAG_NAMES[tag] + " Damage", "offense", 36)
	for k in SEEK_KINDS:
		d["seek:" + k] = _d("+{0}% " + SEEK_NAMES[k] + " Find", "fortune", 83)
	_defs = d
	return _defs


## Stats whose second value is a range max ("Adds X-Y").
static func is_range_stat(stat: String) -> bool:
	return stat.begins_with("addDmg:")


## Definition for any stat id, including dynamic families (skill:, skillDisc:, quirk:).
static func get_stat_def(stat: String) -> Dictionary:
	var all := defs()
	if all.has(stat):
		return all[stat]
	if stat.begins_with("skill:"):
		var id := stat.substr(6)
		var sk := Disciplines.get_skill(id)
		return _d("+{0} to " + (sk.name if not sk.is_empty() else id), "skill", 2)
	if stat.begins_with("skillDisc:"):
		var id := stat.substr(10)
		var dd := Disciplines.get_discipline(id)
		return _d("+{0} to " + (dd.name if not dd.is_empty() else id) + " Skills", "skill", 1)
	if stat.begins_with("quirk:"):
		var id := stat.substr(6)
		return _d(Uniques.QUIRKS.get(id, id), "quirk", 200)
	return _d(stat + " {0}", "utility", 150)


static func _fmt(n: Variant) -> String:
	if typeof(n) == TYPE_FLOAT and n != floorf(n):
		return "%.1f" % n
	return str(int(n))


## "Adds 3-7 Fire Damage"
static func describe_mod(m: Dictionary) -> String:
	var d := get_stat_def(m.stat)
	var v2 = m.get("value2", null)
	return String(d.text).replace("{0}", _fmt(m.value)).replace("{1}", _fmt(v2 if v2 != null else m.value))


## Merge mods of the same stat (for tooltips that combine rhune + affix lines). Returns copies.
static func merge_mods(mods: Array) -> Array:
	var order: Array = []
	var map := {}
	for m in mods:
		if map.has(m.stat):
			var cur: Dictionary = map[m.stat]
			cur.value += m.value
			if m.get("value2", null) != null:
				cur.value2 = (cur.get("value2", 0) if cur.get("value2", null) != null else 0) + m.value2
		else:
			map[m.stat] = m.duplicate()
			order.append(m.stat)
	var out: Array = []
	for s in order:
		out.append(map[s])
	return out


## Stable sort by tooltip order.
static func sort_mods(mods: Array) -> Array:
	var indexed: Array = []
	for i in mods.size():
		indexed.append([get_stat_def(mods[i].stat).order, i, mods[i]])
	indexed.sort_custom(func(a, b): return a[0] < b[0] or (a[0] == b[0] and a[1] < b[1]))
	var out: Array = []
	for e in indexed:
		out.append(e[2])
	return out
