class_name QuestRules
## Lore-quest runtime: start, progress (via emit), complete, reward.


## Special start/reward item ids that aren't plain bases:
## "socketed_sword" (a plain 2-socket Short Sword) and "unique:<id>".
static func make_quest_item(id: String, ilvl: int) -> Dictionary:
	if id == "socketed_sword":
		var it := ItemGen.create_item("short_sword", {"ilvl": ilvl, "quality": "normal"})
		it.sockets = 2
		return it
	if id.begins_with("unique:"):
		var u := Uniques.get_unique(id.substr(7))
		if not u.is_empty():
			return ItemGen.create_item(u.baseId, {"ilvl": maxi(ilvl, u.qlvl), "quality": "unique", "uniqueId": u.id, "identified": true})
	return ItemGen.create_item(id, {"ilvl": ilvl})


static func give_item(hero: Dictionary, item: Dictionary) -> void:
	if not Grid.auto_place(Grid.make(HeroData.INV_W, HeroData.INV_H, hero.inventory), item):
		Game.spawn_drops([{"kind": "item", "item": item}], "player")
		Game.toast("No room — it’s on the ground.", "#e0b060")


static func start_quest(hero: Dictionary, q: Dictionary) -> void:
	if hero.quests.has(q.id):
		return
	hero.quests[q.id] = {"state": "active", "progress": {}}
	for id in q.get("startItems", []):
		give_item(hero, make_quest_item(id, hero.level))
	Game.toast("New lore quest: " + q.title, "#d9b26a")


static func start_auto_quests(hero: Dictionary) -> void:
	for q in QuestDefs.all():
		if q.get("autoStart", false) and not hero.quests.has(q.id):
			start_quest(hero, q)


static func _is_done(hero: Dictionary, qid: String) -> bool:
	return hero.quests.has(qid) and hero.quests[qid].state == "done"


## Quests this NPC can hand out right now (prereqs done, not started).
static func available_from(hero: Dictionary, npc_id: String) -> Array:
	var out: Array = []
	for q in QuestDefs.all():
		if q.giver != npc_id or hero.quests.has(q.id):
			continue
		var ok := true
		for a in q.get("after", []):
			if not _is_done(hero, a):
				ok = false
				break
		if ok:
			out.append(q)
	return out


static func is_complete(hero: Dictionary, q: Dictionary) -> bool:
	if not hero.quests.has(q.id):
		return false
	var st: Dictionary = hero.quests[q.id]
	for o in q.objectives:
		if int(st.progress.get(o.id, 0)) < o.count:
			return false
	return true


static func _complete(hero: Dictionary, q: Dictionary) -> void:
	var st: Dictionary = hero.quests[q.id]
	st.state = "done"
	var r: Dictionary = q.reward
	var parts: Array = []
	if r.get("gold", 0):
		hero.gold += r.gold
		parts.append("%d gold" % r.gold)
	if r.get("pathPoints", 0):
		hero.pathPoints += r.pathPoints
		parts.append("%d Path Point%s" % [r.pathPoints, "s" if r.pathPoints > 1 else ""])
	for id in r.get("items", []):
		give_item(hero, make_quest_item(id, hero.level))
	for l in r.get("lore", []):
		if not l in hero.lore:
			hero.lore.append(l)
			var le := Lore.get_lore(l)
			parts.append("lore: " + (le.title if not le.is_empty() else l))
	Game.toast("Quest complete: " + q.title, "#f3d34a")
	if not parts.is_empty():
		Game.toast("Reward: " + ", ".join(parts), "#d9b26a")
	if r.get("xp", 0):
		Progression.gain_xp(hero, r.xp)


## Report a gameplay event; progresses every matching active objective.
## Events: talk, inspect, honk, wish, gamble, socket, rhuneword, identify, pickup.
static func emit(event: String, target := "", amount := 1) -> void:
	if not Game.has_hero():
		return
	var hero := Game.hero()
	var changed := false
	for qid in hero.quests.keys():
		var st: Dictionary = hero.quests[qid]
		if st.state != "active":
			continue
		var q := QuestDefs.get_quest(qid)
		if q.is_empty():
			continue
		for o in q.objectives:
			if o.event != event:
				continue
			if o.get("target", "") != "" and o.target != target:
				continue
			var cur := int(st.progress.get(o.id, 0))
			if cur >= o.count:
				continue
			st.progress[o.id] = mini(o.count, cur + amount)
			changed = true
		if is_complete(hero, q):
			_complete(hero, q)
	if changed:
		Game.commit()
