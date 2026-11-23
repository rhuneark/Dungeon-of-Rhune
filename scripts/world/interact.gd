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
				notes.append("Reach floor %d and I'll brew you a %s." % [int(nxt.floor), nxt.name])
			Game.set_ui({"dialog": {"npcId": npc_id, "title": def.name, "sub": def.title, "line": "There. Full, and you're patched up. Off you go.", "notes": notes}})
			Game.commit()
		"descend":
			descend_dialog(def.name, def.title)


## The descent picker: floor 1 and every 5th floor you've reached.
static func descend_dialog(title := "The Sealed Stair", sub := "") -> void:
	var buttons: Array = []
	for f in Game.checkpoints():
		var fl: int = f
		buttons.append({"text": "Floor %d" % fl, "action": func(): Game.enter_dungeon(fl)})
	var best := int(Game.hero().get("bestFloor", 0))
	var line := "A hundred floors down, an hourglass has stopped. Each room seals until it's empty. Where do you start?"
	if best > 0:
		line += " (Deepest so far: floor %d.)" % best
	_say(title, line, sub, buttons)


static func on_world_interact(t: Dictionary) -> void:
	match t.kind:
		"npc":
			talk_to(t.id)
		"prop":
			match t.action:
				"stash":
					Game.set_ui({"left": "stash", "right": "inventory", "dialog": {}})
				"stair":
					descend_dialog()
				"statue":
					if String(t.name).begins_with("Statue"):
						_say("Aldra Thornwick", "\"She held the gate for nine days with a lantern and a bad temper.\" The lantern is still lit. It has been lit for the same nine days, over and over.")
					else:
						Game.toast(t.name)
				"chest":
					if Arena.current:
						Arena.current.open_chest()
				"exit":
					if Arena.current:
						Arena.current.take_exit()
				"portal":
					Game.return_to_town()
