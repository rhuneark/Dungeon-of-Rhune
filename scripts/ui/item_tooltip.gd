class_name ItemTooltip
## D2-style item tooltip lines: centred, blue for magic properties, red for
## unmet requirements, gold for prices.

const BLUE := Color("#7896ff")
const RED := Color("#d9534f")
const SOFT := Color("#cfc6b0")


static func _join(mods: Array) -> String:
	var out := []
	for m in mods:
		out.append(Stats.describe_mod(m))
	return ", ".join(out)


## Returns [{text, color?, style?, gap?}] for UiTip.
static func lines(item: Dictionary, ctx := "none", price := -1, extra: Array = []) -> Array:
	var v := ItemText.view_item(item)
	var base: Dictionary = v.base
	var unid: bool = not item.get("identified", true)
	var out: Array = []
	var col := Color(v.color)
	out.append({"text": v.name, "color": col})
	if v.get("subName", "") != "":
		out.append({"text": v.subName, "color": col})
	if unid:
		out.append({"text": "Unidentified", "color": RED})

	var hero = Game.hero() if Game.has_hero() else null
	var sheet: Dictionary = Game.sheet() if hero != null else {}

	var dmg: Array = v.get("damage", [])
	if not dmg.is_empty():
		var hand := "Two-Hand" if base.twoHanded else "One-Hand"
		out.append({"text": "%s Damage: %d to %d" % [hand, dmg[0], dmg[1]], "color": BLUE if v.damageModified and not unid else UiKit.PARCH})
		if float(v.get("speed", 0)) > 0:
			out.append({"text": "Attacks per Second: %.2f" % float(v.speed), "color": SOFT})
	if int(v.get("armor", -1)) >= 0:
		var shown: int = int(item.baseRoll[0]) if unid and v.armorModified else int(v.armor)
		out.append({"text": "Defense: %d" % shown, "color": BLUE if v.armorModified and not unid else UiKit.PARCH})
	if int(v.get("block", 0)) > 0:
		out.append({"text": "Chance to Block: %d%%" % int(v.block)})
	if hero != null:
		var attrs: Dictionary = sheet.attrs
		for r in [["Level", "reqLevel", int(hero.level)], ["Might", "reqMight", int(attrs.might)], ["Finesse", "reqFinesse", int(attrs.finesse)], ["Spirit", "reqSpirit", int(attrs.spirit)]]:
			var need := int(v.get(r[1], 0))
			if need > 0:
				out.append({"text": "Required %s: %d" % [r[0], need], "color": RED if r[2] < need else UiKit.PARCH})
	if base.category != "consumable" and base.category != "quest":
		out.append({"text": "Item Level: %d" % int(item.ilvl), "color": Color("#7d7462"), "style": "s8"})

	if base.category == "rhune":
		var rh := Rhunes.get_rhune(Rhunes.rhune_id_from_base(item.baseId))
		if not rh.is_empty():
			out.append({"text": "Can be inserted into socketed items", "color": SOFT})
			out.append({"text": "Weapons: " + _join(rh.effects.weapon), "color": BLUE})
			out.append({"text": "Armor: " + _join(rh.effects.armor), "color": BLUE})
			out.append({"text": "Shields: " + _join(rh.effects.shield), "color": BLUE})
	elif not unid:
		for m in v.localMods:
			out.append({"text": Stats.describe_mod(m), "color": BLUE})
		for m in v.heroMods:
			out.append({"text": Stats.describe_mod(m), "color": BLUE})
		for q in v.quirks:
			out.append({"text": ItemText.quirk_text(q), "color": Color("#8fd18f")})
	if int(item.get("sockets", 0)) > 0:
		out.append({"text": "Socketed (%d)" % int(item.sockets), "color": BLUE})
	if item.quality == "rhuneword" and not unid:
		var ids := []
		for s in item.socketed:
			ids.append(String(ItemBases.get_base(s.baseId).name).replace(" Rhune", ""))
		out.append({"text": "'%s'" % " + ".join(ids), "color": UiKit.UNIQUE})

	if v.get("flavor", "") != "" and not unid:
		out.append({"text": v.flavor, "color": Color("#a89a7c"), "gap": true})
	if item.quality == "unique" and item.get("uniqueId", "") != "" and not unid:
		if not Game.save.get("codex", {}).has("u:%s" % item.uniqueId):
			out.append({"text": "New to your Codex!", "color": UiKit.GOLD})
	for e in extra:
		out.append({"text": String(e), "color": UiKit.DIM})
	if price >= 0:
		out.append({"text": ("Sell value: %d gold" if ctx == "sell" else "Cost: %d gold") % price, "color": UiKit.GOLD, "gap": true})
	return out
