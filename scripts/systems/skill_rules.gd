class_name SkillRules
## Discipline + skill-tree rules. Mutating helpers return an error String
## ("" on success) so the UI can explain refusals.
## `raw` arguments are a sheet's raw stat Dictionary (Game.sheet().raw).


static func rank_of(hero: Dictionary, d: String) -> int:
	return int(hero.ranks.get(d, 0))


static func is_chosen(hero: Dictionary, d: String) -> bool:
	return d in hero.disciplines


static func choose_discipline(hero: Dictionary, d: String) -> String:
	if is_chosen(hero, d):
		return "Already walking that path."
	var slot: int = hero.disciplines.find(null)
	if slot < 0:
		return "You can only follow two Disciplines."
	if hero.pathPoints < 1:
		return "You need a Path Point."
	hero.disciplines[slot] = d
	hero.ranks[d] = 1
	hero.pathPoints -= 1
	return ""


static func raise_rank(hero: Dictionary, d: String) -> String:
	if not is_chosen(hero, d):
		return "Choose this Discipline first."
	var def := Disciplines.get_discipline(d)
	if rank_of(hero, d) >= def.maxRank:
		return "Already mastered."
	if hero.pathPoints < 1:
		return "You need a Path Point."
	hero.ranks[d] = rank_of(hero, d) + 1
	hero.pathPoints -= 1
	return ""


## Full refund of one Discipline (free while the game is young: experiment!).
static func forget_discipline(hero: Dictionary, d: String) -> void:
	var slot: int = hero.disciplines.find(d)
	if slot < 0:
		return
	hero.pathPoints += rank_of(hero, d)
	hero.ranks[d] = 0
	hero.disciplines[slot] = null
	for s in Disciplines.skills():
		if s.discipline == d:
			hero.skills.erase(s.id)
			for i in hero.hotbar.size():
				if hero.hotbar[i] == s.id:
					hero.hotbar[i] = null


static func is_unlocked(hero: Dictionary, skill: Dictionary) -> bool:
	return is_chosen(hero, skill.discipline) and rank_of(hero, skill.discipline) >= skill.unlockRank


static func unlocked_skills(hero: Dictionary) -> Array:
	var out: Array = []
	for s in Disciplines.skills():
		if is_unlocked(hero, s):
			out.append(s)
	return out


static func specialized_count(hero: Dictionary) -> int:
	var n := 0
	for id in hero.skills:
		if hero.skills[id].get("specialized", false):
			n += 1
	return n


static func specialize(hero: Dictionary, skill_id: String) -> String:
	var skill := Disciplines.get_skill(skill_id)
	if skill.is_empty() or not is_unlocked(hero, skill):
		return "That skill is not unlocked yet."
	if hero.skills.has(skill_id) and hero.skills[skill_id].get("specialized", false):
		return ""
	if specialized_count(hero) >= Disciplines.MAX_SPECIALIZED:
		return "You can specialize %d skills at most." % Disciplines.MAX_SPECIALIZED
	hero.skills[skill_id] = {"xp": 0, "level": 1, "specialized": true, "nodes": {}}
	return ""


static func unspecialize(hero: Dictionary, skill_id: String) -> void:
	hero.skills.erase(skill_id)


## +skill bonuses from gear: +all, +discipline, +this skill.
static func skill_bonus(skill: Dictionary, raw: Dictionary) -> int:
	return floori(raw.get("skillAll", 0) + raw.get("skillDisc:" + skill.discipline, 0) + raw.get("skill:" + skill.id, 0))


## Skill level: specialization level (or 1) plus gear bonuses.
static func effective_level(hero: Dictionary, skill: Dictionary, raw: Dictionary) -> int:
	var base: int
	if hero.skills.has(skill.id):
		base = int(hero.skills[skill.id].level)
	else:
		base = 1 if is_unlocked(hero, skill) else 0
	return base + skill_bonus(skill, raw)


