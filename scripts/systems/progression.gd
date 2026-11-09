class_name Progression
## Experience and levels. Specialized skills earn the same XP (Last Epoch).


static func gain_xp(hero: Dictionary, amount: float, xp_gain_pct := 0.0) -> void:
	var amt := Rng.jround(amount * (1 + xp_gain_pct / 100.0))
	if amt <= 0:
		return
	hero.xp += amt
	Game.float_text("+%d xp" % amt, "#c9b98a")
	while hero.level < HeroData.MAX_LEVEL and hero.xp >= HeroData.xp_to_next(hero.level):
		hero.xp -= HeroData.xp_to_next(hero.level)
		hero.level += 1
		hero.attrPoints += HeroData.ATTR_POINTS_PER_LEVEL
		hero.pathPoints += HeroData.PATH_POINTS_PER_LEVEL
		Game.toast("Level %d! +%d attribute points, +%d Path Point" % [hero.level, HeroData.ATTR_POINTS_PER_LEVEL, HeroData.PATH_POINTS_PER_LEVEL], "#f3d34a")
		Game.float_text("LEVEL UP", "#f3d34a")
	if hero.level >= HeroData.MAX_LEVEL:
		hero.xp = 0
	for id in SkillRules.grant_skill_xp(hero, amt):
		var s := Disciplines.get_skill(id)
		if not s.is_empty():
			Game.toast("%s reached level %d — new tree point" % [s.name, hero.skills[id].level], "#7ec8e3")
