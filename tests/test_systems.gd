extends Node
## Headless rules tests: godot --headless res://tests/test_systems.tscn
## Prints PASS/FAIL per check and "RESULT passed/total"; exits 0 when all pass.
## Reference values (REF_*) come from the TypeScript build with the same seeds,
## so these also prove the port rolls bit-identically.

var _pass := 0
var _total := 0

## Reference values produced by the TypeScript build (same seeds).
const REF_ITEMS := [
	{"args": ["short_sword", "rare", 777, 15], "item": {"baseId": "short_sword", "quality": "rare", "ilvl": 15, "seed": 1473987073, "identified": true, "affixes": [{"affixId": "ed_weapon", "tier": 2, "values": [[37]]}, {"affixId": "tag_area", "tier": 0, "values": [[13]]}, {"affixId": "add_void", "tier": 0, "values": [[2, 5]]}], "baseRoll": [], "sockets": 0, "socketed": [], "rareName": [6, 687]}, "name": "Blood Thirst", "buy": 560, "sell": 112, "hero": ["Adds 2-5 Void Damage", "+13% Area Damage"], "local": ["+37% Enhanced Damage"], "damage": [4, 10], "armor": -1, "reqLevel": 8},
	{"args": ["amulet", "magic", 42, 20], "item": {"baseId": "amulet", "quality": "magic", "ilvl": 20, "seed": 1290860478, "identified": true, "affixes": [{"affixId": "gold", "tier": 1, "values": [[67]]}], "baseRoll": [], "sockets": 0, "socketed": []}, "name": "Avaricious Amulet", "buy": 844, "sell": 168, "hero": ["+67% Extra Gold"], "local": [], "damage": [], "armor": -1, "reqLevel": 8},
	{"args": ["ring", "rare", 9, 25], "item": {"baseId": "ring", "quality": "rare", "ilvl": 25, "seed": 426767102, "identified": true, "affixes": [{"affixId": "tag_dot", "tier": 0, "values": [[13]]}, {"affixId": "attr_vigor", "tier": 2, "values": [[15]]}, {"affixId": "dmgpct_poison", "tier": 0, "values": [[9]]}, {"affixId": "attr_spirit", "tier": 2, "values": [[15]]}, {"affixId": "tag_spell", "tier": 1, "values": [[25]]}, {"affixId": "cast_speed", "tier": 2, "values": [[26]]}], "baseRoll": [], "sockets": 0, "socketed": [], "rareName": [43, 866]}, "name": "Spite Circle", "buy": 2500, "sell": 500, "hero": ["+15 to Vigor", "+15 to Spirit", "+26% Faster Cast Rate", "+9% Poison Damage", "+13% Damage over Time Damage", "+25% Spell Damage"], "local": [], "damage": [], "armor": -1, "reqLevel": 19},
	{"args": ["curio_large", "magic", 5, 22], "item": {"baseId": "curio_large", "quality": "magic", "ilvl": 22, "seed": 1481280342, "identified": true, "affixes": [{"affixId": "add_lightning", "tier": 2, "values": [[3, 17]]}], "baseRoll": [], "sockets": 0, "socketed": []}, "name": "Grand Curio of the Storm", "buy": 1175, "sell": 235, "hero": ["Adds 3-17 Lightning Damage"], "local": [], "damage": [], "armor": -1, "reqLevel": 17},
	{"args": ["buckler", "superior", 3, 5], "item": {"baseId": "buckler", "quality": "superior", "ilvl": 5, "seed": 1546675241, "identified": true, "affixes": [{"affixId": "superior_a", "tier": 0, "values": [[10]]}], "baseRoll": [4], "sockets": 1, "socketed": []}, "name": "Superior Buckler", "buy": 72, "sell": 14, "hero": [], "local": ["+10% Enhanced Defense"], "damage": [], "armor": 4, "reqLevel": 1},
	{"args": ["cap", "unique", 11, 5], "item": {"baseId": "cap", "quality": "unique", "ilvl": 5, "seed": 1098624821, "identified": true, "affixes": [], "baseRoll": [4], "sockets": 0, "socketed": [], "uniqueId": "lucky_hat", "uniqueValues": [[29], [47], [10], [1]]}, "name": "Lucky Hat", "buy": 192, "sell": 38, "hero": ["+29% Rarity Find", "+47% Extra Gold", "+10% Unique Find"], "local": [], "damage": [], "armor": 4, "reqLevel": 1},
	{"args": ["war_axe", "normal", 1234, 12], "item": {"baseId": "war_axe", "quality": "normal", "ilvl": 12, "seed": 157399767, "identified": true, "affixes": [], "baseRoll": [], "sockets": 0, "socketed": []}, "name": "War Axe", "buy": 192, "sell": 38, "hero": [], "local": [], "damage": [10, 24], "armor": -1, "reqLevel": 1},
	{"args": ["greatsword", "crude", 8, 9], "item": {"baseId": "greatsword", "quality": "crude", "ilvl": 9, "seed": 335641321, "identified": true, "affixes": [{"affixId": "crude_w", "tier": 0, "values": [[-19]]}], "baseRoll": [], "sockets": 0, "socketed": []}, "name": "Crude Greatsword", "buy": 94, "sell": 18, "hero": [], "local": ["+-19% Enhanced Damage"], "damage": [8, 17], "armor": -1, "reqLevel": 1},
]
const REF_SIMS := {
	"mob10": {"tally": {"consumable": 2566, "normal": 1350, "gold": 3740, "magic": 862, "crude": 204, "superior": 152, "rare": 100, "rhune": 171, "unique": 8}, "gold": 297100, "n": 20000},
	"mob10rf300": {"tally": {"consumable": 2567, "normal": 198, "magic": 2095, "rare": 342, "gold": 3741, "rhune": 163, "superior": 21, "unique": 17, "crude": 24}, "gold": 297070, "n": 20000},
	"mob10seek": {"tally": {"consumable": 2539, "normal": 1356, "gold": 3708, "magic": 864, "superior": 142, "crude": 194, "rhune": 333, "rare": 95, "unique": 6}, "gold": 294880, "n": 20000},
	"boss20": {"tally": {"consumable": 1230, "gold": 2896, "magic": 5508, "unique": 192, "rhune": 579, "rare": 1595}, "gold": 1124640, "n": 2000},
}


