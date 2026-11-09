class_name Rhunes
## Rhunes — the namesake. Small carved stones, each one "word" of the
## Rhunewrights' dead language. Socket one for its listed effect; socket the
## right ones IN ORDER into a plain (normal/superior) item with exactly that
## many sockets and it speaks a Rhuneword.
##
## The ladder is ordered by rarity: each step is roughly half as common.
## Three of a kind can be fused into the next at Brannoc's Crucible.
##
## Rhune: {id, name, qlvl, weight, effects: {weapon, armor, shield} (Arrays of stat mods), lore}
## Rhuneword: {id, name, rhunes: Array[String], tags, stats, flavor}

static var _all: Array = []
static var _words: Array = []


static func _m(stat: String, value, value2 = null) -> Dictionary:
	var d := {"stat": stat, "value": value}
	if value2 != null:
		d.value2 = value2
	return d


static func _fx(weapon: Array, armor: Array, shield: Array) -> Dictionary:
	return {"weapon": weapon, "armor": armor, "shield": shield}


static func all() -> Array:
	if not _all.is_empty():
		return _all
	_all = [
		{"id": "ash", "name": "Ash", "qlvl": 1, "weight": 1000,
			"effects": _fx([_m("localMaxDmg", 3), _m("lightRadius", 1)], [_m("localArmor", 10), _m("lightRadius", 1)], [_m("localArmor", 10), _m("lightRadius", 1)]),
			"lore": "\"What remains.\" The first word every Rhunewright apprentice carved."},
		{"id": "ember", "name": "Ember", "qlvl": 2, "weight": 600,
			"effects": _fx([_m("addDmg:fire", 3, 8)], [_m("res:fire", 25)], [_m("res:fire", 30)]),
			"lore": "\"Kindle.\" Warm to the touch, even in snow."},
		{"id": "frost", "name": "Frost", "qlvl": 3, "weight": 450,
			"effects": _fx([_m("addDmg:cold", 3, 6)], [_m("res:cold", 25)], [_m("res:cold", 30)]),
			"lore": "\"Stillness.\" Breath fogs near it."},
		{"id": "volt", "name": "Volt", "qlvl": 4, "weight": 350,
			"effects": _fx([_m("addDmg:lightning", 1, 14)], [_m("res:lightning", 25)], [_m("res:lightning", 30)]),
			"lore": "\"Strike.\" Hair stands on end when you hold it."},
		{"id": "blight", "name": "Blight", "qlvl": 5, "weight": 260,
			"effects": _fx([_m("addDmg:poison", 4, 8)], [_m("res:poison", 25)], [_m("res:poison", 30)]),
			"lore": "\"Rot.\" Moss grows on whatever it touches."},
		{"id": "thorn", "name": "Thorn", "qlvl": 7, "weight": 180,
			"effects": _fx([_m("lifeLeech", 3)], [_m("thorns", 8)], [_m("thorns", 12)]),
			"lore": "\"Take.\" Carved by Rhunewrights who did not share."},
		{"id": "iron", "name": "Iron", "qlvl": 9, "weight": 130,
			"effects": _fx([_m("localDmgPct", 20)], [_m("localArmorPct", 20)], [_m("block", 8)]),
			"lore": "\"Endure.\" The word on every door of the old Pit."},
		{"id": "tide", "name": "Tide", "qlvl": 11, "weight": 90,
			"effects": _fx([_m("manaLeech", 4)], [_m("manaRegen", 15)], [_m("mana", 20)]),
			"lore": "\"Return.\" Always found facing the sea, wherever it lies."},
		{"id": "hollow", "name": "Hollow", "qlvl": 13, "weight": 60,
			"effects": _fx([_m("addDmg:void", 5, 12)], [_m("res:void", 25)], [_m("res:void", 30)]),
			"lore": "\"The answer.\" The Rhunewrights carved it last, and regretted it."},
		{"id": "crown", "name": "Crown", "qlvl": 16, "weight": 40,
			"effects": _fx([_m("findGold", 50)], [_m("findGold", 40)], [_m("findGold", 40)]),
			"lore": "\"Mine.\" Every king who held one died rich."},
		{"id": "omen", "name": "Omen", "qlvl": 19, "weight": 25,
			"effects": _fx([_m("critChance", 8)], [_m("findRarity", 15)], [_m("findRarity", 12)]),
			"lore": "\"Soon.\" Gamblers swear by it. Gamblers swear by everything."},
		{"id": "zenith", "name": "Zenith", "qlvl": 23, "weight": 10,
			"effects": _fx([_m("skillAll", 1)], [_m("resAll", 10)], [_m("resAll", 12)]),
			"lore": "\"Above all.\" A shard of the stone the others were cut from."},
	]
	return _all