static func points_spent(hero: Dictionary, skill_id: String) -> int:
	if not hero.skills.has(skill_id):
		return 0
	var n := 0
	var nodes: Dictionary = hero.skills[skill_id].nodes
	for k in nodes:
		n += int(nodes[k])
	return n


## Tree points: one per specialization level (capped), plus gear bonuses.
static func points_available(hero: Dictionary, skill: Dictionary, raw: Dictionary) -> int:
	var st: Dictionary = hero.skills.get(skill.id, {})
	if not st.get("specialized", false):
		return 0
	return mini(Disciplines.SKILL_LEVEL_CAP, int(st.level)) + skill_bonus(skill, raw) - points_spent(hero, skill.id)


static func node_rank(hero: Dictionary, skill_id: String, node_id: String) -> int:
	if not hero.skills.has(skill_id):
		return 0
	return int(hero.skills[skill_id].nodes.get(node_id, 0))


static func _tree_node(skill: Dictionary, node_id: String) -> Dictionary:
	for x in skill.tree:
		if x.id == node_id:
			return x
	return {}


static func can_allocate(hero: Dictionary, skill: Dictionary, node: Dictionary, raw: Dictionary) -> String:
	var st: Dictionary = hero.skills.get(skill.id, {})
	if not st.get("specialized", false):
		return "Specialize this skill first."
	if node_rank(hero, skill.id, node.id) >= node.maxRank:
		return "Maxed."
	var req: Dictionary = node.get("requires", {})
	if not req.is_empty() and node_rank(hero, skill.id, req.node) < req.points:
		var parent := _tree_node(skill, req.node)
		return "Requires %d points in %s." % [req.points, parent.name if not parent.is_empty() else req.node]
	if points_available(hero, skill, raw) < 1:
		return "No points left — the skill levels up as you gain experience."
	return ""


static func allocate(hero: Dictionary, skill: Dictionary, node: Dictionary, raw: Dictionary) -> String:
	var err := can_allocate(hero, skill, node, raw)
	if err != "":
		return err
	var st: Dictionary = hero.skills[skill.id]
	st.nodes[node.id] = int(st.nodes.get(node.id, 0)) + 1
	return ""


static func deallocate(hero: Dictionary, skill: Dictionary, node: Dictionary) -> String:
	if not hero.skills.has(skill.id):
		return ""
	var st: Dictionary = hero.skills[skill.id]
	var cur := int(st.nodes.get(node.id, 0))
	if cur <= 0:
		return ""
	for x in skill.tree:
		var req: Dictionary = x.get("requires", {})
		if not req.is_empty() and req.node == node.id and int(st.nodes.get(x.id, 0)) > 0 and cur - 1 < req.points:
			return "%s depends on this." % x.name
	st.nodes[node.id] = cur - 1
	if st.nodes[node.id] == 0:
		st.nodes.erase(node.id)
	return ""


## Specialized skills earn the hero's XP too (Last Epoch). Returns ids that levelled.
static func grant_skill_xp(hero: Dictionary, amount: int) -> Array:
	var levelled: Array = []
	for id in hero.skills:
		var st: Dictionary = hero.skills[id]
		if not st.get("specialized", false) or st.level >= Disciplines.SKILL_LEVEL_CAP:
			continue
		st.xp += amount
		while st.level < Disciplines.SKILL_LEVEL_CAP and st.xp >= HeroData.skill_xp_to_next(st.level):
			st.xp -= HeroData.skill_xp_to_next(st.level)
			st.level += 1
			levelled.append(id)
	return levelled


## Summed effect values for a skill's allocated nodes (what combat will read).
static func skill_effects(hero: Dictionary, skill_id: String) -> Dictionary:
	var skill := Disciplines.get_skill(skill_id)
	var out := {}
	if skill.is_empty():
		return out
	for node in skill.tree:
		var r := node_rank(hero, skill_id, node.id)
		if r == 0:
			continue
		for e in node.effects:
			out[e.key] = out.get(e.key, 0) + e.perRank * r
	return out