func check(name: String, ok: bool, detail: Variant = "") -> void:
	_total += 1
	if ok:
		_pass += 1
		print("PASS ", name)
	else:
		print("FAIL ", name, "  ", detail)


func eq(name: String, got: Variant, want: Variant) -> void:
	check(name, _same(got, want), "got %s want %s" % [JSON.stringify(got), JSON.stringify(want)])


## Deep compare that treats 3 == 3.0 and String == StringName (keys created
## with `dict.key = v` are StringNames; they hash and compare equal to Strings).
func _same(a: Variant, b: Variant) -> bool:
	if (a is String or a is StringName) and (b is String or b is StringName):
		return String(a) == String(b)
	if (typeof(a) == TYPE_INT or typeof(a) == TYPE_FLOAT) and (typeof(b) == TYPE_INT or typeof(b) == TYPE_FLOAT):
		return is_equal_approx(float(a), float(b))
	if a is Array and b is Array:
		if a.size() != b.size():
			return false
		for i in a.size():
			if not _same(a[i], b[i]):
				return false
		return true
	if a is Dictionary and b is Dictionary:
		if a.size() != b.size():
			return false
		for k in a:
			if not b.has(k) or not _same(a[k], b[k]):
				return false
		return true
	return typeof(a) == typeof(b) and a == b


func _ready() -> void:
	SaveIO.dir = "user://test_saves"
	test_content()
	test_rng()
	test_items()
	test_text()
	test_grid()
	test_new_hero_and_sheet()
	test_rhuneword_flow()
	test_quests()
	test_skills()
	test_economy()
	test_save()
	test_loot()
	SaveIO.wipe_save()
	print("RESULT %d/%d" % [_pass, _total])
	get_tree().quit(0 if _pass == _total else 1)


