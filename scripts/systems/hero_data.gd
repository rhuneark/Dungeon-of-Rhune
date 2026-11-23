class_name HeroData
## The persisted save: one hero (multi-slot later), a shared stash, and
## account-wide records (the Codex). Plain JSON; item instances inside.
##
## SaveData: {version: 2, hero: HeroSave | null, stash: Array[item],
##            codex: {"u:<id>"|"w:<id>"|"r:<id>": {at, best}},
##            stats: {gambles, identified, uniquesFound, rhunesFound, kills, deaths, chests}}
## HeroSave: {name, createdAt, level, xp, gold, attrs: {might, finesse, vigor, spirit},
##            attrPoints, equipped: {slot: item}, inventory: Array[item],
##            cursor: item|null, flags: {key: n}, life, crucible: Array[item],
##            bestFloor (highest floor entered; 0 = never been down),
##            resumeFloor (where "Continue" goes: the floor after the last one
##            cleared; 0 after a death, which sends you back to a checkpoint)}
## Item: {uid, baseId, quality, ilvl, seed, identified, affixes: [{affixId, tier, values}],
##        baseRoll, sockets, socketed: Array[item], (uniqueId, uniqueValues,
##        rareName: [first, second], rhunewordId, charmSlots, charms: Array[item], x, y)}

const ATTRS := ["might", "finesse", "vigor", "spirit"]
## Ids are the original ones (saves and item data use them); these are the names players see.
const ATTR_INFO := {
	"might": {"name": "Strength", "desc": "+1% physical damage with melee weapons. Gear requirements."},
	"finesse": {"name": "Dexterity", "desc": "+1% attack speed per 5, +0.2% crit chance. +1% physical damage with bows."},
	"vigor": {"name": "Stamina", "desc": "+3 life per point."},
	"spirit": {"name": "Intelligence", "desc": "+1% elemental damage. +1% physical damage with caster weapons."},
}

const INV_W := 10
const INV_H := 4
const STASH_W := 10
const STASH_H := 10
const CRUCIBLE_W := 3
const CRUCIBLE_H := 4

const ATTR_POINTS_PER_LEVEL := 5
const MAX_LEVEL := 99


static func now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)


static func default_save() -> Dictionary:
	return {
		"version": 2,
		"hero": null,
		"stash": [],
		"codex": {},
		"stats": {"gambles": 0, "identified": 0, "uniquesFound": 0, "rhunesFound": 0, "kills": 0, "deaths": 0, "chests": 0, "wardens": 0, "conquered": 0},
	}


## XP to go from `level` to `level + 1`.
static func xp_to_next(level: int) -> int:
	return floori(90.0 * pow(level, 1.6) + 150.0)


static func new_hero(name: String) -> Dictionary:
	var rng := Rng.new()
	var nm := name.strip_edges()
	var hero := {
		"name": nm if nm != "" else "Wanderer",
		"createdAt": now_ms(),
		"level": 1,
		"xp": 0,
		"gold": 400,
		"attrs": {"might": 10, "finesse": 10, "vigor": 10, "spirit": 10},
		"attrPoints": 0,
		"equipped": {},
		"inventory": [],
		"cursor": null,
		"flags": {},
		"life": 1,
		"crucible": [],
		"bestFloor": 0,
		"resumeFloor": 0,
	}
	# Starter kit: plain, honest gear.
	hero.equipped.weapon = ItemGen.create_item("short_sword", {"ilvl": 1, "quality": "normal", "rng": rng})
	hero.equipped.chest = ItemGen.create_item("quilted_armor", {"ilvl": 1, "quality": "normal", "rng": rng})
	hero.equipped.offhand = ItemGen.create_item("buckler", {"ilvl": 1, "quality": "normal", "rng": rng})
	hero.equipped.waist = ItemGen.create_item("sash", {"ilvl": 1, "quality": "normal", "rng": rng})
	for slot in ["weapon", "chest", "offhand", "waist"]:
		hero.equipped[slot].sockets = 0
	hero.equipped.waist.charmSlots = 2
	return hero
