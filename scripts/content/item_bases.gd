class_name ItemBases
## Base item catalog — the first "tier" (levels 1-30). Exceptional/elite
## tiers later reuse the same shapes with new names, damage and qlvl.
##
## Every base Dictionary has ALL keys (defaults filled in by _b): id, name,
## category, slot ("" if not equippable), twoHanded, w, h, art (Array),
## qlvl, reqLevel (1), reqMight/reqFinesse/reqSpirit (0), damage ([] or
## [min,max]), speed (0.0), armor ([] or [min,max]), block (0), implicit
## (Array of stat mods), maxSockets, tags, weight, price, alwaysMagic, use
## ("" or heal|mana|rejuv|identify), flavor ("").
##
## Tags drive affix eligibility (Affixes) and Targeted Find matching.

static var _all: Array = []
static var _by_id: Dictionary = {}
static var _equipment: Array = []


static func _b(d: Dictionary) -> Dictionary:
	var base := {
		"id": "", "name": "", "category": "weapon", "slot": "", "twoHanded": false,
		"w": 1, "h": 1, "art": [], "qlvl": 1, "reqLevel": 1, "reqMight": 0, "reqFinesse": 0, "reqSpirit": 0,
		"damage": [], "speed": 0.0, "armor": [], "block": 0, "implicit": [], "maxSockets": 0,
		"tags": [], "weight": 0, "price": 1, "alwaysMagic": false, "use": "", "flavor": "",
	}
	base.merge(d, true)
	return base


static func _m(stat: String, value) -> Dictionary:
	return {"stat": stat, "value": value}


