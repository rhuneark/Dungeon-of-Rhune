class_name Interact
## What happens when the player uses something in the world. The zone only
## reports WHAT was clicked; this decides which panel or dialog opens and
## which quest events fire.

const SERVICE_PANEL := {"trade": "vendor", "herbs": "herbs", "gamble": "gamble", "smith": "smith"}


static func _say(title: String, line: String, sub := "") -> void:
	Game.set_ui({"dialog": {"npcId": "", "title": title, "sub": sub, "line": line, "notes": []}, "left": ""})


static func talk_to(npc_id: String) -> void:
	var def := Npcs.get_npc(npc_id)
	if def.is_empty():
		return
	var hero := Game.hero()
	var met_key := "met:%s" % npc_id
	var first: bool = not hero.flags.has(met_key)
	hero.flags[met_key] = 1
	QuestRules.emit("talk", npc_id)
	var notes: Array = []
	for q in QuestRules.available_from(hero, npc_id):
		QuestRules.start_quest(hero, q)
		notes.append("New lore quest: %s — %s" % [q.title, q.summary])
	for qid in hero.quests:
		var q := QuestDefs.get_quest(qid)
		if not q.is_empty() and q.giver == npc_id and hero.quests[qid].state == "active":
			var already := false
			for n in notes:
				if q.title in n:
					already = true
			if not already:
				notes.append("%s: %s" % [q.title, q.summary])
	var line: String
	if first:
		line = def.greeting[0]
	elif randf() < 0.3:
		line = def.greeting.pick_random()
	else:
		line = def.chatter.pick_random()
	Game.set_ui({"dialog": {"npcId": npc_id, "title": def.name, "sub": def.title, "line": line, "notes": notes}, "left": "", "right": ""})
	Game.commit()


## Dialog service buttons.
static func npc_service(npc_id: String, service: String) -> void:
	if SERVICE_PANEL.has(service):
		Game.set_ui({"dialog": {}, "left": SERVICE_PANEL[service], "right": "inventory", "service_npc": npc_id})
		return
	match service:
		"codex":
			Game.set_ui({"dialog": {}, "left": "codex", "right": ""})
		"identify":
			var n := Actions.identify_all()
			var line := "Ah. Let me see... (%d item%s identified.)" % [n, "" if n == 1 else "s"] if n > 0 else "You have nothing I haven't already read."
			Game.set_ui({"dialog": {"npcId": npc_id, "title": "Old Varn", "sub": "Lorekeeper", "line": line, "notes": []}})
		"gate":
			Game.set_ui({"dialog": {"npcId": npc_id, "title": "Captain Maren", "sub": "Gate Captain",
				"line": "The Wilds open when the scouts return. Spend the time well: gear up, read up, and stay away from the goose.",
				"notes": ["(The Wilds, monsters and the first descent into the Pit arrive in the next build.)"]}})


static func on_world_interact(t: Dictionary) -> void:
	var hero := Game.hero()
	match t.kind:
		"npc":
			talk_to(t.id)
		"critter":
			hero.flags["honks"] = int(hero.flags.get("honks", 0)) + 1
			var lines := ["HONK!", "HONK.", "HONK?!", "hiss", "HONK!!", "...honk", "HONK HONK"]
			Game.float_text(lines[(int(hero.flags.honks) - 1) % lines.size()], "#ffffff")
			QuestRules.emit("honk")
			Game.commit()
		"prop":
			match t.action:
				"stash":
					Game.set_ui({"left": "stash", "right": "inventory", "dialog": {}})
				"well":
					Game.set_ui({"left": "well", "right": "inventory", "dialog": {}})
				"quests":
					Game.set_ui({"left": "quests", "dialog": {}})
				"inspect":
					QuestRules.emit("inspect", "pit_entrance")
					_say("The Sealed Stair", "Stone steps vanish into a dark that seems to breathe. The runes on the broken pillars pulse, faintly, in time with something far below. The chains are cold. Someone has scratched a tally into the top step: 41.")
				"waypoint":
					_say("Rhunestone Circle", "The standing stones hum when you step between them. Varn says they once linked every Rhunewright outpost. Only this one still answers. (Waypoints arrive with the Wilds.)")
				"statue":
					if String(t.name).begins_with("Statue"):
						_say("Aldra Thornwick", "\"She held the gate for nine days with a lantern and a bad temper. The town took her name. The goose took her hat.\" — inscription")
					else:
						Game.toast(t.name)
				"gate":
					_say("South Gate", "Barred, chained and guarded. Beyond it the Rhunewild waits. Captain Maren has the key and no intention of using it yet.")
