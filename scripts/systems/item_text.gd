class_name ItemText
## Everything DERIVED from an item instance: display name, colour, final
## damage/defense after local mods, requirements, the hero-facing stat list,
## prices. The tooltip renders exactly what view_item() returns.

const QUALITY_COLORS := {
	"crude": "#8d8d8d",
	"normal": "#ece6d6",
	"superior": "#ece6d6",
	"magic": "#7896ff",
	"rare": "#f3d34a",
	"unique": "#c9a46b",
	"rhuneword": "#c9a46b",
	"rhune": "#ff9b3d",
	"socketed": "#a3a3a3",
	"gold": "#f3d34a",
}

const QUALITY_LABELS := {
	"crude": "Crude",
	"normal": "Normal",
	"superior": "Superior",
	"magic": "Magic",
	"rare": "Rare",
	"unique": "Unique",
	"rhuneword": "Rhuneword",
}

const QUALITY_VALUE := {"crude": 0.5, "normal": 1.0, "superior": 1.4, "magic": 2.5, "rare": 5.0, "unique": 8.0, "rhuneword": 8.0}


## "weapon" | "armor" | "shield": which rhune effect list applies.
static func rhune_host_for(base: Dictionary) -> String:
	if base.category == "weapon":
		return "weapon"
	if "shield" in base.tags:
		return "shield"
	return "armor"


static func item_color(item: Dictionary) -> String:
	var base := ItemBases.get_base(item.baseId)
	if base.category == "rhune":
		return QUALITY_COLORS.rhune
	if (item.quality == "normal" or item.quality == "superior") and item.sockets > 0:
		return QUALITY_COLORS.socketed
	return QUALITY_COLORS.get(item.quality, QUALITY_COLORS.normal)


## Icon name (assets/art/icons/<name>.png).
static func item_art(item: Dictionary) -> String:
	var base := ItemBases.get_base(item.baseId)
	return base.art[int(item.seed) % base.art.size()]


## Display name. Unidentified items show only their base.
static func item_name(item: Dictionary) -> String:
	var base := ItemBases.get_base(item.baseId)
	var qty := int(item.get("qty", 0))
	if qty > 1:
		return "%s (%d)" % [base.name, qty]
	if not item.identified:
		return base.name
	match item.quality:
		"unique":
			var u := Uniques.get_unique(item.get("uniqueId", ""))
			return u.name if not u.is_empty() else base.name
		"rhuneword":
			var rw := Rhunes.get_rhuneword(item.get("rhunewordId", ""))
			return rw.name if not rw.is_empty() else base.name
		"rare":
			var rn: Array = item.get("rareName", [0, 0])
			var second := ItemGen.rare_second_pool(base)
			return "%s %s" % [RareNames.FIRST[int(rn[0]) % RareNames.FIRST.size()], second[int(rn[1]) % second.size()]]
		"magic":
			var pre := ""
			var suf := ""
			for ra in item.affixes:
				var def := Affixes.get_affix(ra.affixId)
				if def.is_empty():
					continue
				if def.kind == "prefix":
					pre = def.tiers[ra.tier].name
				else:
					suf = def.tiers[ra.tier].name
			var parts: Array = []
			for p in [pre, base.name, suf]:
				if p != "":
					parts.append(p)
			return " ".join(parts)
		"superior":
			return "Superior " + base.name
		"crude":
			return "Crude " + base.name
	return base.name


## Rares, uniques and rhunewords show their base on a second line ("" = none).
static func item_sub_name(item: Dictionary) -> String:
	if not item.identified:
		return ""
	if item.quality in ["rare", "unique", "rhuneword"]:
		return ItemBases.get_base(item.baseId).name
	return ""


static func _push(mods: Array, quirks: Array, stat: String, vals: Array) -> void:
	if stat.begins_with("quirk:"):
		quirks.append(stat.substr(6))
		return
	var m := {"stat": stat, "value": vals[0]}
	if vals.size() > 1:
		m.value2 = vals[1]
	mods.append(m)


## All stat mods on the item, local and global, with rhunes and rhuneword.
## -> {mods (merged), quirks: Array[String]}
static func all_mods(item: Dictionary) -> Dictionary:
	var base := ItemBases.get_base(item.baseId)
	var mods: Array = []
	for m in base.implicit:
		mods.append(m.duplicate())
	var quirks: Array = []
	for ra in item.affixes:
		var def := Affixes.get_affix(ra.affixId)
		if def.is_empty():
			continue
		var rolls: Array = def.tiers[ra.tier].rolls
		for i in rolls.size():
			var vals: Array = ra.values[i] if i < ra.values.size() else [rolls[i].min]
			_push(mods, quirks, rolls[i].stat, vals)
	if item.quality == "unique" and item.get("uniqueId", "") != "":
		var u := Uniques.get_unique(item.uniqueId)
		if not u.is_empty():
			var uv: Array = item.get("uniqueValues", [])
			for i in u.rolls.size():
				var vals: Array = uv[i] if i < uv.size() else [u.rolls[i].min]
				_push(mods, quirks, u.rolls[i].stat, vals)
	var host := rhune_host_for(base)
	for s in item.socketed:
		var rid := Rhunes.rhune_id_from_base(s.baseId)
		var r := Rhunes.get_rhune(rid) if rid != "" else {}
		if not r.is_empty():
			for m in r.effects[host]:
				mods.append(m.duplicate())
	if item.quality == "rhuneword" and item.get("rhunewordId", "") != "":
		var rw := Rhunes.get_rhuneword(item.rhunewordId)
		if not rw.is_empty():
			for m in rw.stats:
				mods.append(m.duplicate())
	return {"mods": Stats.merge_mods(mods), "quirks": quirks}


