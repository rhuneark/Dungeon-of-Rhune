class_name QuestDefs
## Lore quests: small, optional, self-contained. No main story: each quest is
## a reason to poke at a corner of the world, and pays in Path Points, XP,
## items and lore. Objective events are fired via QuestRules.emit().
##
## Events: talk (target = npc id), inspect (object id), honk, wish, gamble,
##         socket, rhuneword, identify, pickup (target = base id).
## Quest: {id, title, giver, summary, objectives: [{id, text, event, target ("" any), count}],
##         reward: {xp, gold, pathPoints, lore, items (base ids or "unique:<id>")},
##         startItems, after (quest ids), autoStart}

static var _all: Array = []


static func all() -> Array:
	if _all.is_empty():
		_all = [
			{
				"id": "newcomer",
				"title": "A Stranger in Thornwick",
				"giver": "varn",
				"autoStart": true,
				"summary": "Old Varn suggests you introduce yourself. \"People here trust a face before they trust a sword.\"",
				"objectives": [
					{"id": "brannoc", "text": "Meet Brannoc the smith", "event": "talk", "target": "brannoc", "count": 1},
					{"id": "ysolde", "text": "Meet Mother Ysolde", "event": "talk", "target": "ysolde", "count": 1},
					{"id": "pell", "text": "Meet Pell Quickcoin", "event": "talk", "target": "pell", "count": 1},
					{"id": "odo", "text": "Meet \"Lucky\" Odo", "event": "talk", "target": "odo", "count": 1},
					{"id": "maren", "text": "Meet Captain Maren", "event": "talk", "target": "maren", "count": 1},
				],
				"reward": {"xp": 400, "pathPoints": 1, "lore": ["thornwick"], "gold": 0, "items": []},
				"startItems": [],
				"after": [],
			},
			{
				"id": "sealed_stair",
				"title": "The Sealed Stair",
				"giver": "varn",
				"after": ["newcomer"],
				"summary": "Varn wants a fresh pair of eyes on the Sealed Stair at the north end of town. \"Look. Do not touch.\"",
				"objectives": [{"id": "look", "text": "Inspect the Sealed Stair", "event": "inspect", "target": "pit_entrance", "count": 1}],
				"reward": {"xp": 250, "lore": ["the_pit", "rhunewrights"], "gold": 0, "pathPoints": 0, "items": []},
				"startItems": [],
				"autoStart": false,
			},
			{
				"id": "second_opinion",
				"title": "A Second Opinion",
				"giver": "varn",
				"autoStart": true,
				"summary": "Magic things come out of the ground unnamed. Varn can read them. \"Bring me anything that hums.\"",
				"objectives": [{"id": "id", "text": "Have an item identified", "event": "identify", "count": 1, "target": ""}],
				"reward": {"xp": 150, "items": ["scroll_identify", "scroll_identify"], "gold": 0, "pathPoints": 0, "lore": []},
				"startItems": [],
				"after": [],
			},
			{
				"id": "literacy",
				"title": "Rhunic Literacy",
				"giver": "brannoc",
				"autoStart": true,
				"summary": "Brannoc hands you two rhunes and a sword with two empty sockets. \"Ember, then Ash. In that order. Go on.\"",
				"startItems": ["rhune_ember", "rhune_ash", "socketed_sword"],
				"objectives": [
					{"id": "socket", "text": "Socket a rhune into an item", "event": "socket", "count": 1, "target": ""},
					{"id": "word", "text": "Speak a Rhuneword", "event": "rhuneword", "count": 1, "target": ""},
				],
				"reward": {"xp": 300, "pathPoints": 1, "lore": ["rhunes"], "gold": 0, "items": []},
				"after": [],
			},
			{
				"id": "goose_problem",
				"title": "The Goose Problem",
				"giver": "maren",
				"autoStart": true,
				"summary": "Captain Maren would like someone to \"have a word\" with the goose. \"It’s been on watch longer than me. It doesn’t salute.\"",
				"objectives": [{"id": "honk", "text": "Have a word with the goose", "event": "honk", "count": 7, "target": ""}],
				"reward": {"xp": 150, "items": ["old_key"], "lore": ["the_goose"], "gold": 0, "pathPoints": 0},
				"startItems": [],
				"after": [],
			},
			{
				"id": "coins_for_well",
				"title": "Coins for the Well",
				"giver": "ysolde",
				"autoStart": true,
				"summary": "Mother Ysolde says the well is hungry. \"Three coins, three wishes. Don’t look down.\"",
				"objectives": [{"id": "wish", "text": "Make wishes at the Wishing Well", "event": "wish", "count": 3, "target": ""}],
				"reward": {"xp": 200, "items": ["potion_health", "potion_health", "potion_mana"], "lore": ["the_well"], "gold": 0, "pathPoints": 0},
				"startItems": [],
				"after": [],
			},
			{
				"id": "odds_and_ends",
				"title": "Odds and Ends",
				"giver": "odo",
				"autoStart": true,
				"summary": "Odo swears his sealed goods are blessed. \"Two purchases. Trust me. I’ll even give you some coin back.\"",
				"objectives": [{"id": "gamble", "text": "Buy sealed goods from Odo", "event": "gamble", "count": 2, "target": ""}],
				"reward": {"xp": 150, "gold": 250, "lore": ["odo"], "pathPoints": 0, "items": []},
				"startItems": [],
				"after": [],
			},
			{
				"id": "pages",
				"title": "Pages of the Pit",
				"giver": "varn",
				"after": ["sealed_stair"],
				"summary": "Pages from a Rhunewright journal have been blowing around town for years. \"Find them. Bring them. Do not read them aloud.\"",
				"objectives": [{"id": "pages", "text": "Find Torn Pages around Thornwick", "event": "pickup", "target": "lore_page", "count": 3}],
				"reward": {"xp": 400, "pathPoints": 1, "lore": ["page_1", "page_2", "page_3"], "gold": 0, "items": []},
				"startItems": [],
				"autoStart": false,
			},
		]
	return _all


static func get_quest(id: String) -> Dictionary:
	for q in all():
		if q.id == id:
			return q
	return {}
