class_name Seasons
## Realms and modes. Every hero is made in one realm (the current Season, or
## Eternal) and one mode (Trade, or SSF: solo self-found, never trades).
## Each realm + mode pair has its own stash (Game.stash()), so a season starts
## from nothing and SSF loot stays SSF. When a season ends (CURRENT moves on),
## its heroes and their stash move to Eternal, mode unchanged (migrate()).
## Trading between Trade heroes is planned; SSF heroes will never see it.

const ETERNAL := "eternal"
## The live season. Bump id + name to start the next one.
const CURRENT := {"id": "s1", "name": "Season 1: The Undercroft"}
const MODES := {"trade": "Trade", "ssf": "SSF"}


static func realm_name(realm: String) -> String:
	if realm == ETERNAL:
		return "Eternal"
	if realm == CURRENT.id:
		return String(CURRENT.name).get_slice(":", 0)
	return realm.to_upper()


static func badge(hero: Dictionary) -> String:
	return "%s · %s" % [realm_name(String(hero.get("realm", ETERNAL))), MODES.get(String(hero.get("mode", "trade")), "Trade")]


## Heroes and stashes of seasons that have ended move to Eternal. Stash items
## that don't fit the Eternal stash wait in save.reclaim[mode] (the stash panel
## offers them back as room frees up). Returns how many heroes moved.
static func migrate(save: Dictionary) -> int:
	var moved := 0
	var heroes: Array = []
	if save.get("hero") is Dictionary:
		heroes.append(save.hero)
	heroes.append_array(save.get("bench", []))
	for h in heroes:
		var realm := String(h.get("realm", ETERNAL))
		if realm != ETERNAL and realm != CURRENT.id:
			h.realm = ETERNAL
			moved += 1
	var stashes: Dictionary = save.get("stashes", {})
	for key in stashes.keys():
		var realm := String(key).get_slice(":", 0)
		var mode := String(key).get_slice(":", 1)
		if realm == ETERNAL or realm == CURRENT.id:
			continue
		var into := "%s:%s" % [ETERNAL, mode]
		if not stashes.has(into):
			stashes[into] = []
		var grid := Grid.make(HeroData.STASH_W, HeroData.STASH_H, stashes[into])
		if not save.has("reclaim"):
			save.reclaim = {}
		for it in stashes[key]:
			if not Grid.auto_place(grid, it):
				if not save.reclaim.has(mode):
					save.reclaim[mode] = []
				save.reclaim[mode].append(it)
		stashes.erase(key)
	return moved