## Tooltip view. Keys: base, name, subName ("" none), color, damage ([] none |
## [min, max]), damageModified, armor (-1 none), armorModified, block, speed,
## reqLevel, reqMight, reqFinesse, reqSpirit, heroMods, localMods, quirks, flavor.
static func view_item(item: Dictionary) -> Dictionary:
	var base := ItemBases.get_base(item.baseId)
	var am := all_mods(item)
	var local: Array = []
	var hero: Array = []
	for m in am.mods:
		var d := Stats.get_stat_def(m.stat)
		if d.local:
			if m.stat != "sockets":
				local.append(m)
		else:
			hero.append(m)
	var sum := func(stat: String) -> float:
		var t := 0.0
		for m in local:
			if m.stat == stat:
				t += m.value
		return t

	var damage: Array = []
	var damage_modified := false
	if not base.damage.is_empty():
		var ed: float = sum.call("localDmgPct")
		var fmin: float = sum.call("localMinDmg")
		var fmax: float = sum.call("localMaxDmg")
		var mn := maxi(1, floori(base.damage[0] * (1 + ed / 100.0)) + int(fmin))
		var mx := maxi(mn + 1, floori(base.damage[1] * (1 + ed / 100.0)) + int(fmax))
		damage = [mn, mx]
		damage_modified = ed != 0 or fmin != 0 or fmax != 0
	var armor := -1
	var armor_modified := false
	if not base.armor.is_empty():
		var ed: float = sum.call("localArmorPct")
		var flat: float = sum.call("localArmor")
		var roll: int = item.baseRoll[0] if not item.baseRoll.is_empty() else base.armor[0]
		armor = maxi(1, floori(roll * (1 + ed / 100.0)) + int(flat))
		armor_modified = ed != 0 or flat != 0

	var req_level: int = base.reqLevel
	if item.quality == "magic" or item.quality == "rare":
		for ra in item.affixes:
			var def := Affixes.get_affix(ra.affixId)
			if not def.is_empty():
				req_level = maxi(req_level, floori(def.tiers[ra.tier].alvl * 0.8))
	var uid_: String = item.get("uniqueId", "")
	if item.quality == "unique" and uid_ != "":
		var u := Uniques.get_unique(uid_)
		req_level = maxi(req_level, u.get("reqLevel", 1))
	for s in item.socketed:
		req_level = maxi(req_level, ItemBases.get_base(s.baseId).reqLevel)

	var flavor: String = base.flavor
	if item.quality == "unique" and uid_ != "":
		flavor = Uniques.get_unique(uid_).get("flavor", "")
	if item.quality == "rhuneword" and item.get("rhunewordId", "") != "":
		flavor = Rhunes.get_rhuneword(item.rhunewordId).get("flavor", "")

	return {
		"base": base,
		"name": item_name(item),
		"subName": item_sub_name(item),
		"color": item_color(item),
		"damage": damage,
		"damageModified": damage_modified,
		"armor": armor,
		"armorModified": armor_modified,
		"block": base.block,
		"speed": base.speed,
		"reqLevel": req_level,
		"reqMight": base.reqMight,
		"reqFinesse": base.reqFinesse,
		"reqSpirit": base.reqSpirit,
		"heroMods": Stats.sort_mods(hero),
		"localMods": Stats.sort_mods(local),
		"quirks": am.quirks,
		"flavor": flavor,
	}


static func quirk_text(id: String) -> String:
	return Uniques.QUIRKS.get(id, id)


## What a vendor charges for it.
static func buy_price(item: Dictionary) -> int:
	var base := ItemBases.get_base(item.baseId)
	if base.category == "consumable":
		return base.price * int(item.get("qty", 1))
	if base.category == "rhune":
		return base.price * 4
	var v: float = base.price * QUALITY_VALUE.get(item.quality, 1.0) * (1 + item.ilvl / 25.0) \
		* (1 + item.affixes.size() * 0.25) * (1 + item.sockets * 0.15)
	return maxi(1, Rng.jround(v))


## What a vendor pays you. Unidentified loot sells cheap: let Varn look first.
static func sell_price(item: Dictionary) -> int:
	var base := ItemBases.get_base(item.baseId)
	if base.category == "quest":
		return 0
	@warning_ignore("integer_division")
	var p := floorf(buy_price(item) / 5) * (1.0 if item.identified else 0.4)
	return maxi(1, floori(p))
