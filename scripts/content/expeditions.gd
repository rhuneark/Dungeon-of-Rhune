class_name Expeditions
## Expedition data: the rooms of the Deep, the boons they grant, the
## afflictions greedy rooms bring with them, and how both combine. Rules live
## in scripts/systems/expedition.gd; this file is only numbers and words.
##
## An expedition is a branching map: STEPS rooms, then the Warden's vault.
## Every room grants its boon for the rest of the expedition. A greedy room
## grants it twice over but adds an affliction, and every affliction raises
## Threat, which feeds the loot (THREAT_*). Boons and afflictions stack, and
## some pairs combine (SYNERGIES for boons, DREADS for afflictions).
##
## Stats in `stats` are hero stat ids (scripts/content/stats.gd); monster mods
## are: monsterLife, monsterDamage, monsterCount, monsterSpeed (all %),
## champions (+% champion chance), extraWaves, fireShare / coldShare (% of a
## monster's damage added as fire / cold), championLife (%).

## Rooms before the vault, and how many choices per step (2-3).
const STEPS := 6
## Each step of a tier adds a level; a tier starts TIER_LEVELS above the last.
const TIER_LEVELS := 4
## Per point of Threat, for the rest of the expedition.
const THREAT_RARITY := 6.0
const THREAT_QUANTITY := 4.0
const THREAT_XP := 3.0
## Chance that a (non-vault) room is greedy.
const GREED_CHANCE := 0.4

## Room types. boon: what clearing it grants; icon: item icon for the map;
## color: the room's light and sigil tint; wall/props: theme dressing
## (arena_builder.gd); chest: extra treasure-class seek for its chest.
const ROOMS := {
	"rhune_sanctum": {
		"name": "Rhune Sanctum", "boon": "rhune_resonance", "icon": "rhune_ash", "color": "#6fd6ff", "weight": 8,
		"wall": ["wall_sigil"], "props": ["rune_stone"], "chest": {"rhune": 300},
		"desc": "Walls of glowing rhunes. Its chest is heavy with rhunes.",
	},
	"statue_hall": {
		"name": "Statue Hall", "boon": "stone_vigil", "icon": "helm", "color": "#b1b3b2", "weight": 10,
		"wall": ["wall_banner"], "props": ["statue"], "chest": {"armor": 150},
		"desc": "Stone knights keep watch. Its chest favours armor.",
	},
	"armory": {
		"name": "Armory", "boon": "arsenal", "icon": "buckler", "color": "#e86a2a", "weight": 10,
		"wall": ["wall_shield"], "props": ["weapon_rack"], "chest": {"weapon": 150},
		"desc": "Racks of old steel. Its chest favours weapons.",
	},
	"reliquary": {
		"name": "Reliquary", "boon": "relics", "icon": "amulet_a", "color": "#d1ab55", "weight": 8,
		"wall": ["wall_shelf"], "props": ["reliquary"], "chest": {"jewelry": 200},
		"desc": "Relics behind glass. Its chest favours rings and amulets.",
	},
	"curio_den": {
		"name": "Curio Den", "boon": "trinkets", "icon": "curio_s_a", "color": "#5d4569", "weight": 7,
		"wall": ["wall_shelf"], "props": ["reliquary"], "chest": {"curio": 250},
		"desc": "Shelves of odd trinkets. Its chest favours charms.",
	},
	"treasury": {
		"name": "Treasury", "boon": "midas", "icon": "gold", "color": "#ffd98a", "weight": 8,
		"wall": ["wall_banner"], "props": ["gold_pile"], "chest": {},
		"desc": "Spilled coin everywhere. More gold for the rest of the expedition.",
	},
	"ossuary": {
		"name": "Ossuary", "boon": "lessons", "icon": "tome", "color": "#d8ccae", "weight": 7,
		"wall": ["wall_skulls"], "props": ["skull_pile"], "chest": {},
		"desc": "Bones stacked to the ceiling. The dead teach: more experience.",
	},
	"chapel": {
		"name": "Drowned Chapel", "boon": "blessing", "icon": "potion_red", "color": "#c6f4ff", "weight": 7,
		"wall": ["wall_banner"], "props": ["altar"], "chest": {},
		"desc": "A cold altar still answers. More life.",
	},
	"war_room": {
		"name": "War Room", "boon": "whetstone", "icon": "gauntlets", "color": "#b8361e", "weight": 7,
		"wall": ["wall_shield", "wall_banner"], "props": ["weapon_rack"], "chest": {"weapon": 50},
		"desc": "Maps of battles nobody won. More damage.",
	},
	"fortune_vault": {
		"name": "Fortune Vault", "boon": "fortune", "icon": "key", "color": "#d1ab55", "weight": 4, "greedy": true, "afflictions": 2,
		"wall": ["wall_shelf", "wall_banner"], "props": ["gold_pile", "dungeon_chest"], "chest": {"unique": 100},
		"desc": "Greedy by nature: always two afflictions. Big Rarity Find.",
	},
	"sanctuary": {
		"name": "Sanctuary", "boon": "respite", "icon": "potion_blue", "color": "#6fd6ff", "weight": 4, "calm": true,
		"wall": ["wall_banner"], "props": ["holy_basin"], "chest": {},
		"desc": "No monsters. Lifts your newest affliction and lowers Threat.",
	},
	"warden_vault": {
		"name": "Warden's Vault", "boon": "", "icon": "rhune_omen", "color": "#e86a2a", "weight": 0, "boss": true,
		"wall": ["wall_sigil", "wall_banner"], "props": [], "chest": {},
		"desc": "An Hourglass Warden. Beat it to finish the expedition and open the next tier.",
	},
}