func test_content() -> void:
	eq("content: rhunes", Rhunes.all().size(), 12)
	eq("content: rhunewords", Rhunes.rhunewords().size(), 9)
	eq("content: uniques", Uniques.all().size(), 36)
	eq("content: treasure classes", TreasureClasses.all().size(), 6)
	eq("content: disciplines", Disciplines.disciplines().size(), 4)
	eq("content: skills", Disciplines.skills().size(), 12)
	eq("content: lore", Lore.all().size(), 10)
	eq("content: quests", QuestDefs.all().size(), 8)
	eq("content: npcs", Npcs.all().size(), 6)
	eq("content: achievements", Achievements.all().size(), 8)
	check("content: bases > 40", ItemBases.all().size() > 40, ItemBases.all().size())
	check("content: affixes > 60", Affixes.all().size() > 60, Affixes.all().size())
	var bad: Array = []
	for u in Uniques.all():
		if not ItemBases.has_base(u.baseId):
			bad.append(u.id)
		for r in u.rolls:
			Stats.get_stat_def(r.stat)
	eq("content: unique bases exist", bad, [])
	var ids := {}
	for a in Affixes.all():
		ids[a.id] = true
	eq("content: affix ids unique", ids.size(), Affixes.all().size())
	bad = []
	for q in QuestDefs.all():
		if Npcs.get_npc(q.giver).is_empty():
			bad.append(q.id + ":giver")
		for id in q.startItems + q.reward.items:
			if id != "socketed_sword" and not (id.begins_with("unique:") and not Uniques.get_unique(id.substr(7)).is_empty()) and not ItemBases.has_base(id):
				bad.append(q.id + ":" + id)
		for l in q.reward.lore:
			if Lore.get_lore(l).is_empty():
				bad.append(q.id + ":lore:" + l)
	eq("content: quest refs resolve", bad, [])
	bad = []
	for s in Disciplines.skills():
		for n in s.tree:
			if not n.requires.is_empty() and SkillRules._tree_node(s, n.requires.node).is_empty():
				bad.append(s.id + "." + n.id)
	eq("content: skill tree requires resolve", bad, [])
	eq("content: combo title pair", Disciplines.combo_title("hollowcaller", "emberwright"), "Ashbinder")
	eq("content: combo title one", Disciplines.combo_title(null, "galeborn"), "Galeborn")
	eq("content: combo title none", Disciplines.combo_title(null, null), "Wanderer")
	eq("content: next rhune", Rhunes.next_rhune("ash").get("id", ""), "ember")
	eq("content: find rhuneword", Rhunes.find_rhuneword(["ember", "ash"], ["weapon", "sword"]).get("id", ""), "kindling")
	check("content: affix allowed (curio needs curio tag)", not Affixes.allowed_on(Affixes.get_affix("life"), ["curio", "curio_small"]) and Affixes.allowed_on(Affixes.get_affix("c_life"), ["curio", "curio_small"]))


func test_rng() -> void:
	var r := Rng.new(12345)
	var got: Array = []
	for i in 5:
		got.append(r.next_float())
	eq("rng: mulberry32 matches TS", got, [0.9797282677609473, 0.3067522644996643, 0.484205421525985, 0.817934412509203, 0.5094283693470061])
	var r2 := Rng.new(4294967295)
	eq("rng: seed 2^32-1", [r2.next_float(), r2.int_range(1, 100)], [0.8964226141106337, 19])
	check("rng: uid unique", Rng.uid() != Rng.uid())


