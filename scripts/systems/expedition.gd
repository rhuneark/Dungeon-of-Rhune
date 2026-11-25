class_name Expedition
## Expedition rules (data: scripts/content/expeditions.gd). The state is plain
## JSON on the hero (hero.expedition; {} = none):
##   {tier, seed, nodes: {id: Node}, edges: {id: [ids]}, at: id ("start" before
##    the first room), cleared: [ids], boons: {id: stacks},
##    afflictions: {id: stacks}, taken: [affliction ids, oldest first],
##    threat, rooms: n cleared, done: bool}
##   Node: {id, step (1..STEPS, vault = STEPS + 1), lane (0..2, may be .5),
##          type (Expeditions.ROOMS key), greedy, stacks, afflictions: [ids], threat}
## A room you walked out of before clearing (portal, death aside) is entered
## again; once cleared, you pick one of the rooms its edges lead to.

const START := "start"
const VAULT := "vault"


## Monster level of a room: each tier starts TIER_LEVELS deeper, each step +1.
static func level_of(tier: int, step: int) -> int:
	return 1 + (tier - 1) * Expeditions.TIER_LEVELS + maxi(0, step - 1)


## Highest tier this hero may chart (one past the best finished).
static func max_tier(hero: Dictionary) -> int:
	return int(hero.get("bestTier", 0)) + 1


static func active(hero: Dictionary) -> bool:
	var e = hero.get("expedition", {})
	return e is Dictionary and not e.is_empty() and not e.get("done", false)


# ------------------------------------------------------------- the map
static func generate(tier: int, seed_value: int) -> Dictionary:
	var rng := Rng.new(seed_value)
	var nodes := {}
	var edges := {START: []}
	var prev: Array = [START]
	var sanctuaries := 0
	var vaults := 0
	for step in range(1, Expeditions.STEPS + 1):
		var count := 3 if step == 1 or rng.chance(0.55) else 2
		var lanes: Array = [0.0, 1.0, 2.0] if count == 3 else [0.5, 1.5]
		var used: Array = []
		var ids: Array = []
		for lane in lanes:
			var type := _pick_type(rng, step, used, sanctuaries, vaults)
			used.append(type)
			if type == "sanctuary":
				sanctuaries += 1
			if type == "fortune_vault":
				vaults += 1
			var id := "%d-%d" % [step, ids.size()]
			nodes[id] = _make_node(rng, id, step, lane, type)
			ids.append(id)
			edges[id] = []
		# Link the previous step to this one by lane: neighbours always,
		# one-lane jumps sometimes, so the paths branch and rejoin.
		for p in prev:
			for id in ids:
				if p == START:
					edges[p].append(id)
					continue
				var dl := absf(float(nodes[p].lane) - float(nodes[id].lane))
				if dl <= 0.5 or (dl <= 1.0 and rng.chance(0.35)):
					edges[p].append(id)
			if edges[p].is_empty():
				edges[p].append(_nearest(nodes, ids, float(nodes[p].lane)))
		for id in ids:
			var reached := false
			for p in prev:
				if id in edges[p]:
					reached = true
			if not reached:
				var p0: String = prev[0]
				var best_d := 99.0
				for p in prev:
					var d := absf(float(nodes[p].lane) - float(nodes[id].lane))
					if d < best_d:
						best_d = d
						p0 = p
				edges[p0].append(id)
		prev = ids
	nodes[VAULT] = {"id": VAULT, "step": Expeditions.STEPS + 1, "lane": 1.0, "type": "warden_vault",
		"greedy": false, "stacks": 0, "afflictions": [], "threat": 0}
	for p in prev:
		edges[p] = [VAULT]
	edges[VAULT] = []
	return {
		"tier": tier, "seed": seed_value, "nodes": nodes, "edges": edges, "at": START, "cleared": [],
		"boons": {}, "afflictions": {}, "taken": [], "threat": 0, "rooms": 0, "done": false,
	}


