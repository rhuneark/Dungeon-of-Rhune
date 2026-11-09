class_name TreasureClasses
## Treasure Classes: D2's drop model, simplified. A source (monster, chest,
## the wishing well...) names a TC; the TC makes `picks` weighted picks from
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
		_all = [
			{
				"id": "mob",
				"name": "Monster",
				"picks": 1,
				"noDrop": 100,
				"entries": [
					{"pick": {"kind": "gold"}, "weight": 35},
					{"pick": {"kind": "potion"}, "weight": 20},
					{"pick": {"kind": "scroll"}, "weight": 3},
					{"pick": {"kind": "equip", "category": "weapon"}, "weight": 9},
					{"pick": {"kind": "equip", "category": "armor"}, "weight": 12},
					{"pick": {"kind": "equip", "category": "jewelry"}, "weight": 2},
					{"pick": {"kind": "equip", "category": "curio"}, "weight": 1.2},
					{"pick": {"kind": "rhune"}, "weight": 1.4},
				],
			},
			{
				"id": "champion",
				"name": "Champion",
				"picks": 2,
				"noDrop": 40,
				"entries": [
					{"pick": {"kind": "gold"}, "weight": 35},
					{"pick": {"kind": "potion"}, "weight": 20},
					{"pick": {"kind": "scroll"}, "weight": 3},
					{"pick": {"kind": "equip", "category": "weapon"}, "weight": 9},
					{"pick": {"kind": "equip", "category": "armor"}, "weight": 12},
					{"pick": {"kind": "equip", "category": "jewelry"}, "weight": 2},
					{"pick": {"kind": "equip", "category": "curio"}, "weight": 1.2},
					{"pick": {"kind": "rhune"}, "weight": 1.4},
				],
				"quality": {"magic": 1.5, "rare": 1.3, "unique": 1.2},
			},
			{
				"id": "elite",
				"name": "Unique Monster",
				"picks": 4,
				"noDrop": 20,
				"entries": [
					{"pick": {"kind": "gold", "mult": 2}, "weight": 20},
					{"pick": {"kind": "potion"}, "weight": 8},
					{"pick": {"kind": "equip", "category": "weapon"}, "weight": 18},
					{"pick": {"kind": "equip", "category": "armor"}, "weight": 24},
					{"pick": {"kind": "equip", "category": "jewelry"}, "weight": 6},
					{"pick": {"kind": "equip", "category": "curio"}, "weight": 3},
					{"pick": {"kind": "rhune"}, "weight": 4},
				],
				"quality": {"magic": 2, "rare": 1.8, "unique": 1.6},
			},
			{
				"id": "boss",
				"name": "Boss",
				"picks": 6,
				"noDrop": 0,
				"entries": [
					{"pick": {"kind": "gold", "mult": 2}, "weight": 20},
					{"pick": {"kind": "potion"}, "weight": 8},
					{"pick": {"kind": "equip", "category": "weapon"}, "weight": 18},
					{"pick": {"kind": "equip", "category": "armor"}, "weight": 24},
					{"pick": {"kind": "equip", "category": "jewelry"}, "weight": 6},
					{"pick": {"kind": "equip", "category": "curio"}, "weight": 3},
					{"pick": {"kind": "rhune"}, "weight": 4},
				],
				"quality": {"magic": 3, "rare": 2.5, "unique": 2.5},
			},
			{
				"id": "gobbler",
				"name": "Coin-Gobbler",
				"picks": 8,
				"noDrop": 0,
				"entries": [
					{"pick": {"kind": "gold", "mult": 4}, "weight": 40},
					{"pick": {"kind": "potion"}, "weight": 8},
					{"pick": {"kind": "equip", "category": "weapon"}, "weight": 18},
					{"pick": {"kind": "equip", "category": "armor"}, "weight": 24},
					{"pick": {"kind": "equip", "category": "jewelry"}, "weight": 6},
					{"pick": {"kind": "equip", "category": "curio"}, "weight": 3},
					{"pick": {"kind": "rhune"}, "weight": 4},
				],
				"quality": {"magic": 2, "rare": 2, "unique": 2},
			},
			{
				"id": "well",
				"name": "Wishing Well",
				"picks": 1,
				"noDrop": 0,
				"entries": [
					{"pick": {"kind": "equip", "category": "weapon"}, "weight": 24},
					{"pick": {"kind": "equip", "category": "armor"}, "weight": 30},
					{"pick": {"kind": "equip", "category": "jewelry"}, "weight": 9},
					{"pick": {"kind": "equip", "category": "curio"}, "weight": 5},
					{"pick": {"kind": "rhune"}, "weight": 5},
					{"pick": {"kind": "potion"}, "weight": 10},
					{"pick": {"kind": "gold", "mult": 0.5}, "weight": 10},
				],
				"quality": {"magic": 1.6, "rare": 1.2, "unique": 1.2},
			},
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