func test_items() -> void:
	for ref in REF_ITEMS:
		var a: Array = ref.args
		var it := ItemGen.create_item(a[0], {"ilvl": a[3], "quality": a[1], "rng": Rng.new(a[2])})
		var label := "item %s %s" % [a[0], a[1]]
		var copy := it.duplicate(true)
		copy.erase("uid")
		copy.identified = ref.item.identified
		eq(label + ": rolls match TS", copy, ref.item)
		it.identified = true
		var v := ItemText.view_item(it)
		eq(label + ": name", v.name, ref.name)
		eq(label + ": damage", v.damage, ref.damage)
		eq(label + ": armor", v.armor, ref.armor)
		eq(label + ": reqLevel", v.reqLevel, ref.reqLevel)
		eq(label + ": buy/sell", [ItemText.buy_price(it), ItemText.sell_price(it)], [ref.buy, ref.sell])
		var hero_lines: Array = []
		for m in v.heroMods:
			hero_lines.append(Stats.describe_mod(m))
		var local_lines: Array = []
		for m in v.localMods:
			local_lines.append(Stats.describe_mod(m))
		eq(label + ": hero lines", hero_lines, ref.hero)
		eq(label + ": local lines", local_lines, ref.local)
	# qualities without reference
	var magic := ItemGen.create_item("hood", {"ilvl": 10, "quality": "magic"})
	check("item: magic drops unidentified", magic.identified == false and ItemText.item_name(magic) == "Hood")
	var rare := ItemGen.create_item("gloves", {"ilvl": 18, "quality": "rare", "identified": true})
	check("item: rare has 3+ affixes and a two-word name", rare.affixes.size() >= 3 and ItemText.item_name(rare).split(" ").size() >= 2, ItemText.item_name(rare))
	eq("item: rare sub name", ItemText.item_sub_name(rare), ItemBases.get_base("gloves").name)
	var uq := ItemGen.create_item("wand", {"ilvl": 1, "quality": "unique", "uniqueId": "pips_mistake", "identified": true})
	eq("item: forced unique", [uq.quality, uq.get("uniqueId", ""), ItemText.item_name(uq)], ["unique", "pips_mistake", "Pip's Mistake"])
	check("item: unique quirk listed", "frog" in ItemText.view_item(uq).quirks)
	var no_u := ItemGen.create_item("hood", {"ilvl": 1, "quality": "unique"})
	eq("item: no unique at ilvl -> rare", no_u.quality, "rare")
	var pot := ItemGen.make_consumable("potion_health", 3)
	eq("item: consumable qty name", ItemText.item_name(pot), "Healing Draught (3)")
	var rh := ItemGen.create_item("rhune_ember", {"ilvl": 5, "quality": "magic"})
	eq("item: rhune stays normal + rhune colour", [rh.quality, ItemText.item_color(rh)], ["normal", "#ff9b3d"])
	var curio := ItemGen.create_item("curio_small", {"ilvl": 30, "quality": "rare"})
	eq("item: curio rare -> magic", curio.quality, "magic")


func test_text() -> void:
	eq("text: adds fire", Stats.describe_mod({"stat": "addDmg:fire", "value": 3, "value2": 8}), "Adds 3-8 Fire Damage")
	eq("text: cold res", Stats.describe_mod({"stat": "res:cold", "value": 15}), "Cold Resistance +15%")
	eq("text: rhune find", Stats.describe_mod({"stat": "seek:rhune", "value": 20}), "+20% Rhune Find")
	eq("text: skillDisc resolves name", Stats.describe_mod({"stat": "skillDisc:galeborn", "value": 2}), "+2 to Galeborn Skills")
	eq("text: skill resolves name", Stats.describe_mod({"stat": "skill:cinder_bolt", "value": 2}), "+2 to " + Disciplines.get_skill("cinder_bolt").name)
	eq("text: quirk", ItemText.quirk_text("honk"), "Honks when a unique item drops nearby")
	var merged := Stats.merge_mods([{"stat": "life", "value": 5}, {"stat": "mana", "value": 2}, {"stat": "life", "value": 7}])
	eq("text: merge mods", merged, [{"stat": "life", "value": 12}, {"stat": "mana", "value": 2}])


func _mk(base_id: String) -> Dictionary:
	return ItemGen.create_item(base_id, {"ilvl": 1})


func test_grid() -> void:
	var g := Grid.make(4, 3, [])
	var cap := _mk("cap") # 2x2
	var sword := _mk("short_sword") # 1x3
	eq("grid: size_of", Grid.size_of(cap), Vector2i(2, 2))
	check("grid: auto place cap", Grid.auto_place(g, cap) and cap.x == 0 and cap.y == 0)
	eq("grid: find spot after cap", Grid.find_spot(g, sword), Vector2i(2, 0))
	check("grid: can't overlap", not Grid.can_place(g, sword, 1, 0))
	check("grid: out of bounds", not Grid.can_place(g, sword, 3, 1))
	Grid.auto_place(g, sword)
	eq("grid: item at cell", Grid.item_at_cell(g, 2, 2).get("uid", ""), sword.uid)
	var ring := _mk("ring")
	var res := Grid.place_or_swap(g, ring, 1, 1)
	check("grid: place_or_swap swaps exactly one", res.ok and res.swapped.get("uid", "") == cap.uid, res)
	var big := _mk("cap")
	var res2 := Grid.place_or_swap(g, big, 1, 1)
	check("grid: blocked by two", not res2.ok)
	eq("grid: remove missing", Grid.remove_item(g, "nope"), {})
	var blocker := _mk("ring")
	blocker.x = 0
	blocker.y = 0
	var full := Grid.make(1, 1, [blocker])
	eq("grid: no spot", Grid.find_spot(full, _mk("ring")), Vector2i(-1, -1))


