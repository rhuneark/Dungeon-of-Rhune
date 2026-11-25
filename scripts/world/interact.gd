class_name Interact
## What happens when the player uses something in the world. The zone only
## reports WHAT was clicked; this decides which panel or dialog opens.

const SERVICE_PANEL := {"trade": "vendor", "gamble": "gamble", "smith": "smith"}


static func _say(title: String, line: String, sub := "", buttons: Array = []) -> void:
	Game.set_ui({"dialog": {"npcId": "", "title": title, "sub": sub, "line": line, "notes": [], "buttons": buttons}, "left": ""})


static func talk_to(npc_id: String) -> void:
	var def := Npcs.get_npc(npc_id)
	if def.is_empty():
		return
	var hero := Game.hero()
	var met_key := "met:%s" % npc_id
	var first: bool = not hero.flags.has(met_key)
	hero.flags[met_key] = 1
	var line: String
	if first:
		line = def.greeting[0]
	elif randf() < 0.3:
		line = def.greeting.pick_random()
	else:
		line = def.chatter.pick_random()
	Game.set_ui({"dialog": {"npcId": npc_id, "title": def.name, "sub": def.title, "line": line, "notes": []}, "left": "", "right": ""})
	Game.commit()


## Dialog service buttons.
static func npc_service(npc_id: String, service: String) -> void:
	if SERVICE_PANEL.has(service):
		Game.set_ui({"dialog": {}, "left": SERVICE_PANEL[service], "right": "inventory", "service_npc": npc_id})
		return
	var def := Npcs.get_npc(npc_id)
	match service:
		"codex":
			Game.set_ui({"dialog": {}, "left": "codex", "right": ""})
		"identify":
			var n := Actions.identify_all()
			var line := "Ah. Let me see... (%d item%s identified.)" % [n, "" if n == 1 else "s"] if n > 0 else "You have nothing I haven't already read."
			Game.set_ui({"dialog": {"npcId": npc_id, "title": def.name, "sub": def.title, "line": line, "notes": []}})
		"flask":
			var fl: Dictionary = Game.sheet().flask
			Game.hero().life = Game.sheet().life
			Game.reset_flask()
			var notes := ["Your %s: restores %d life, refills in %ss." % [fl.name, int(fl.heal), UiKit.fmt_num(snappedf(fl.cooldown, 0.1))]]
			if int(fl.tier) < CharacterSheet.FLASK_TIERS.size() - 1:
				var nxt: Dictionary = CharacterSheet.FLASK_TIERS[int(fl.tier) + 1]
				notes.append("Finish a Tier %d expedition and I'll brew you a %s." % [int(nxt.tier), nxt.name])
			Game.set_ui({"dialog": {"npcId": npc_id, "title": def.name, "sub": def.title, "line": "There. Full, and you're patched up. Off you go.", "notes": notes}})
			Game.commit()
		"expedition":
			expedition_dialog(def.name, def.title)


## The map table: continue the expedition in progress, or chart a new one.
static func expedition_dialog(title := "The Map Table", sub := "") -> void:
	var hero := Game.hero()
	var buttons: Array = []
	var line: String
	if Expedition.active(hero):
		var e: Dictionary = hero.expedition
		line = "Tier %d, %d of %d rooms cleared, Threat %d. The way on is marked." % [int(e.tier), int(e.rooms), Expeditions.STEPS + 1, int(e.threat)]
		buttons.append({"text": "Open the map", "action": func(): Game.set_ui({"overlay": "map", "dialog": {}})})
		buttons.append({"text": "Abandon it", "action": func():
			Game.abandon_expedition()
			_say(title, "Burned. Boons and afflictions with it. Chart a fresh one when you're ready.", sub)})
	else:
		var top := Expedition.max_tier(hero)
		line = "Six rooms and a Warden's vault, your path through them. Greedy rooms pay double and bring afflictions; every affliction raises Threat, and Threat raises the loot. Which tier?"
		var tiers: Array = []
		for t in [top, top - 1, top - 2, 1]:
			if t >= 1 and not t in tiers:
				tiers.append(t)
		for t in tiers:
			var tier: int = t
			buttons.append({"text": "Tier %d%s" % [tier, " (new)" if tier == top and tier > int(hero.get("bestTier", 0)) else ""],
				"action": func(): Game.start_expedition(tier)})
	_say(title, line, sub, buttons)


static func on_world_interact(t: Dictionary) -> void:
	match t.kind:
		"npc":
			talk_to(t.id)
		"prop":
			match t.action:
				"stash":
					Game.set_ui({"left": "stash", "right": "inventory", "dialog": {}})
				"stair", "map":
					expedition_dialog()
				"statue":
					Game.toast(t.name)
				"chest":
					if Arena.current:
						Arena.current.open_chest()
				"exit":
					if Arena.current:
						Arena.current.take_exit()
				"portal":
					Game.return_to_refuge()
