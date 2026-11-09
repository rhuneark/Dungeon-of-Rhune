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
	{"id": "TWO_PATHS", "name": "Two Paths", "description": "Walk two Disciplines at once."},
	{"id": "GOOSE", "name": "Have a Word", "description": "Resolve the Goose Problem."},
	{"id": "LOCAL_KNOWLEDGE", "name": "Local Knowledge", "description": "Finish every lore quest in Thornwick."},
	{"id": "BOTTOMLESS", "name": "Bottomless", "description": "Make 25 wishes at the Wishing Well."},
	{"id": "ODDS_ARE", "name": "Odds Are", "description": "Buy 25 of Odo's sealed goods."},
]


static func all() -> Array:
	return ALL


static func _hero(save: Dictionary):
	var h = save.get("hero")
	return h if h is Dictionary else null


static func _done(save: Dictionary, q: String) -> bool:
	var h = _hero(save)
	if h == null:
		return false
	var qs: Dictionary = h.get("quests", {})
	return qs.has(q) and qs[q].get("state", "") == "done"


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
		"TWO_PATHS":
			var h = _hero(save)
			if h == null:
				return false
			for d in h.get("disciplines", []):
				if d == null or d == "":
					return false
			return true
		"GOOSE":
			return _done(save, "goose_problem")
		"LOCAL_KNOWLEDGE":
			for q in QuestDefs.all():
				if not _done(save, q.id):
					return false
			return true
		"BOTTOMLESS":
			return _stat(save, "wishes") >= 25
		"ODDS_ARE":
			return _stat(save, "gambles") >= 25
	return false


static func unlocked_ids(save: Dictionary) -> Array[String]:
	var out: Array[String] = []
	for a in ALL:
		if check(a.id, save):
			out.append(a.id)
	return out
