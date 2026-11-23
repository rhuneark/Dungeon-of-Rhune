class_name Npcs
## The people of Thornwick: a town that has lived the same night for longer
## than anyone can count. Somewhere under the Sealed Stair an hourglass has
## stopped; conquer floor 100 and the sand runs again. Until then, everyone
## helps however they can: identifying, the flask, the forge, trade, luck.
## Services: identify, codex, flask, smith, trade, gamble, descend.
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
				"greeting": ["Bring me everything that hums. I read it for nothing. What else would I spend the night on?", "Another night, another descent. Show me what you found."],
				"chatter": [
					"Every rhune is a word. I have spent this one night learning to pronounce eleven of them. Several thousand times.",
					"Unidentified, it is a mystery. Identified, it is usually a disappointment. That is scholarship.",
					"The Stair goes down a hundred floors. I counted. I had time.",
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
					"The flask refills itself. Don't ask me how; ask the hourglass, when you find it.",
					"Bring me back from deeper down and I'll brew it stronger. Floor twenty. Floor fifty. I've done it before. You don't remember.",
				],
			},
			{
				"id": "brannoc",
				"name": "Brannoc",
				"title": "Smith",
				"sprite": "npc_smith",
				"services": ["smith"],
				"greeting": ["Hammer's hot. Always is. It never gets the chance to cool.", "Plain gear with empty holes is worth more than you think. Ask me why."],
				"chatter": [
					"Three of the same rhune in my crucible and you get the next one up. Don't ask how. I don't know how.",
					"Magic items can't take a Rhuneword. Too much talking already.",
					"I've forged the same horseshoe four thousand times. It's a very good horseshoe.",
				],
			},
			{
				"id": "pell",
				"name": "Pell Quickcoin",
				"title": "Trader",
				"sprite": "npc_trader",
				"services": ["trade"],
				"greeting": ["Buying, selling, browsing? My stock changes every time the night does. Which is always.", "Everything has a price. Most of it is reasonable."],
				"chatter": [
					"I'll buy anything you drag up the Stair. Varn reads it for free, so read it first.",
					"Gold is the only thing that still adds up in this town.",
				],
			},
			{
				"id": "odo",
				"name": "\"Lucky\" Odo",
				"title": "Purveyor of Sealed Goods",
				"sprite": "npc_gambler",
				"services": ["gamble"],
				"greeting": ["Sealed goods! Could be anything! Legally, it's mostly something!", "Feeling lucky? I am. Same luck every night."],
				"chatter": ["One in a hundred is legendary. Or one in fifty. I lose count. Then the night resets and I count again."],
			},
			{
				"id": "maren",
				"name": "Captain Maren",
				"title": "Warden of the Stair",
				"sprite": "npc_captain",
				"services": ["descend"],
				"greeting": ["You're going down again. Good. Someone has to.", "Floor one, or where you left off? Every fifth floor, the way back down remembers you."],
				"chatter": [
					"Every room down there seals until it's empty. Empty it. Then the chest. Then the next stair.",
					"Every tenth floor something guards the way. It has an hourglass where its heart should be.",
				],
			},
		]
	return _all


static func get_npc(id: String) -> Dictionary:
	for n in all():
		if n.id == id:
			return n
	return {}