## Boons: granted by rooms, stacking (greedy rooms grant 2 stacks).
const BOONS := {
	"rhune_resonance": {"name": "Rhune Resonance", "stats": {"seek:rhune": 75}},
	"stone_vigil": {"name": "Stone Vigil", "stats": {"seek:armor": 50, "armorPct": 10}},
	"arsenal": {"name": "Arsenal", "stats": {"seek:weapon": 50}},
	"relics": {"name": "Gilded Relics", "stats": {"seek:jewelry": 60}},
	"trinkets": {"name": "Trinket Hoard", "stats": {"seek:curio": 70}},
	"midas": {"name": "Coin of the Deep", "stats": {"findGold": 60}},
	"lessons": {"name": "Lessons of the Dead", "stats": {"xpGain": 15}},
	"blessing": {"name": "Cold Blessing", "stats": {"lifePct": 10}},
	"whetstone": {"name": "Whetstone", "stats": {"dmgPctAll": 12}},
	"fortune": {"name": "Fortune's Favour", "stats": {"findRarity": 40}},
	"respite": {"name": "Respite", "stats": {}},
}

## Afflictions: what greedy rooms bring along, stacking. threat feeds the loot.
const AFFLICTIONS := {
	"hardened": {"name": "Hardened", "desc": "Monsters have +20% life", "threat": 1, "weight": 10, "mods": {"monsterLife": 20}},
	"savage": {"name": "Savage", "desc": "Monsters deal +15% damage", "threat": 1, "weight": 10, "mods": {"monsterDamage": 15}},
	"swarming": {"name": "Swarming", "desc": "+25% monsters per wave", "threat": 1, "weight": 9, "mods": {"monsterCount": 25}},
	"rallied": {"name": "Rallied", "desc": "+10% champion chance", "threat": 1, "weight": 8, "mods": {"champions": 10}},
	"embers": {"name": "Embers", "desc": "Monsters add 25% of their damage as fire", "threat": 1, "weight": 8, "mods": {"fireShare": 25}},
	"frostbite": {"name": "Frostbite", "desc": "Monsters add 25% of their damage as cold", "threat": 1, "weight": 8, "mods": {"coldShare": 25}},
	"withering": {"name": "Withering", "desc": "Your flask refills 25% slower", "threat": 1, "weight": 7, "hero": {"flaskRecovery": -25}},
	"exposed": {"name": "Exposed", "desc": "-15 to all your resistances", "threat": 1, "weight": 7, "hero": {"resAll": -15}},
	"hasted": {"name": "Hasted", "desc": "Monsters move and attack 15% faster", "threat": 2, "weight": 5, "mods": {"monsterSpeed": 15}},
	"relentless": {"name": "Relentless", "desc": "One more wave in every room", "threat": 2, "weight": 5, "mods": {"extraWaves": 1}},
}

## Boon synergies. all: every listed boon held; any_of + count: that many
## different listed boons held; stacks: one boon at that many stacks.
const SYNERGIES := [
	{"id": "prospector", "name": "Prospector", "desc": "3 different Find boons: +25% Item Quantity",
		"any_of": ["rhune_resonance", "stone_vigil", "arsenal", "relics", "trinkets"], "count": 3, "stats": {"findQuantity": 25}},
	{"id": "midas_touch", "name": "Midas Touch", "desc": "Coin of the Deep + Fortune's Favour: +20% Rarity Find",
		"all": ["midas", "fortune"], "stats": {"findRarity": 20}},
	{"id": "war_chant", "name": "War Chant", "desc": "Whetstone + Cold Blessing: +10% Attack Speed",
		"all": ["whetstone", "blessing"], "stats": {"attackSpeed": 10}},
	{"id": "grave_scholar", "name": "Grave Scholar", "desc": "Lessons of the Dead x3: +2 to all attributes",
		"stacks": {"lessons": 3}, "stats": {"allAttr": 2}},
	{"id": "rhune_chorus", "name": "Rhune Chorus", "desc": "Rhune Resonance x3: +50% more Rhune Find",
		"stacks": {"rhune_resonance": 3}, "stats": {"seek:rhune": 50}},
]

## Affliction synergies: worse together.
const DREADS := [
	{"id": "wildfire", "name": "Wildfire", "desc": "Embers + Exposed: fire share doubled",
		"all": ["embers", "exposed"], "mods": {"fireShare": 25}},
	{"id": "the_horde", "name": "The Horde", "desc": "Swarming + Relentless: monsters +10% faster",
		"all": ["swarming", "relentless"], "mods": {"monsterSpeed": 10}},
	{"id": "ironclad", "name": "Ironclad", "desc": "Hardened x3: champions +50% life",
		"stacks": {"hardened": 3}, "mods": {"championLife": 50}},
	{"id": "deep_frost", "name": "Deep Frost", "desc": "Frostbite + Withering: flask 25% slower again",
		"all": ["frostbite", "withering"], "hero": {"flaskRecovery": -25}},
]


static func room(id: String) -> Dictionary:
	return ROOMS.get(id, {})