func _fresh_hero(name := "Tester") -> Dictionary:
	Game.save = HeroData.default_save()
	Game.save.hero = HeroData.new_hero(name)
	return Game.save.hero


func test_new_hero_and_sheet() -> void:
	var h := _fresh_hero("  ")
	eq("hero: blank name -> Wanderer", h.name, "Wanderer")
	eq("hero: equipped", h.equipped.keys(), ["weapon", "chest", "offhand"])
	eq("hero: starter bag", h.inventory.map(func(i): return i.baseId), ["potion_health", "potion_health", "potion_mana", "scroll_identify"])
	eq("hero: xp curve", [HeroData.xp_to_next(1), HeroData.xp_to_next(10), HeroData.skill_xp_to_next(5)], [300, 6928, 1200])
	var s := CharacterSheet.compute_sheet(h)
	eq("sheet: life/mana", [s.life, s.mana], [74, 42])
	eq("sheet: damage", s.damage, [3, 8])
	var want_armor := floori(h.equipped.chest.baseRoll[0] + h.equipped.offhand.baseRoll[0] + 10 / 4.0)
	eq("sheet: armor", s.armor, want_armor)
	eq("sheet: block", s.block, 15)
	eq("sheet: res", s.res, {"fire": 0, "cold": 0, "lightning": 0, "poison": 0, "void": 0})
	check("sheet: attacks/sec", is_equal_approx(s.attacksPerSec, 1.3 * 1.02), s.attacksPerSec)
	eq("sheet: unmet", s.unmet, [])
	# Gear with unmet requirements does nothing.
	h.equipped.weapon = ItemGen.create_item("maul", {"ilvl": 14})
	h.equipped.erase("offhand")
	var s2 := CharacterSheet.compute_sheet(h)
	eq("sheet: unmet maul", s2.unmet, ["weapon"])
	eq("sheet: unmet weapon -> fists", s2.damage, [1, 3])
	# Curio in the bag counts.
	h.equipped.weapon = ItemGen.create_item("short_sword", {"ilvl": 1})
	var c := ItemGen.create_item("curio_small", {"ilvl": 1})
	c.quality = "magic"
	c.affixes = [{"affixId": "c_life", "tier": 0, "values": [[6]]}]
	Grid.auto_place(Grid.make(HeroData.INV_W, HeroData.INV_H, h.inventory), c)
	eq("sheet: curio life", CharacterSheet.compute_sheet(h).life, 80)