static func get_rhune(id: String) -> Dictionary:
	for r in all():
		if r.id == id:
			return r
	return {}


## "rhune_ember" -> "ember"; "" if the base isn't a rhune.
static func rhune_id_from_base(base_id: String) -> String:
	return base_id.substr(6) if base_id.begins_with("rhune_") else ""


## The next rhune up the ladder, or {}.
static func next_rhune(id: String) -> Dictionary:
	var a := all()
	for i in a.size():
		if a[i].id == id:
			return a[i + 1] if i + 1 < a.size() else {}
	return {}


static func rhunewords() -> Array:
	if not _words.is_empty():
		return _words
	_words = [
		{"id": "kindling", "name": "Kindling", "rhunes": ["ember", "ash"], "tags": ["weapon"],
			"stats": [_m("dmgPct:fire", 30), _m("attackSpeed", 10), _m("lifeOnKill", 3)],
			"flavor": "Every fire starts small."},
		{"id": "hearth", "name": "Hearth", "rhunes": ["ember", "iron"], "tags": ["chest"],
			"stats": [_m("life", 30), _m("lifeRegen", 4), _m("res:cold", 15)],
			"flavor": "Come in out of the cold."},
		{"id": "whisper", "name": "Whisper", "rhunes": ["ash", "thorn"], "tags": ["helm", "chest"],
			"stats": [_m("moveSpeed", 20), _m("castSpeed", 20), _m("mana", 15)],
			"flavor": "They never heard you coming."},
		{"id": "lodestone", "name": "Lodestone", "rhunes": ["iron", "iron"], "tags": ["shield"],
			"stats": [_m("localArmorPct", 60), _m("dmgReduce", 5), _m("resAll", 8)],
			"flavor": "Immovable. Unimpressed."},
		{"id": "gale", "name": "Gale", "rhunes": ["volt", "ash", "tide"], "tags": ["bow", "spear"],
			"stats": [_m("tagPct:projectile", 40), _m("attackSpeed", 20), _m("moveSpeed", 10)],
			"flavor": "The wind does not miss."},
		{"id": "bramblecoat", "name": "Bramblecoat", "rhunes": ["thorn", "blight", "thorn"], "tags": ["chest"],
			"stats": [_m("thorns", 25), _m("res:poison", 30), _m("life", 40)],
			"flavor": "Hug at your own risk."},
		{"id": "gilded_tongue", "name": "Gilded Tongue", "rhunes": ["crown", "omen"], "tags": ["helm"],
			"stats": [_m("findGold", 60), _m("findRarity", 35), _m("seek:unique", 20)],
			"flavor": "Fortune favours the shameless."},
		{"id": "murmur", "name": "Murmur", "rhunes": ["tide", "omen", "ash"], "tags": ["staff", "wand", "tome"],
			"stats": [_m("skillAll", 1), _m("manaRegen", 40), _m("castSpeed", 20)],
			"flavor": "The stones talk, if you let them."},
		{"id": "hollow_crown", "name": "Hollow Crown", "rhunes": ["hollow", "crown", "zenith"], "tags": ["weapon"],
			"stats": [_m("skillAll", 1), _m("dmgPct:void", 60), _m("localDmgPct", 120), _m("findRarity", 25)],
			"flavor": "It was always going to be you."},
	]
	return _words


static func get_rhuneword(id: String) -> Dictionary:
	for rw in rhunewords():
		if rw.id == id:
			return rw
	return {}


## The rhuneword spelled by these rhune ids on a base with these tags, or {}.
static func find_rhuneword(rhune_ids: Array, base_tags: Array) -> Dictionary:
	for rw in rhunewords():
		if rw.rhunes.size() != rhune_ids.size():
			continue
		var same := true
		for i in rw.rhunes.size():
			if rw.rhunes[i] != rhune_ids[i]:
				same = false
				break
		if not same:
			continue
		for t in rw.tags:
			if t in base_tags:
				return rw
	return {}
