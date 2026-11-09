class_name HeroData
## The persisted save: one hero (multi-slot later), a shared stash, and
## account-wide records (the Codex). Plain JSON; item instances inside.
##
## SaveData: {version: 1, hero: HeroSave | null, stash: Array[item],
##            codex: {"u:<id>"|"w:<id>"|"r:<id>": {at, best}},
##            stats: {gambles, wishes, identified, uniquesFound, rhunesFound}}
## HeroSave: {name, createdAt, level, xp, gold, attrs: {might, finesse, vigor, spirit},
##            attrPoints, pathPoints, disciplines: [id|null, id|null], ranks: {id: n},
##            skills: {id: {xp, level, specialized, nodes: {nodeId: rank}}},
##            hotbar: [id|null x5], equipped: {slot: item}, inventory: Array[item],
##            cursor: item|null, quests: {id: {state: "active"|"done", progress: {objId: n}}},
##            lore: Array[String], flags: {key: n}, life, mana, taken: Array[String],
##            crucible: Array[item]}
## Item: {uid, baseId, quality, ilvl, seed, identified, affixes: [{affixId, tier, values}],
##        baseRoll, sockets, socketed: Array[item], (qty, uniqueId, uniqueValues,
##        rareName: [first, second], rhunewordId, x, y)}

const ATTRS := ["might", "finesse", "vigor", "spirit"]
const ATTR_INFO := {
	"might": {"name": "Might", "desc": "+1% physical damage, gear requirements"},
	"finesse": {"name": "Finesse", "desc": "+1% attack speed per 5, +0.2% crit per point"},
	"vigor": {"name": "Vigor", "desc": "+3 life per point"},
	"spirit": {"name": "Spirit", "desc": "+2 mana per point, +1% spell damage per 2"},
}

const INV_W := 10
const INV_H := 4
const STASH_W := 10
const STASH_H := 10
const CRUCIBLE_W := 3
const CRUCIBLE_H := 4

const ATTR_POINTS_PER_LEVEL := 5
const PATH_POINTS_PER_LEVEL := 1
const MAX_LEVEL := 40


static func now_ms() -> int:
	return int(Time.get_unix_time_from_system() * 1000.0)


static func default_save() -> Dictionary:
	return {
		"version": 1,
		"hero": null,
		"stash": [],
		"codex": {},
		"stats": {"gambles": 0, "wishes": 0, "identified": 0, "uniquesFound": 0, "rhunesFound": 0},
	}


## XP to go from `level` to `level + 1`.
static func xp_to_next(level: int) -> int:
	return floori(120.0 * pow(level, 1.75) + 180.0)


## Skill XP to go from skill level n to n + 1 (specialized skills earn hero XP).
static func skill_xp_to_next(level: int) -> int:
	return floori(90.0 * pow(level, 1.55) + 110.0)


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
		# One point so the player can pick a first Discipline right away.
		"pathPoints": 1,
		"disciplines": [null, null],
		"ranks": {},
		"skills": {},
		"hotbar": [null, null, null, null, null],
		"equipped": {},
		"inventory": [],
		"cursor": null,
		"quests": {},
		"lore": [],
		"flags": {},
		"life": 1,
		"mana": 1,
		"taken": [],
		"crucible": [],
	}
	# Starter kit: plain, honest gear.
	hero.equipped.weapon = ItemGen.create_item("short_sword", {"ilvl": 1, "quality": "normal", "rng": rng})
	hero.equipped.chest = ItemGen.create_item("quilted_armor", {"ilvl": 1, "quality": "normal", "rng": rng})
	hero.equipped.offhand = ItemGen.create_item("buckler", {"ilvl": 1, "quality": "normal", "rng": rng})
	hero.equipped.weapon.sockets = 0
	hero.equipped.chest.sockets = 0
	hero.equipped.offhand.sockets = 0
	for s in [["potion_health", 0, 0], ["potion_health", 1, 0], ["potion_mana", 2, 0], ["scroll_identify", 3, 0]]:
		var it := ItemGen.create_item(s[0], {"ilvl": 1, "rng": rng})
		it.x = s[1]
		it.y = s[2]
		hero.inventory.append(it)
	return hero