func test_rhuneword_flow() -> void:
	var h := _fresh_hero()
	Game.set_ui({"left": "", "cursor_mode": ""})
	QuestRules.start_auto_quests(h)
	check("quest: auto quests started", h.quests.has("newcomer") and h.quests.has("literacy") and h.quests.has("goose_problem") and not h.quests.has("sealed_stair"), h.quests.keys())
	var ember := Actions._find_base(h.inventory, "rhune_ember")
	var ash := Actions._find_base(h.inventory, "rhune_ash")
	var sword: Dictionary = {}
	for it in h.inventory:
		if it.baseId == "short_sword" and it.sockets == 2:
			sword = it
	check("quest: literacy start items", not ember.is_empty() and not ash.is_empty() and not sword.is_empty())
	Actions.click_grid("inv", ember.x, ember.y, ember.uid)
	check("actions: rhune on cursor", h.cursor is Dictionary and h.cursor.uid == ember.uid)
	Actions.click_grid("inv", sword.x, sword.y, sword.uid)
	check("actions: ember socketed", h.cursor == null and sword.socketed.size() == 1 and not sword.socketed[0].has("x"))
	Actions.click_grid("inv", ash.x, ash.y, ash.uid)
	Actions.click_grid("inv", sword.x, sword.y, sword.uid)
	eq("actions: kindling spoken", [sword.quality, sword.get("rhunewordId", "")], ["rhuneword", "kindling"])
	eq("actions: rhuneword name", ItemText.item_name(sword), "Kindling")
	check("actions: rhuneword stats", Stats.describe_mod(ItemText.view_item(sword).heroMods[0]) != "", ItemText.view_item(sword).heroMods)
	check("codex: w:kindling", Game.save.codex.has("w:kindling"))
	eq("quest: literacy done", h.quests.literacy.state, "done")
	check("quest: literacy reward (lore, path point + level-up point, level 2)", "rhunes" in h.lore and h.pathPoints == 3 and h.level == 2, [h.lore, h.pathPoints, h.level])
	check("achievement: FIRST_RHUNEWORD", "FIRST_RHUNEWORD" in Achievements.unlocked_ids(Game.save))
	# Equip / unequip round trip through the cursor.
	Actions.click_equip("weapon")
	check("actions: unequip to cursor", h.cursor is Dictionary and h.cursor.baseId == "short_sword" and not h.equipped.has("weapon"))
	Actions.click_equip("weapon")
	check("actions: re-equip", h.cursor == null and h.equipped.has("weapon"))
	# Right-click equip swaps the old weapon into the bag.
	var before := h.equipped.weapon.uid as String
	Actions.right_click_item("inv", sword.uid)
	check("actions: right-click equips", h.equipped.weapon.uid == sword.uid and not Actions._find_uid(h.inventory, before).is_empty())
	# Identify with a scroll.
	var hood := ItemGen.create_item("hood", {"ilvl": 10, "quality": "magic"})
	Grid.auto_place(Actions.grid_of("inv"), hood)
	var scroll := Actions._find_base(h.inventory, "scroll_identify")
	Actions.use_consumable(scroll)
	eq("actions: identify mode", Game.ui.cursor_mode, "identify")
	Actions.click_grid("inv", hood.x, hood.y, hood.uid)
	check("actions: scroll identifies", hood.identified and Actions._find_uid(h.inventory, scroll.uid).is_empty() and Game.ui.cursor_mode == "")
	eq("quest: second opinion done", h.quests.second_opinion.state, "done")
	# Selling.
	var gold: int = h.gold
	var price := ItemText.sell_price(hood)
	Actions.sell(hood)
	eq("actions: sell", h.gold, gold + price)


func test_quests() -> void:
	var h := _fresh_hero()
	QuestRules.start_auto_quests(h)
	eq("quest: sealed stair locked", QuestRules.available_from(h, "varn").map(func(q): return q.id), [])
	for npc in ["brannoc", "ysolde", "pell", "odo"]:
		QuestRules.emit("talk", npc)
	eq("quest: progress", h.quests.newcomer.progress.size(), 4)
	QuestRules.emit("talk", "maren")
	QuestRules.emit("talk", "maren")
	eq("quest: newcomer done", h.quests.newcomer.state, "done")
	check("quest: rewards", "thornwick" in h.lore and h.pathPoints == 3 and h.level == 2, [h.lore, h.pathPoints, h.level, h.xp])
	eq("quest: sealed stair available", QuestRules.available_from(h, "varn").map(func(q): return q.id), ["sealed_stair"])
	for i in 7:
		QuestRules.emit("honk")
	check("quest: goose -> old key + achievement", h.quests.goose_problem.state == "done" and not Actions._find_base(h.inventory, "old_key").is_empty() and "GOOSE" in Achievements.unlocked_ids(Game.save))
	var gained: int = h.xp
	Progression.gain_xp(h, 100, 50)
	eq("progression: xp gain pct", h.xp, gained + 150)