static func _nearest(nodes: Dictionary, ids: Array, lane: float) -> String:
	var best: String = ids[0]
	for id in ids:
		if absf(float(nodes[id].lane) - lane) < absf(float(nodes[best].lane) - lane):
			best = id
	return best


static func _pick_type(rng: Rng, step: int, used: Array, sanctuaries: int, vaults: int) -> String:
	var ids: Array = []
	var weights: Array = []
	for id in Expeditions.ROOMS:
		var r: Dictionary = Expeditions.ROOMS[id]
		if r.get("boss", false) or id in used:
			continue
		if id == "sanctuary" and (step == 1 or sanctuaries >= 1):
			continue
		if id == "fortune_vault" and (step == 1 or vaults >= 1):
			continue
		ids.append(id)
		weights.append(float(r.weight))
	return ids[rng.weighted(weights)]


static func _make_node(rng: Rng, id: String, step: int, lane: float, type: String) -> Dictionary:
	var r: Dictionary = Expeditions.ROOMS[type]
	var greedy: bool = r.get("greedy", false) or (not r.get("calm", false) and step > 1 and rng.chance(Expeditions.GREED_CHANCE))
	var affl: Array = []
	if greedy:
		var want := int(r.get("afflictions", 1))
		while affl.size() < want:
			var ids: Array = []
			var weights: Array = []
			for a in Expeditions.AFFLICTIONS:
				if not a in affl:
					ids.append(a)
					weights.append(float(Expeditions.AFFLICTIONS[a].weight))
			affl.append(ids[rng.weighted(weights)])
	var threat := 0
	for a in affl:
		threat += int(Expeditions.AFFLICTIONS[a].threat)
	return {"id": id, "step": step, "lane": lane, "type": type, "greedy": greedy,
		"stacks": 2 if greedy else 1, "afflictions": affl, "threat": threat}


# -------------------------------------------------------- moving through it
static func node(e: Dictionary, id: String) -> Dictionary:
	return e.get("nodes", {}).get(id, {})


static func is_cleared(e: Dictionary, id: String) -> bool:
	return id in e.get("cleared", [])


## Rooms you may walk into now: the one you left unfinished, or the ones the
## last cleared room leads to.
static func options(e: Dictionary) -> Array:
	var at: String = e.get("at", START)
	if at != START and not is_cleared(e, at):
		return [at]
	return e.get("edges", {}).get(at, []).duplicate()


static func can_enter(e: Dictionary, id: String) -> bool:
	return id in options(e)


static func enter(e: Dictionary, id: String) -> String:
	if not can_enter(e, id):
		return "That way is not open."
	e.at = id
	return ""


## The room you're in is cleared: its boon (and afflictions) join the expedition.
static func complete(e: Dictionary) -> Dictionary:
	var id: String = e.get("at", START)
	var n := node(e, id)
	if n.is_empty() or is_cleared(e, id):
		return {}
	e.cleared.append(id)
	e.rooms = int(e.get("rooms", 0)) + 1
	var r: Dictionary = Expeditions.ROOMS[n.type]
	var lifted := ""
	if r.boon == "respite":
		# The Sanctuary lifts your newest affliction.
		if not e.taken.is_empty():
			lifted = e.taken.pop_back()
			e.afflictions[lifted] = int(e.afflictions[lifted]) - 1
			if int(e.afflictions[lifted]) <= 0:
				e.afflictions.erase(lifted)
			e.threat = maxi(0, int(e.threat) - int(Expeditions.AFFLICTIONS[lifted].threat))
	elif r.boon != "":
		e.boons[r.boon] = int(e.boons.get(r.boon, 0)) + int(n.stacks)
	for a in n.afflictions:
		e.afflictions[a] = int(e.afflictions.get(a, 0)) + 1
		e.taken.append(a)
	e.threat = int(e.threat) + int(n.threat)
	if r.get("boss", false):
		e.done = true
	return {"node": n, "lifted": lifted}


