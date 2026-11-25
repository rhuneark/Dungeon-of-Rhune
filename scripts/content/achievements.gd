class_name Achievements
## Steam achievements. Ids must match the API names configured in the
## Steamworks partner site (App Admin -> Stats & Achievements). Each one is a
## pure check over the save, so they unlock retroactively for old saves.
##
## Achievement: {id, name, description}

const ALL := [
	{"id": "FIRST_UNIQUE", "name": "Grail-Hunter", "description": "Identify your first unique item."},
	{"id": "CODEX_10", "name": "Collector", "description": "Record 10 different uniques in the Codex."},
	{"id": "FIRST_RHUNEWORD", "name": "It Speaks", "description": "Speak your first Rhuneword."},
	{"id": "ODDS_ARE", "name": "Odds Are", "description": "Buy 25 of Odo's sealed goods."},
	{"id": "FIRST_WARDEN", "name": "Sand in the Gears", "description": "Defeat an Hourglass Warden."},
	{"id": "TIER_5", "name": "Cartographer", "description": "Finish a Tier 5 expedition."},
	{"id": "TIER_10", "name": "Deep Walker", "description": "Finish a Tier 10 expedition."},
	{"id": "GREEDY", "name": "Greed Is a Map", "description": "Finish an expedition at Threat 10 or more."},
]


static func all() -> Array:
	return ALL


static func _hero(save: Dictionary):
	var h = save.get("hero")
	return h if h is Dictionary else null


## Best tier finished by any hero on the account.
static func _best_tier(save: Dictionary) -> int:
	var best := 0
	var heroes: Array = save.get("bench", []).duplicate()
	if _hero(save) != null:
		heroes.append(save.hero)
	for h in heroes:
		best = maxi(best, int(h.get("bestTier", 0)))
	return best


static func _codex_count(save: Dictionary, prefix: String) -> int:
	var n := 0
	for k in save.get("codex", {}):
		if String(k).begins_with(prefix):
			n += 1
	return n


static func _stat(save: Dictionary, key: String) -> int:
	return int(save.get("stats", {}).get(key, 0))


static func check(id: String, save: Dictionary) -> bool:
	match id:
		"FIRST_UNIQUE":
			return _codex_count(save, "u:") >= 1
		"CODEX_10":
			return _codex_count(save, "u:") >= 10
		"FIRST_RHUNEWORD":
			return _codex_count(save, "w:") >= 1
		"ODDS_ARE":
			return _stat(save, "gambles") >= 25
		"FIRST_WARDEN":
			return _stat(save, "wardens") >= 1
		"TIER_5":
			return _best_tier(save) >= 5
		"TIER_10":
			return _best_tier(save) >= 10
		"GREEDY":
			return _stat(save, "bestThreat") >= 10
	return false


static func unlocked_ids(save: Dictionary) -> Array[String]:
	var out: Array[String] = []
	for a in ALL:
		if check(a.id, save):
			out.append(a.id)
	return out