func test_skills() -> void:
	var h := _fresh_hero()
	eq("skills: choose", SkillRules.choose_discipline(h, "emberwright"), "")
	eq("skills: no points", SkillRules.choose_discipline(h, "bulwark"), "You need a Path Point.")
	h.pathPoints = 5
	eq("skills: second", SkillRules.choose_discipline(h, "bulwark"), "")
	eq("skills: third refused", SkillRules.choose_discipline(h, "galeborn"), "You can only follow two Disciplines.")
	check("achievement: TWO_PATHS", "TWO_PATHS" in Achievements.unlocked_ids(Game.save))
	eq("skills: raise", SkillRules.raise_rank(h, "bulwark"), "")
	eq("skills: rank", SkillRules.rank_of(h, "bulwark"), 2)
	var unlocked := SkillRules.unlocked_skills(h)
	check("skills: rank-1 skills unlocked", not unlocked.is_empty())
	var sk: Dictionary = unlocked[0]
	eq("skills: specialize", SkillRules.specialize(h, sk.id), "")
	var raw: Dictionary = CharacterSheet.compute_sheet(h).raw
	eq("skills: points", SkillRules.points_available(h, sk, raw), 1)
	var root: Dictionary = {}
	var child: Dictionary = {}
	for n in sk.tree:
		if n.requires.is_empty() and root.is_empty():
			root = n
	for n in sk.tree:
		if not n.requires.is_empty() and n.requires.node == root.id:
			child = n
			break
	eq("skills: allocate root", SkillRules.allocate(h, sk, root, raw), "")
	check("skills: child needs points", SkillRules.can_allocate(h, sk, child, raw).begins_with("Requires"), SkillRules.can_allocate(h, sk, child, raw))
	eq("skills: no points left", SkillRules.allocate(h, sk, root, raw), "No points left — the skill levels up as you gain experience.")
	var levelled := SkillRules.grant_skill_xp(h, HeroData.skill_xp_to_next(1))
	eq("skills: skill levels with xp", [levelled, h.skills[sk.id].level], [[sk.id], 2])
	eq("skills: effects", SkillRules.skill_effects(h, sk.id).get(root.effects[0].key, 0), root.effects[0].perRank)
	eq("skills: deallocate", SkillRules.deallocate(h, sk, root), "")
	SkillRules.forget_discipline(h, sk.discipline)
	check("skills: forget refunds", not sk.discipline in h.disciplines and not h.skills.has(sk.id))
	eq("skills: combo title", Disciplines.combo_title(h.disciplines[0], h.disciplines[1]), "Bulwark" if sk.discipline == "emberwright" else "Emberwright")


func test_economy() -> void:
	var h := _fresh_hero()
	h.gold = 100000
	h.level = 10
	var g := Economy.vendor_grid("pell")
	check("economy: vendor stock", g.items.size() > 5 and g.items.size() <= 22, g.items.size())
	check("economy: vendor cached", Economy.vendor_grid("pell") == g)
	var it: Dictionary = g.items[0]
	var price := Economy.vendor_price(it)
	var gold0: int = h.gold
	Economy.buy("pell", it.uid)
	check("economy: buy", h.gold == gold0 - price and not Actions._find_uid(h.inventory, it.uid).is_empty())
	var herbs := Economy.vendor_grid("ysolde")
	var n_herbs: int = herbs.items.size()
	Economy.buy("ysolde", herbs.items[0].uid)
	eq("economy: herbs never run dry", herbs.items.size(), n_herbs)
	var offers := Economy.gamble_offers()
	check("economy: gamble offers", offers.size() > 10)
	h.inventory.clear()
	Economy.gamble(offers[0].baseId)
	check("economy: gamble", h.inventory.size() == 1 and Game.save.stats.gambles == 1 and h.inventory[0].quality in ["magic", "rare", "unique"])
	eq("economy: wish cost", Economy.wish_cost(), 175)
	Economy.make_wish()
	eq("economy: wish counted", Game.save.stats.wishes, 1)
	var plain := ItemGen.create_item("cap", {"ilvl": 3, "quality": "normal"})
	plain.sockets = 0
	check("economy: can punch", Economy.can_punch(plain))
	Economy.punch_sockets(plain)
	check("economy: punched", plain.sockets >= 1 and plain.sockets <= 2)
	var r3: Array = [ItemGen.create_item("rhune_ash", {"ilvl": 1}), ItemGen.create_item("rhune_ash", {"ilvl": 1}), ItemGen.create_item("rhune_ash", {"ilvl": 1})]
	eq("economy: recipe ascend", Economy.find_recipe(r3).get("id", ""), "rhune_up")
	eq("economy: transmute ascend", Economy.transmute(r3).map(func(i): return i.baseId), ["rhune_ember"])
	var mags: Array = []
	for i in 3:
		mags.append(ItemGen.create_item("ring", {"ilvl": 12, "quality": "magic"}))
	var out := Economy.transmute(mags)
	check("economy: reforge", out.size() == 1 and out[0].quality == "magic" and ItemBases.get_base(out[0].baseId).slot == "ring" and out[0].ilvl == 14)
	var sw := ItemGen.create_item("short_sword", {"ilvl": 1})
	sw.sockets = 2
	sw.socketed = [ItemGen.create_item("rhune_ember", {"ilvl": 1}), ItemGen.create_item("rhune_ash", {"ilvl": 1})]
	sw.quality = "rhuneword"
	sw.rhunewordId = "kindling"
	var un := Economy.transmute([sw, ItemGen.create_item("rhune_ash", {"ilvl": 1})])
	check("economy: unspeak", un.size() == 1 and un[0].socketed.is_empty() and un[0].quality == "normal" and not un[0].has("rhunewordId"))
	eq("economy: no recipe", Economy.transmute([plain]), [])
	eq("economy: recipes list", Economy.recipes().size(), 3)