static func all() -> Array:
	if not _all.is_empty():
		return _all
	var a: Array = [
		# ---------------------------------------------------------------- weapons
		_b({"id": "dagger", "name": "Dagger", "slot": "weapon", "w": 1, "h": 2, "art": ["dagger"], "qlvl": 1, "damage": [2, 6], "speed": 1.6, "maxSockets": 1, "tags": ["weapon", "melee", "1h", "dagger"], "weight": 10, "price": 30, "reqFinesse": 8}),
		_b({"id": "short_sword", "name": "Short Sword", "slot": "weapon", "w": 1, "h": 3, "art": ["short_sword"], "qlvl": 1, "damage": [3, 8], "speed": 1.3, "maxSockets": 2, "tags": ["weapon", "melee", "1h", "sword"], "weight": 10, "price": 40}),
		_b({"id": "club", "name": "Spiked Club", "slot": "weapon", "w": 1, "h": 3, "art": ["club"], "qlvl": 1, "damage": [2, 9], "speed": 1.25, "maxSockets": 2, "tags": ["weapon", "melee", "1h", "mace"], "weight": 10, "price": 30}),
		_b({"id": "hand_axe", "name": "Hand Axe", "slot": "weapon", "w": 1, "h": 3, "art": ["hand_axe"], "qlvl": 2, "damage": [3, 7], "speed": 1.35, "maxSockets": 2, "tags": ["weapon", "melee", "1h", "axe"], "weight": 10, "price": 35}),
		_b({"id": "short_bow", "name": "Short Bow", "slot": "weapon", "twoHanded": true, "w": 2, "h": 3, "art": ["short_bow"], "qlvl": 1, "damage": [2, 7], "speed": 1.4, "maxSockets": 3, "tags": ["weapon", "ranged", "2h", "bow"], "weight": 10, "price": 50, "reqFinesse": 10}),
		_b({"id": "wand", "name": "Bone Wand", "slot": "weapon", "w": 1, "h": 2, "art": ["wand"], "qlvl": 1, "damage": [2, 4], "speed": 1.3, "maxSockets": 1, "implicit": [_m("tagPct:spell", 10)], "tags": ["weapon", "caster", "1h", "wand"], "weight": 8, "price": 45, "reqSpirit": 10}),
		_b({"id": "staff", "name": "Gnarled Staff", "slot": "weapon", "twoHanded": true, "w": 1, "h": 4, "art": ["staff"], "qlvl": 3, "damage": [3, 9], "speed": 1.1, "maxSockets": 3, "implicit": [_m("castSpeed", 10), _m("mana", 10)], "tags": ["weapon", "caster", "2h", "staff"], "weight": 8, "price": 60, "reqSpirit": 12}),
		_b({"id": "spear", "name": "Spear", "slot": "weapon", "twoHanded": true, "w": 1, "h": 4, "art": ["spear"], "qlvl": 5, "damage": [6, 18], "speed": 1.1, "maxSockets": 3, "tags": ["weapon", "melee", "2h", "spear"], "weight": 8, "price": 70, "reqMight": 15, "reqFinesse": 15}),
		_b({"id": "mace", "name": "Flanged Mace", "slot": "weapon", "w": 1, "h": 3, "art": ["mace"], "qlvl": 6, "damage": [4, 10], "speed": 1.2, "maxSockets": 2, "tags": ["weapon", "melee", "1h", "mace"], "weight": 8, "price": 70, "reqMight": 20}),
		_b({"id": "greatsword", "name": "Greatsword", "slot": "weapon", "twoHanded": true, "w": 1, "h": 4, "art": ["greatsword"], "qlvl": 8, "damage": [10, 22], "speed": 1.0, "maxSockets": 3, "tags": ["weapon", "melee", "2h", "sword"], "weight": 7, "price": 110, "reqMight": 30}),
		_b({"id": "scepter", "name": "Scepter", "slot": "weapon", "w": 1, "h": 3, "art": ["scepter"], "qlvl": 8, "damage": [5, 10], "speed": 1.2, "maxSockets": 2, "implicit": [_m("lifeRegen", 2)], "tags": ["weapon", "caster", "melee", "1h", "mace", "scepter"], "weight": 7, "price": 100, "reqMight": 15, "reqSpirit": 15}),
		_b({"id": "war_axe", "name": "War Axe", "slot": "weapon", "twoHanded": true, "w": 2, "h": 3, "art": ["war_axe"], "qlvl": 10, "damage": [10, 24], "speed": 0.95, "maxSockets": 4, "tags": ["weapon", "melee", "2h", "axe"], "weight": 7, "price": 130, "reqMight": 35}),
		_b({"id": "maul", "name": "Maul", "slot": "weapon", "twoHanded": true, "w": 2, "h": 3, "art": ["maul"], "qlvl": 14, "damage": [12, 28], "speed": 0.85, "maxSockets": 4, "tags": ["weapon", "melee", "2h", "mace"], "weight": 6, "price": 160, "reqMight": 45}),

		# --------------------------------------------------------------- off-hands
		_b({"id": "buckler", "name": "Buckler", "category": "offhand", "slot": "offhand", "w": 2, "h": 2, "art": ["buckler"], "qlvl": 1, "armor": [4, 8], "block": 15, "maxSockets": 1, "tags": ["offhand", "shield"], "weight": 10, "price": 30}),
		_b({"id": "tome", "name": "Tattered Tome", "category": "offhand", "slot": "offhand", "w": 2, "h": 2, "art": ["tome"], "qlvl": 3, "maxSockets": 1, "implicit": [_m("mana", 10), _m("tagPct:spell", 5)], "tags": ["offhand", "caster", "tome"], "weight": 8, "price": 50, "reqSpirit": 10}),
		_b({"id": "kite_shield", "name": "Kite Shield", "category": "offhand", "slot": "offhand", "w": 2, "h": 3, "art": ["kite_shield"], "qlvl": 9, "armor": [14, 22], "block": 25, "maxSockets": 3, "tags": ["offhand", "shield"], "weight": 8, "price": 90, "reqMight": 25}),

		# ------------------------------------------------------------------ armor
		_b({"id": "cap", "name": "Cap", "category": "armor", "slot": "head", "w": 2, "h": 2, "art": ["cap"], "qlvl": 1, "armor": [3, 5], "maxSockets": 2, "tags": ["armor", "helm"], "weight": 10, "price": 20}),
		_b({"id": "hood", "name": "Hood", "category": "armor", "slot": "head", "w": 2, "h": 2, "art": ["hood"], "qlvl": 3, "armor": [2, 4], "maxSockets": 1, "implicit": [_m("mana", 5)], "tags": ["armor", "helm", "caster"], "weight": 9, "price": 25}),
		_b({"id": "helm", "name": "Great Helm", "category": "armor", "slot": "head", "w": 2, "h": 2, "art": ["helm"], "qlvl": 12, "armor": [10, 16], "maxSockets": 2, "tags": ["armor", "helm"], "weight": 8, "price": 80, "reqMight": 30}),
		_b({"id": "quilted_armor", "name": "Quilted Armor", "category": "armor", "slot": "chest", "w": 2, "h": 3, "art": ["quilted_armor"], "qlvl": 1, "armor": [8, 12], "maxSockets": 2, "tags": ["armor", "chest"], "weight": 10, "price": 30}),
		_b({"id": "robe", "name": "Runed Robe", "category": "armor", "slot": "chest", "w": 2, "h": 3, "art": ["robe"], "qlvl": 4, "armor": [6, 10], "maxSockets": 2, "implicit": [_m("castSpeed", 5)], "tags": ["armor", "chest", "caster"], "weight": 8, "price": 45}),
		_b({"id": "leather_armor", "name": "Studded Leather", "category": "armor", "slot": "chest", "w": 2, "h": 3, "art": ["leather_armor"], "qlvl": 6, "armor": [14, 20], "maxSockets": 2, "tags": ["armor", "chest"], "weight": 9, "price": 60, "reqMight": 15}),
		_b({"id": "chain_mail", "name": "Chain Mail", "category": "armor", "slot": "chest", "w": 2, "h": 3, "art": ["chain_mail"], "qlvl": 12, "armor": [24, 32], "maxSockets": 3, "tags": ["armor", "chest"], "weight": 8, "price": 110, "reqMight": 35}),
		_b({"id": "breastplate", "name": "Breastplate", "category": "armor", "slot": "chest", "w": 2, "h": 3, "art": ["breastplate"], "qlvl": 18, "armor": [34, 45], "maxSockets": 3, "tags": ["armor", "chest"], "weight": 7, "price": 160, "reqMight": 45}),
		_b({"id": "gloves", "name": "Leather Gloves", "category": "armor", "slot": "hands", "w": 2, "h": 2, "art": ["gloves"], "qlvl": 1, "armor": [2, 4], "maxSockets": 0, "tags": ["armor", "gloves"], "weight": 10, "price": 20}),
		_b({"id": "gauntlets", "name": "Gauntlets", "category": "armor", "slot": "hands", "w": 2, "h": 2, "art": ["gauntlets"], "qlvl": 12, "armor": [8, 12], "maxSockets": 0, "tags": ["armor", "gloves"], "weight": 8, "price": 70, "reqMight": 30}),
		_b({"id": "boots", "name": "Boots", "category": "armor", "slot": "feet", "w": 2, "h": 2, "art": ["boots"], "qlvl": 1, "armor": [2, 4], "maxSockets": 0, "tags": ["armor", "boots"], "weight": 10, "price": 20}),
		_b({"id": "greaves", "name": "Greaves", "category": "armor", "slot": "feet", "w": 2, "h": 2, "art": ["greaves"], "qlvl": 12, "armor": [8, 12], "maxSockets": 0, "tags": ["armor", "boots"], "weight": 8, "price": 70, "reqMight": 30}),
		_b({"id": "sash", "name": "Sash", "category": "armor", "slot": "waist", "w": 2, "h": 1, "art": ["sash"], "qlvl": 1, "armor": [2, 3], "maxSockets": 0, "tags": ["armor", "belt"], "weight": 10, "price": 20}),
		_b({"id": "belt", "name": "Belt", "category": "armor", "slot": "waist", "w": 2, "h": 1, "art": ["belt"], "qlvl": 9, "armor": [4, 6], "maxSockets": 0, "tags": ["armor", "belt"], "weight": 8, "price": 50}),

		# ---------------------------------------------------------------- jewelry
		_b({"id": "ring", "name": "Ring", "category": "jewelry", "slot": "ring", "w": 1, "h": 1, "art": ["ring_a", "ring_b", "ring_c"], "qlvl": 1, "maxSockets": 0, "tags": ["jewelry", "ring"], "weight": 10, "price": 100, "alwaysMagic": true}),
		_b({"id": "amulet", "name": "Amulet", "category": "jewelry", "slot": "neck", "w": 1, "h": 1, "art": ["amulet_a", "amulet_b", "amulet_c"], "qlvl": 1, "maxSockets": 0, "tags": ["jewelry", "amulet"], "weight": 8, "price": 150, "alwaysMagic": true}),

		# ------------------------------------------------------------------ curios
		# Curios work while carried in the backpack (D2-charm homage): every cell
		# they take is a cell you can't fill with loot. That tension is the point.
		_b({"id": "curio_small", "name": "Small Curio", "category": "curio", "w": 1, "h": 1, "art": ["curio_s_a", "curio_s_b", "curio_s_c"], "qlvl": 1, "maxSockets": 0, "tags": ["curio", "curio_small"], "weight": 10, "price": 80, "alwaysMagic": true, "flavor": "Keep it in your pack."}),
		_b({"id": "curio_medium", "name": "Curio", "category": "curio", "w": 1, "h": 2, "art": ["curio_m_a", "curio_m_b"], "qlvl": 10, "maxSockets": 0, "tags": ["curio", "curio_medium"], "weight": 7, "price": 120, "alwaysMagic": true, "flavor": "Keep it in your pack."}),
		_b({"id": "curio_large", "name": "Grand Curio", "category": "curio", "w": 1, "h": 3, "art": ["curio_l_a", "curio_l_b"], "qlvl": 18, "maxSockets": 0, "tags": ["curio", "curio_large"], "weight": 5, "price": 200, "alwaysMagic": true, "flavor": "Keep it in your pack."}),

		# ------------------------------------------------------------- consumables
		_b({"id": "potion_health", "name": "Healing Draught", "category": "consumable", "w": 1, "h": 1, "art": ["potion_red"], "qlvl": 1, "maxSockets": 0, "tags": ["potion"], "weight": 10, "price": 25, "use": "heal"}),
		_b({"id": "potion_mana", "name": "Mana Draught", "category": "consumable", "w": 1, "h": 1, "art": ["potion_blue"], "qlvl": 1, "maxSockets": 0, "tags": ["potion"], "weight": 8, "price": 25, "use": "mana"}),
		_b({"id": "potion_rejuv", "name": "Rejuvenation Tonic", "category": "consumable", "w": 1, "h": 1, "art": ["potion_purple"], "qlvl": 8, "maxSockets": 0, "tags": ["potion"], "weight": 2, "price": 150, "use": "rejuv"}),
		_b({"id": "scroll_identify", "name": "Scroll of Insight", "category": "consumable", "w": 1, "h": 1, "art": ["scroll"], "qlvl": 1, "maxSockets": 0, "tags": ["scroll"], "weight": 3, "price": 40, "use": "identify", "flavor": "Right-click, then click an unidentified item."}),
		_b({"id": "lore_page", "name": "Torn Page", "category": "quest", "w": 1, "h": 1, "art": ["page"], "qlvl": 1, "maxSockets": 0, "tags": ["quest"], "weight": 0, "price": 1, "flavor": "Old Varn would want to see this."}),
		_b({"id": "old_key", "name": "Rusted Key", "category": "quest", "w": 1, "h": 1, "art": ["key"], "qlvl": 1, "maxSockets": 0, "tags": ["quest"], "weight": 0, "price": 1, "flavor": "It smells faintly of goose."}),
	]
	# ------------------------------------------------------------------ rhunes
	var i := 0
	for r in Rhunes.all():
		a.append(_b({
			"id": "rhune_" + r.id, "name": r.name + " Rhune", "category": "rhune", "w": 1, "h": 1,
			"art": ["rhune_" + r.id], "qlvl": r.qlvl, "reqLevel": r.qlvl, "maxSockets": 0, "tags": ["rhune"],
			"weight": r.weight, "price": roundi(40.0 * pow(1.6, i)), "flavor": r.lore,
		}))
		i += 1
	_all = a
	for b in _all:
		_by_id[b.id] = b
	return _all


static func get_base(id: String) -> Dictionary:
	all()
	assert(_by_id.has(id), "unknown base " + id)
	return _by_id.get(id, {})


static func has_base(id: String) -> bool:
	all()
	return _by_id.has(id)


## Bases that can come out of an "equipment" pick.
static func equipment_bases() -> Array:
	if _equipment.is_empty():
		for b in all():
			if b.category in ["weapon", "offhand", "armor", "jewelry", "curio"]:
				_equipment.append(b)
	return _equipment


## Targeted-Find kind a base counts as ("" if none).
static func seek_kind_of(base: Dictionary) -> String:
	match base.category:
		"weapon":
			return "weapon"
		"offhand", "armor":
			return "armor"
		"jewelry":
			return "jewelry"
		"curio":
			return "curio"
		"rhune":
			return "rhune"
	return ""
