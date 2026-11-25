class_name CharacterSheet
## Character sheet: sums every source of stats into one view. Gear is the
## whole build; levels only add attribute points.
##
## Sources: base attributes, equipped items (only if requirements are met:
## unmet gear shows red and does nothing, like D2), and the charms slotted in
## the equipped belt.
##
## Attributes: Strength (might) +1% physical damage with melee weapons;
## Dexterity (finesse) +1% attack speed per 5 and +0.2% crit per point, and
## +1% physical damage with bows; Stamina (vigor) +3 life; Intelligence
## (spirit) +1% elemental damage, and +1% physical damage with caster weapons.
##
## Sheet: {raw: {stat: n, "<stat>.max": n}, attrs: {might, finesse, vigor, spirit},
##         life, armor, block, res: {fire, cold, lightning, poison, void},
##         damage: [min, max], adds: {type: [min, max]}, attack: {kind, tags,
##         range, tagPct}, attacksPerSec, critChance, critDamage, moveSpeed,
##         lifeRegen, lightRadius, xpGain, flask: {tier, heal, cooldown},
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
	var equipped: Dictionary = hero.equipped
	# Charms only count while slotted in the equipped belt.
	var curios: Array = equipped.get("waist", {}).get("charms", [])

	# Pass 1: assume everything is usable, to get attribute totals for requirement checks.
	var first := _sum_items(equipped.values() + curios)
	var attrs1 := _attrs_of(hero, first)

	# Pass 2: drop gear whose requirements fail.
	var unmet: Array = []
	var usable: Array = []
	for slot in equipped:
		if meets_reqs(equipped[slot], hero, attrs1):
			usable.append(equipped[slot])
		else:
			unmet.append(slot)
	if not "waist" in unmet:
		for c in curios:
			if meets_reqs(c, hero, attrs1):
				usable.append(c)
	var raw := _sum_items(usable)
	# The expedition in progress: boons, their synergies, Threat's loot bonus,
	# and the afflictions that weigh on the hero.
	var exp_stats := Expedition.hero_stats(hero)
	for k in exp_stats:
		raw[k] = float(raw.get(k, 0)) + float(exp_stats[k])
	var attrs := _attrs_of(hero, raw)
	var g := func(k: String) -> float: return float(raw.get(k, 0))

	var life := floori((40 + hero.level * 4 + attrs.vigor * 3 + g.call("life")) * (1 + g.call("lifePct") / 100.0))

	# Armor: worn defense + flat, scaled by %armor; Dexterity adds a little.
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
	var attack := attack_of(equipped.get("weapon", {}) if not weapon.is_empty() else {})
	# The attribute that drives physical damage depends on the weapon.
	var main_attr: int = attrs.might if attack.kind == "melee" else (attrs.finesse if attack.kind == "ranged" else attrs.spirit)
	var phys_pct: float = main_attr + g.call("dmgPct:phys") + g.call("dmgPctAll")
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
			var pct: float = 1 + (g.call("dmgPct:" + t) + g.call("dmgPctAll") + attrs.spirit) / 100.0
			adds[t] = [floori(mn * pct), floori(mx * pct)]
	var speed: float = weapon.speed if not weapon.is_empty() and weapon.speed > 0 else 1.2
	var attacks_per_sec: float = speed * (1 + (g.call("attackSpeed") + attrs.finesse / 5.0) / 100.0)

	var tag_pct := 0.0
	for t in attack.tags:
		tag_pct += g.call("tagPct:" + t)
	attack.tagPct = tag_pct

	var seek := {}
	for k in Stats.SEEK_KINDS:
		seek[k] = g.call("seek:" + k)
	return {
		"raw": raw,
		"attrs": attrs,
		"life": life,
		"attack": attack,
		"flask": flask_of(hero, g.call("flaskPotency") + (25.0 if g.call("quirk:glutton") > 0 else 0.0), g.call("flaskRecovery")),
		"armor": armor,
		"block": block,
		"res": res,
		"damage": damage,
		"adds": adds,
		"attacksPerSec": attacks_per_sec,
		"critChance": 5 + g.call("critChance") + attrs.finesse * 0.2,
		"critDamage": 50 + g.call("critDamage"),
		"moveSpeed": g.call("moveSpeed"),
		"lifeRegen": g.call("lifeRegen"),
		"lightRadius": 6 + g.call("lightRadius"),
		"xpGain": g.call("xpGain"),
		"fortune": {"rarity": g.call("findRarity"), "quantity": g.call("findQuantity"), "gold": g.call("findGold"), "seek": seek},
		"unmet": unmet,
	}


## How the equipped weapon attacks: melee swing, bow shot, or caster bolt.
## {kind: "melee"|"ranged"|"spell", tags: Array, range: world px}
static func attack_of(weapon: Dictionary) -> Dictionary:
	var tags: Array = ItemBases.get_base(weapon.baseId).tags if not weapon.is_empty() else []
	if "ranged" in tags:
		return {"kind": "ranged", "tags": ["ranged", "projectile"], "range": 260.0}
	if "caster" in tags and not "melee" in tags:
		return {"kind": "spell", "tags": ["spell", "projectile"], "range": 230.0}
	var reach := 46.0 if "2h" in tags else 38.0
	return {"kind": "melee", "tags": ["melee"], "range": reach}


## The rejuvenation flask: free from Mother Ysolde, bigger as you go deeper.
## Small heals 250, Medium 500 (finish a Tier 4 expedition), Large 1000 (Tier 11).
const FLASK_TIERS := [
	{"name": "Small Rejuvenation Flask", "heal": 250, "tier": 0},
	{"name": "Medium Rejuvenation Flask", "heal": 500, "tier": 4},
	{"name": "Large Rejuvenation Flask", "heal": 1000, "tier": 11},
]
const FLASK_COOLDOWN := 10.0


static func flask_tier(hero: Dictionary) -> int:
	var best := int(hero.get("bestTier", 0))
	var tier := 0
	for i in FLASK_TIERS.size():
		if best >= int(FLASK_TIERS[i].tier):
			tier = i
	return tier


static func flask_of(hero: Dictionary, potency: float, recovery: float) -> Dictionary:
	var tier := flask_tier(hero)
	return {
		"tier": tier,
		"name": FLASK_TIERS[tier].name,
		"heal": floori(FLASK_TIERS[tier].heal * (1 + potency / 100.0)),
		"cooldown": FLASK_COOLDOWN / (1 + recovery / 100.0),
	}