func test_save() -> void:
	var h := _fresh_hero("Saver")
	QuestRules.start_auto_quests(h)
	h.cursor = ItemGen.create_item("ring", {"ilvl": 20, "quality": "rare"})
	Game.save.stash.append(ItemGen.create_item("gloves", {"ilvl": 9, "quality": "magic"}))
	var gone := ItemGen.create_item("cap", {"ilvl": 1})
	gone.baseId = "deleted_base"
	Game.save.stash.append(gone)
	Game.save.codex["u:lucky_hat"] = {"at": 1700000000000, "best": 0.5}
	SaveIO.wipe_save()
	eq("save: missing -> default", SaveIO.load_game(), HeroData.default_save())
	SaveIO.save_game(Game.save)
	check("save: file written", FileAccess.file_exists(SaveIO.path()))
	var loaded := SaveIO.load_game()
	eq("save: stale base dropped", loaded.stash.size(), 1)
	Game.save.stash.pop_back()
	check("save: round trip", JSON.stringify(loaded) == JSON.stringify(Game.save), "differs")
	check("save: ints stay ints", typeof(loaded.hero.level) == TYPE_INT and typeof(loaded.hero.equipped.chest.baseRoll[0]) == TYPE_INT and typeof(loaded.hero.cursor.affixes[0].values[0][0]) == TYPE_INT and typeof(loaded.codex["u:lucky_hat"].at) == TYPE_INT)
	check("save: floats stay floats", typeof(loaded.codex["u:lucky_hat"].best) == TYPE_FLOAT)
	# Second save keeps a backup; a corrupt main falls back to it.
	SaveIO.save_game(Game.save)
	check("save: backup kept", FileAccess.file_exists(SaveIO.path() + ".bak"))
	var f := FileAccess.open(SaveIO.path(), FileAccess.WRITE)
	f.store_string("{not json")
	f.close()
	eq("save: corrupt -> backup", SaveIO.load_game().hero.name, "Saver")
	SaveIO.wipe_save()
	check("save: wipe", not FileAccess.file_exists(SaveIO.path()) and not FileAccess.file_exists(SaveIO.path() + ".bak"))


func test_loot() -> void:
	var cases := {
		"mob10": ["mob", 10, {"rarity": 0, "quantity": 0, "gold": 0, "seek": {}}, 20000],
		"mob10rf300": ["mob", 10, {"rarity": 300, "quantity": 0, "gold": 0, "seek": {}}, 20000],
		"mob10seek": ["mob", 10, {"rarity": 0, "quantity": 0, "gold": 0, "seek": {"rhune": 100}}, 20000],
		"boss20": ["boss", 20, {"rarity": 100, "quantity": 50, "gold": 20, "seek": {"unique": 50}}, 2000],
	}
	var t0 := Time.get_ticks_msec()
	for k in cases:
		var c: Array = cases[k]
		var sim := Loot.simulate_drops(c[0], {"ilvl": c[1], "fortune": c[2], "rng": Rng.new(12345)}, c[3])
		eq("loot: %s tally matches TS" % k, sim.tally, REF_SIMS[k].tally)
		eq("loot: %s gold matches TS" % k, sim.gold, REF_SIMS[k].gold)
	print("  (loot sims took %d ms)" % (Time.get_ticks_msec() - t0))
	var drops := Loot.roll_treasure("boss", {"ilvl": 12, "fortune": Loot.NO_FORTUNE})
	check("loot: boss always drops", drops.size() == 6, drops.size())
	var q := {}
	var rng := Rng.new(99)
	for i in 4000:
		var qq := Loot.roll_quality(10, 1, Loot.NO_FORTUNE, {}, rng)
		q[qq] = q.get(qq, 0) + 1
	check("loot: quality spread", q.get("magic", 0) > q.get("rare", 0) and q.get("rare", 0) > q.get("unique", 0) and q.get("normal", 0) > 0, q)
