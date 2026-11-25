class_name Npcs
## The last of Thornwick, holed up in the Refuge: the undercroft beneath the
## chapel the town sank into. Below it lies the Deep, chambers that shuffle
## every night. Maren charts expeditions through it; each ends at a Warden's
## vault. Everyone helps however they can: identifying, the flask, the forge,
## trade, luck. Services: identify, codex, flask, smith, trade, gamble, expedition.
##
## Npc: {id, name, title, sprite (character sheet name), services, greeting, chatter}

static var _all: Array = []


static func all() -> Array:
	if _all.is_empty():
		_all = [
			{
				"id": "varn",
				"name": "Old Varn",
				"title": "Lorekeeper",
				"sprite": "npc_lore",
				"services": ["identify", "codex"],
				"greeting": ["Bring me everything that hums. I read it for nothing. What else would I do down here?", "Back from the Deep? Show me what you found."],
				"chatter": [
					"Every rhune is a word. I have learned to pronounce eleven of them. Down here there is time.",
					"Unidentified, it is a mystery. Identified, it is usually a disappointment. That is scholarship.",
					"Rhune Sanctums sing if you stand still. Clear one and the rhunes come easier for the rest of the expedition.",
				],
			},
			{
				"id": "ysolde",
				"name": "Mother Ysolde",
				"title": "Herbalist",
				"sprite": "npc_herbalist",
				"services": ["flask"],
				"greeting": ["Your flask. Give it here. No, don't smell it first.", "You're bleeding on my herbs again. Same blood as yesterday, I'd wager."],
				"chatter": [
					"The flask refills itself. Don't ask me how. Ask a Warden, if one ever talks.",
					"Finish a Tier 4 expedition and I'll brew it stronger. Tier 11, stronger still.",
				],
			},
			{
				"id": "brannoc",
				"name": "Brannoc",
				"title": "Smith",
				"sprite": "npc_smith",
				"services": ["smith"],
				"greeting": ["Hammer's hot. Down here it's the only warm thing.", "Plain gear with empty holes is worth more than you think. Ask me why."],
				"chatter": [
					"Three of the same rhune in my crucible and you get the next one up. Don't ask how. I don't know how.",
					"Magic items can't take a Rhuneword. Too much talking already.",
					"Armories down there are full of old steel. Bring me the good pieces, sell me the rest.",
				],
			},
			{
				"id": "pell",
				"name": "Pell Quickcoin",
				"title": "Trader",
				"sprite": "npc_trader",
				"services": ["trade"],
				"greeting": ["Buying, selling, browsing? My stock changes with every expedition you come back from.", "Everything has a price. Most of it is reasonable."],
				"chatter": [
					"I'll buy anything you drag up from the Deep. Varn reads it for free, so read it first.",
					"Treasuries down there spill coin. Greedy ones bite back. Price of business.",
				],
			},
			{
				"id": "odo",
				"name": "\"Lucky\" Odo",
				"title": "Purveyor of Sealed Goods",
				"sprite": "npc_gambler",
				"services": ["gamble"],
				"greeting": ["Sealed goods! Could be anything! Legally, it's mostly something!", "Feeling lucky? I am. Same luck every night."],
				"chatter": ["One in a hundred is legendary. Or one in fifty. I lose count."],
			},
			{
				"id": "maren",
				"name": "Captain Maren",
				"title": "Cartographer of the Deep",
				"sprite": "npc_captain",
				"services": ["expedition"],
				"greeting": ["The Deep shifted again last night. I have a fresh map. Pick your way.", "Greedy rooms pay better and bite harder. Choose your path like you mean it."],
				"chatter": [
					"Every room seals until it's empty. Empty it, take the chest, then pick the next room on the map.",
					"Stack too many afflictions and the vault will eat you. Take too few risks and you'll come back with junk.",
					"A Sanctuary lifts your newest affliction. Worth a detour when the map turns ugly.",
					"Beat a Warden and I can chart you a harder tier. Harder tiers, better loot.",
				],
			},
		]
	return _all


static func get_npc(id: String) -> Dictionary:
	for n in all():
		if n.id == id:
			return n
	return {}
