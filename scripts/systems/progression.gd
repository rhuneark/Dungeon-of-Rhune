class_name Progression
## Experience and levels. A level is 5 attribute points; that's all a level
## does (gear is the build).


static func gain_xp(hero: Dictionary, amount: float, xp_gain_pct := 0.0) -> void:
	var amt := Rng.jround(amount * (1 + xp_gain_pct / 100.0))
	if amt <= 0 or hero.level >= HeroData.MAX_LEVEL:
		return
	hero.xp += amt
	while hero.level < HeroData.MAX_LEVEL and hero.xp >= HeroData.xp_to_next(hero.level):
		hero.xp -= HeroData.xp_to_next(hero.level)
		hero.level += 1
		hero.attrPoints += HeroData.ATTR_POINTS_PER_LEVEL
		Game.toast("Level %d! +%d attribute points (C)" % [hero.level, HeroData.ATTR_POINTS_PER_LEVEL], "#f3d34a")
		Game.float_text("LEVEL UP", "#f3d34a")
	if hero.level >= HeroData.MAX_LEVEL:
		hero.xp = 0
