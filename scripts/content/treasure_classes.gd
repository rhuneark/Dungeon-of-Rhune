class_name TreasureClasses
## Treasure Classes: D2's drop model, simplified. A source (monster, room
## chest...) names a TC; the TC makes `picks` weighted picks from
## its entries, where "noDrop" is a competing weight for nothing at all.
##  - Item Quantity shrinks noDrop (more stuff)
##  - <Kind> Find multiplies the weight of matching entries (more of THAT stuff)
##  - Rarity Find improves the quality roll of each item (better stuff)
## Equipment entries pick a base by item level at roll time.
##
## TC: {id, name, picks, noDrop, entries: [{pick: {kind, (category|mult|id)}, weight}], (quality: {magic, rare, unique})}

## Base odds an equipment drop rolls each quality (before Rarity Find), checked
## best-first like D2: unique -> rare -> magic -> superior -> normal -> crude.
## Rarity Find has diminishing returns on unique and rare: RF * k / (RF + k).
const QUALITY_TUNING := {
	"unique": {"base": 0.003125, "perLevelOver": 0.02, "dimK": 250},
	"rare": {"base": 0.045454545454545456, "perLevelOver": 0.01, "dimK": 600},
	"magic": {"base": 0.2222222222222222, "perLevelOver": 0, "dimK": 0},
	"superior": 0.1,
	"crude": {"chance": 0.125, "belowIlvl": 12},
}

static var _all: Array = []
static var _by_id: Dictionary = {}


static func all() -> Array:
	if _all.is_empty():
		var std := func(gold: float, gold_mult: float, w: float, a: float, j: float, c: float, r: float) -> Array:
			return [
				{"pick": {"kind": "gold", "mult": gold_mult}, "weight": gold},
				{"pick": {"kind": "equip", "category": "weapon"}, "weight": w},
				{"pick": {"kind": "equip", "category": "armor"}, "weight": a},
				{"pick": {"kind": "equip", "category": "jewelry"}, "weight": j},
				{"pick": {"kind": "equip", "category": "curio"}, "weight": c},
				{"pick": {"kind": "rhune"}, "weight": r},
			]
		_all = [
			# Monsters drop a little as you fight; the room's chest is the real haul.
			{"id": "mob", "name": "Monster", "picks": 1, "noDrop": 140, "entries": std.call(40, 1, 9, 12, 2, 1.2, 1.4)},
			{"id": "champion", "name": "Champion", "picks": 2, "noDrop": 40, "entries": std.call(35, 1, 9, 12, 2, 1.2, 1.4),
				"quality": {"magic": 1.5, "rare": 1.3, "unique": 1.2}},
			{"id": "elite", "name": "Unique Monster", "picks": 4, "noDrop": 20, "entries": std.call(20, 2, 18, 24, 6, 3, 4),
				"quality": {"magic": 2, "rare": 1.8, "unique": 1.6}},
			{"id": "boss", "name": "Boss", "picks": 6, "noDrop": 0, "entries": std.call(20, 2, 18, 24, 6, 3, 4),
				"quality": {"magic": 3, "rare": 2.5, "unique": 2.5}},
			{"id": "gobbler", "name": "Coin-Gobbler", "picks": 8, "noDrop": 0, "entries": std.call(40, 4, 18, 24, 6, 3, 4),
				"quality": {"magic": 2, "rare": 2, "unique": 2}},
			# The chest that rises when a room is cleared (rolled more times deeper down).
			{"id": "chest", "name": "Room Chest", "picks": 3, "noDrop": 8, "entries": std.call(30, 2, 16, 22, 6, 4, 5),
				"quality": {"magic": 1.6, "rare": 1.4, "unique": 1.3}},
			{"id": "chest_boss", "name": "Warden's Hoard", "picks": 7, "noDrop": 0, "entries": std.call(20, 3, 18, 24, 8, 5, 6),
				"quality": {"magic": 3, "rare": 2.8, "unique": 3}},
		]
		for t in _all:
			_by_id[t.id] = t
	return _all


static func get_tc(id: String) -> Dictionary:
	all()
	assert(_by_id.has(id), "unknown treasure class " + id)
	return _by_id.get(id, {})


static func has_tc(id: String) -> bool:
	all()
	return _by_id.has(id)