# ------------------------------------------------------- what it adds up to
static func _holds(rule: Dictionary, held: Dictionary) -> bool:
	if rule.has("all"):
		for id in rule.all:
			if int(held.get(id, 0)) <= 0:
				return false
	if rule.has("any_of"):
		var n := 0
		for id in rule.any_of:
			if int(held.get(id, 0)) > 0:
				n += 1
		if n < int(rule.count):
			return false
	if rule.has("stacks"):
		for id in rule.stacks:
			if int(held.get(id, 0)) < int(rule.stacks[id]):
				return false
	return true


static func synergies(e: Dictionary) -> Array:
	var out: Array = []
	for s in Expeditions.SYNERGIES:
		if _holds(s, e.get("boons", {})):
			out.append(s)
	return out


static func dreads(e: Dictionary) -> Array:
	var out: Array = []
	for s in Expeditions.DREADS:
		if _holds(s, e.get("afflictions", {})):
			out.append(s)
	return out


static func _add(out: Dictionary, stats: Dictionary, times := 1) -> void:
	for k in stats:
		out[k] = float(out.get(k, 0)) + float(stats[k]) * times


## Hero stats from the active expedition: boons, boon synergies, Threat's
## loot bonus, and the afflictions that hit the hero (flask, resistances).
static func hero_stats(hero: Dictionary) -> Dictionary:
	var e = hero.get("expedition", {})
	if not e is Dictionary or e.is_empty():
		return {}
	var out := {}
	for b in e.boons:
		_add(out, Expeditions.BOONS[b].stats, int(e.boons[b]))
	for s in synergies(e):
		_add(out, s.stats)
	for a in e.afflictions:
		_add(out, Expeditions.AFFLICTIONS[a].get("hero", {}), int(e.afflictions[a]))
	for d in dreads(e):
		_add(out, d.get("hero", {}))
	var threat := float(e.get("threat", 0))
	if threat > 0:
		_add(out, {"findRarity": threat * Expeditions.THREAT_RARITY, "findQuantity": threat * Expeditions.THREAT_QUANTITY, "xpGain": threat * Expeditions.THREAT_XP})
	return out


## Monster modifiers in force: afflictions (stacked) plus dreads.
static func monster_mods(e: Dictionary) -> Dictionary:
	var out := {}
	for a in e.get("afflictions", {}):
		_add(out, Expeditions.AFFLICTIONS[a].get("mods", {}), int(e.afflictions[a]))
	for d in dreads(e):
		_add(out, d.get("mods", {}))
	return out


## Text for a boon/affliction stat block (map tooltips).
static func stat_lines(stats: Dictionary, times := 1) -> Array:
	var out: Array = []
	for k in stats:
		out.append(Stats.describe_mod({"stat": k, "value": float(stats[k]) * times}))
	return out


# ---------------------------------------------------------- start / finish
static func start(hero: Dictionary, tier: int, seed_value := -1) -> String:
	if tier < 1 or tier > max_tier(hero):
		return "Tier %d is not open yet." % tier
	if seed_value < 0:
		seed_value = randi() & 0x7FFFFFFF
	hero.expedition = generate(tier, seed_value)
	return ""


## The Warden fell: the next tier opens, the expedition is over.
static func finish(hero: Dictionary, save: Dictionary) -> void:
	var e: Dictionary = hero.get("expedition", {})
	if e.is_empty():
		return
	hero.bestTier = maxi(int(hero.get("bestTier", 0)), int(e.tier))
	save.stats.expeditions = int(save.stats.get("expeditions", 0)) + 1
	save.stats.bestThreat = maxi(int(save.stats.get("bestThreat", 0)), int(e.get("threat", 0)))
	hero.expedition = {}


## Death (or giving up): the expedition and everything it granted is gone.
static func abandon(hero: Dictionary) -> void:
	hero.expedition = {}
