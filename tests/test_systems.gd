extends Node
## Headless rules tests: godot --headless res://tests/test_systems.tscn
## Prints PASS/FAIL per check and "RESULT passed/total"; exits 0 when all pass.
## Reference values (REF_*) pin item and loot rolls for fixed seeds.

var _pass := 0
var _total := 0

## Reference values (same seeds). The buckler, unique cap, war axe and crude
## greatsword are the TypeScript build's own numbers, so the port still rolls
## bit-identically; items whose affix pools changed when the game went
## gear-only (no mana, no skills, flask and charm affixes) and the loot
## tallies (no potions or scrolls) are snapshots of the current rules.
const REF_ITEMS := [
	{"args": ["short_sword", "rare", 777, 15], "item": {"affixes": [{"affixId": "ed_weapon", "tier": 2, "values": [[37]]}, {"affixId": "tag_spell", "tier": 0, "values": [[13]]}, {"affixId": "add_void", "tier": 1, "values": [[4, 8]]}], "baseId": "short_sword", "baseRoll": [], "identified": false, "ilvl": 15, "quality": "rare", "rareName": [6, 687], "seed": 1473987073, "socketed": [], "sockets": 0}, "name": "Blood Thirst", "buy": 560, "sell": 112, "hero": ["Adds 4-8 Void Damage", "+13% Spell Damage"], "local": ["+37% Enhanced Damage"], "damage": [4, 10], "armor": -1, "reqLevel": 8},
	{"args": ["amulet", "magic", 42, 20], "item": {"affixes": [{"affixId": "gold", "tier": 0, "values": [[32]]}], "baseId": "amulet", "baseRoll": [], "identified": false, "ilvl": 20, "quality": "magic", "seed": 1290860478, "socketed": [], "sockets": 0}, "name": "Gilded Amulet", "buy": 844, "sell": 168, "hero": ["+32% Extra Gold"], "local": [], "damage": [], "armor": -1, "reqLevel": 1},
	{"args": ["ring", "rare", 9, 25], "item": {"affixes": [{"affixId": "gold", "tier": 1, "values": [[69]]}, {"affixId": "attr_finesse", "tier": 1, "values": [[9]]}, {"affixId": "dmgpct_poison", "tier": 1, "values": [[17]]}, {"affixId": "attr_vigor", "tier": 1, "values": [[9]]}, {"affixId": "tag_spell", "tier": 1, "values": [[25]]}, {"affixId": "attack_speed", "tier": 2, "values": [[26]]}], "baseId": "ring", "baseRoll": [], "identified": false, "ilvl": 25, "quality": "rare", "rareName": [43, 866], "seed": 426767102, "socketed": [], "sockets": 0}, "name": "Spite Circle", "buy": 2500, "sell": 500, "hero": ["+9 to Dexterity", "+9 to Stamina", "+26% Increased Attack Speed", "+17% Poison Damage", "+25% Spell Damage", "+69% Extra Gold"], "local": [], "damage": [], "armor": -1, "reqLevel": 19},
	{"args": ["curio_large", "magic", 5, 22], "item": {"affixes": [{"affixId": "add_lightning", "tier": 2, "values": [[3, 17]]}], "baseId": "curio_large", "baseRoll": [], "identified": false, "ilvl": 22, "quality": "magic", "seed": 1481280342, "socketed": [], "sockets": 0}, "name": "Grand Charm of the Storm", "buy": 1175, "sell": 235, "hero": ["Adds 3-17 Lightning Damage"], "local": [], "damage": [], "armor": -1, "reqLevel": 17},
	{"args": ["buckler", "superior", 3, 5], "item": {"affixes": [{"affixId": "superior_a", "tier": 0, "values": [[10]]}], "baseId": "buckler", "baseRoll": [4], "identified": true, "ilvl": 5, "quality": "superior", "seed": 1546675241, "socketed": [], "sockets": 1}, "name": "Superior Buckler", "buy": 72, "sell": 14, "hero": [], "local": ["+10% Enhanced Defense"], "damage": [], "armor": 4, "reqLevel": 1},
	{"args": ["cap", "unique", 11, 5], "item": {"affixes": [], "baseId": "cap", "baseRoll": [4], "identified": false, "ilvl": 5, "quality": "unique", "seed": 1098624821, "socketed": [], "sockets": 0, "uniqueId": "lucky_hat", "uniqueValues": [[29], [47], [10], [1]]}, "name": "Lucky Hat", "buy": 192, "sell": 38, "hero": ["+29% Rarity Find", "+47% Extra Gold", "+10% Unique Find"], "local": [], "damage": [], "armor": 4, "reqLevel": 1},
	{"args": ["war_axe", "normal", 1234, 12], "item": {"affixes": [], "baseId": "war_axe", "baseRoll": [], "identified": true, "ilvl": 12, "quality": "normal", "seed": 157399767, "socketed": [], "sockets": 0}, "name": "War Axe", "buy": 192, "sell": 38, "hero": [], "local": [], "damage": [10, 24], "armor": -1, "reqLevel": 1},
	{"args": ["greatsword", "crude", 8, 9], "item": {"affixes": [{"affixId": "crude_w", "tier": 0, "values": [[-19]]}], "baseId": "greatsword", "baseRoll": [], "identified": true, "ilvl": 9, "quality": "crude", "seed": 335641321, "socketed": [], "sockets": 0}, "name": "Crude Greatsword", "buy": 94, "sell": 18, "hero": [], "local": ["+-19% Enhanced Damage"], "damage": [8, 17], "armor": -1, "reqLevel": 1},
	{"args": ["belt", "magic", 31, 12], "item": {"affixes": [{"affixId": "ed_armor", "tier": 2, "values": [[35]]}, {"affixId": "attr_might", "tier": 1, "values": [[5]]}], "baseId": "belt", "baseRoll": [6], "charmSlots": 5, "charms": [], "identified": false, "ilvl": 12, "quality": "magic", "seed": 1443659016, "socketed": [], "sockets": 0}, "name": "Glorious Belt of the Bull", "buy": 278, "sell": 55, "hero": ["+5 to Strength"], "local": ["+35% Enhanced Defense"], "damage": [], "armor": 8, "reqLevel": 9},
]
const REF_SIMS := {
	"mob10": {"tally": {"crude": 184, "gold": 3864, "magic": 765, "normal": 1216, "rare": 105, "rhune": 118, "superior": 154, "unique": 5}, "gold": 307800, "n": 20000},
	"mob10rf300": {"tally": {"crude": 20, "gold": 3892, "magic": 1866, "normal": 161, "rare": 318, "rhune": 114, "superior": 22, "unique": 10}, "gold": 310260, "n": 20000},
	"mob10seek": {"tally": {"crude": 169, "gold": 3854, "magic": 753, "normal": 1197, "rare": 110, "rhune": 260, "superior": 147, "unique": 6}, "gold": 307700, "n": 20000},
	"boss20": {"tally": {"gold": 3235, "magic": 6167, "rare": 1788, "rhune": 620, "unique": 190}, "gold": 1237200, "n": 2000},
	"chest30": {"tally": {"gold": 5043, "magic": 3535, "normal": 3299, "rare": 531, "rhune": 861, "superior": 355, "unique": 46}, "gold": 2440800, "n": 5000},
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
	test_rings_and_charms()
	test_flask_and_floors()
	test_arena()
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
	eq("content: treasure classes", TreasureClasses.all().size(), 7)
	eq("content: npcs", Npcs.all().size(), 6)
	eq("content: achievements", Achievements.all().size(), 8)
	eq("content: monsters", Monsters.ALL.size(), 7)
	check("content: bases > 40", ItemBases.all().size() > 40, ItemBases.all().size())
	check("content: affixes > 50", Affixes.all().size() > 50, Affixes.all().size())
	var bad: Array = []
	for u in Uniques.all():
		if not ItemBases.has_base(u.baseId):
			bad.append(u.id)
	eq("content: unique bases exist", bad, [])
	# Gear-only: nothing may grant a stat the game no longer has.
	var gone := ["mana", "manaPct", "manaLeech", "manaRegen", "manaOnKill", "castSpeed", "skillAll"]
	bad = []
	for u in Uniques.all():
		for r in u.rolls:
			if r.stat in gone or String(r.stat).begins_with("skill"):
				bad.append(u.id + ":" + r.stat)
	for a in Affixes.all():
		for tier in a.tiers:
			for r in tier.rolls:
				if r.stat in gone or String(r.stat).begins_with("skill") or not Stats.defs().has(r.stat):
					bad.append(a.id + ":" + r.stat)
	for b in ItemBases.all():
		for m in b.implicit:
			if m.stat in gone:
				bad.append(b.id + ":" + m.stat)
	eq("content: no mana/skill stats left", bad, [])
	var ids := {}
	for a in Affixes.all():
		ids[a.id] = true
	eq("content: affix ids unique", ids.size(), Affixes.all().size())
	for n in Npcs.all():
		for sv in n.services:
			if not sv in DialogBox.SERVICE_LABEL:
				bad.append(n.id + ":" + sv)
	eq("content: every service has a button", bad, [])
	eq("content: attribute names", HeroData.ATTRS.map(func(a): return HeroData.ATTR_INFO[a].name), ["Strength", "Dexterity", "Stamina", "Intelligence"])
	eq("content: next rhune", Rhunes.next_rhune("ash").get("id", ""), "ember")
	eq("content: find rhuneword", Rhunes.find_rhuneword(["ember", "ash"], ["weapon", "sword"]).get("id", ""), "kindling")
	check("content: affix allowed (charm needs charm tag)", not Affixes.allowed_on(Affixes.get_affix("life"), ["curio", "curio_small"]) and Affixes.allowed_on(Affixes.get_affix("c_life"), ["curio", "curio_small"]))


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
		eq(label + ": rolls match reference", copy, ref.item)
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
	var belt := ItemGen.create_item("war_girdle", {"ilvl": 30, "quality": "rare"})
	check("item: belts roll 1-8 charm slots by base", belt.charmSlots >= 6 and belt.charmSlots <= 8 and belt.charms.is_empty(), belt.get("charmSlots"))
	check("item: only belts get charm slots", not ItemGen.create_item("helm", {"ilvl": 12}).has("charmSlots"))
	var rh := ItemGen.create_item("rhune_ember", {"ilvl": 5, "quality": "magic"})
	eq("item: rhune stays normal + rhune colour", [rh.quality, ItemText.item_color(rh)], ["normal", "#ff9b3d"])
	var curio := ItemGen.create_item("curio_small", {"ilvl": 30, "quality": "rare"})
	eq("item: charm rare -> magic", curio.quality, "magic")
	eq("item: charm names", ["curio_small", "curio_medium", "curio_large"].map(func(b): return ItemBases.get_base(b).name), ["Small Charm", "Large Charm", "Grand Charm"])


func test_text() -> void:
	eq("text: adds fire", Stats.describe_mod({"stat": "addDmg:fire", "value": 3, "value2": 8}), "Adds 3-8 Fire Damage")
	eq("text: cold res", Stats.describe_mod({"stat": "res:cold", "value": 15}), "Cold Resistance +15%")
	eq("text: rhune find", Stats.describe_mod({"stat": "seek:rhune", "value": 20}), "+20% Rhune Find")
	eq("text: charm find", Stats.describe_mod({"stat": "seek:curio", "value": 20}), "+20% Charm Find")
	eq("text: attributes", Stats.describe_mod({"stat": "spirit", "value": 4}), "+4 to Intelligence")
	eq("text: flask", Stats.describe_mod({"stat": "flaskRecovery", "value": 12}), "+12% Faster Flask Recovery")
	eq("text: quirk", ItemText.quirk_text("honk"), "Honks when a unique item drops nearby")
	var merged := Stats.merge_mods([{"stat": "life", "value": 5}, {"stat": "armor", "value": 2}, {"stat": "life", "value": 7}])
	eq("text: merge mods", merged, [{"stat": "life", "value": 12}, {"stat": "armor", "value": 2}])


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
	eq("hero: equipped", h.equipped.keys(), ["weapon", "chest", "offhand", "waist"])
	eq("hero: starter belt has 2 charm slots", [h.equipped.waist.baseId, h.equipped.waist.charmSlots], ["sash", 2])
	eq("hero: empty bag", h.inventory, [])
	eq("hero: no skills", ["pathPoints", "disciplines", "skills", "hotbar", "mana", "quests"].filter(func(k): return h.has(k)), [])
	eq("hero: xp curve", [HeroData.xp_to_next(1), HeroData.xp_to_next(10)], [300, 6928])
	var s := CharacterSheet.compute_sheet(h)
	eq("sheet: life", s.life, 74)
	check("sheet: no mana", not s.has("mana"))
	eq("sheet: damage", s.damage, [3, 8])
	eq("sheet: attack", [s.attack.kind, s.attack.tags], ["melee", ["melee"]])
	var want_armor := floori(h.equipped.chest.baseRoll[0] + h.equipped.offhand.baseRoll[0] + h.equipped.waist.baseRoll[0] + 10 / 4.0)
	eq("sheet: armor", s.armor, want_armor)
	eq("sheet: block", s.block, 15)
	eq("sheet: res", s.res, {"fire": 0, "cold": 0, "lightning": 0, "poison": 0, "void": 0})
	check("sheet: attacks/sec", is_equal_approx(s.attacksPerSec, 1.3 * 1.02), s.attacksPerSec)
	eq("sheet: unmet", s.unmet, [])
	eq("sheet: flask", [s.flask.tier, s.flask.heal, s.flask.cooldown], [0, 250, 10.0])
	# Gear with unmet requirements does nothing.
	h.equipped.weapon = ItemGen.create_item("maul", {"ilvl": 14})
	h.equipped.erase("offhand")
	var s2 := CharacterSheet.compute_sheet(h)
	eq("sheet: unmet maul", s2.unmet, ["weapon"])
	eq("sheet: unmet weapon -> fists", s2.damage, [1, 3])
	# The weapon decides the attack and which attribute adds physical damage.
	h.attrs.finesse = 50
	h.equipped.weapon = ItemGen.create_item("short_bow", {"ilvl": 1})
	var s3 := CharacterSheet.compute_sheet(h)
	eq("sheet: bow shoots (Dexterity)", [s3.attack.kind, s3.damage], ["ranged", [3, 10]])
	h.attrs.spirit = 30
	h.equipped.weapon = ItemGen.create_item("wand", {"ilvl": 1})
	var s4 := CharacterSheet.compute_sheet(h)
	eq("sheet: wand casts (Intelligence)", [s4.attack.kind, s4.attack.tagPct, s4.damage], ["spell", 10.0, [2, 5]])


func test_rhuneword_flow() -> void:
	var h := _fresh_hero()
	Game.set_ui({"left": "", "cursor_mode": ""})
	var inv := Actions.grid_of("inv")
	var sword := ItemGen.create_item("short_sword", {"ilvl": 1})
	sword.sockets = 2
	var ember := ItemGen.create_item("rhune_ember", {"ilvl": 2})
	var ash := ItemGen.create_item("rhune_ash", {"ilvl": 1})
	for it in [sword, ember, ash]:
		Grid.auto_place(inv, it)
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
	# Varn identifies everything, free.
	var hood := ItemGen.create_item("hood", {"ilvl": 10, "quality": "magic"})
	Grid.auto_place(Actions.grid_of("inv"), hood)
	var gold0: int = h.gold
	eq("actions: identify all", Actions.identify_all(), 1)
	check("actions: identify is free", hood.identified and h.gold == gold0)
	var gold: int = h.gold
	var price := ItemText.sell_price(hood)
	Actions.sell(hood)
	eq("actions: sell", h.gold, gold + price)


func test_rings_and_charms() -> void:
	var h := _fresh_hero()
	eq("rings: four slots", Actions.RING_SLOTS.size(), 4)
	var put: Array = []
	for i in 5:
		var r := ItemGen.create_item("ring", {"ilvl": 5, "quality": "magic"})
		Grid.auto_place(Actions.grid_of("inv"), r)
		Actions.right_click_item("inv", r.uid)
		put.append(h.equipped.keys().filter(func(k): return String(k).begins_with("ring")).size())
	eq("rings: right-click fills ring1..ring4, then swaps", put, [1, 2, 3, 4, 4])
	check("rings: every ring slot takes a ring", Actions.RING_SLOTS.all(func(s): return Actions.slot_fits(h.equipped.ring1, s)))
	# Charms: only in the belt, by size.
	var small := ItemGen.create_item("curio_small", {"ilvl": 1})
	small.affixes = [{"affixId": "c_life", "tier": 0, "values": [[6]]}]
	var large := ItemGen.create_item("curio_medium", {"ilvl": 10})
	large.affixes = []
	var grand := ItemGen.create_item("curio_large", {"ilvl": 18})
	grand.affixes = []
	var base: int = CharacterSheet.compute_sheet(h).life # the magic rings may roll life
	Grid.auto_place(Actions.grid_of("inv"), small)
	eq("charms: in the bag they do nothing", CharacterSheet.compute_sheet(h).life, base)
	Actions.right_click_item("inv", small.uid)
	check("charms: right-click slots it into the belt", h.equipped.waist.charms.has(small) and Actions._find_uid(h.inventory, small.uid).is_empty())
	eq("charms: slotted they count", CharacterSheet.compute_sheet(h).life, base + 6)
	eq("charms: sizes", [Actions.charm_size(small), Actions.charm_size(large), Actions.charm_size(grand)], [1, 2, 3])
	check("charms: sash (2 slots) refuses a large charm on top of a small", not Actions.insert_charm(large))
	h.equipped.waist.charmSlots = 8
	check("charms: 8 slots: small + large + grand fit", Actions.insert_charm(large) and Actions.insert_charm(grand))
	eq("charms: used", Actions.belt_used(h.equipped.waist), 6)
	Actions.click_belt_charm(0)
	check("charms: click takes one out", h.cursor == small and Actions.belt_used(h.equipped.waist) == 5)
	h.cursor = null
	var belt: Dictionary = h.equipped.waist
	h.equipped.erase("waist")
	eq("charms: no belt, no charms", CharacterSheet.compute_sheet(h).life, base)
	h.equipped.waist = belt


func test_flask_and_floors() -> void:
	var h := _fresh_hero()
	eq("floors: checkpoints for a new hero", Game.checkpoints(), [1])
	h.bestFloor = 23
	eq("floors: checkpoints every 5th floor reached", Game.checkpoints(), [1, 5, 10, 15, 20])
	eq("flask: medium from floor 20", CharacterSheet.compute_sheet(h).flask.heal, 500)
	h.bestFloor = 50
	eq("flask: large from floor 50", CharacterSheet.compute_sheet(h).flask.heal, 1000)
	var b := ItemGen.create_item("sash", {"ilvl": 30})
	b.affixes = [{"affixId": "flask_recovery", "tier": 2, "values": [[25]]}, {"affixId": "flask_potency", "tier": 1, "values": [[30]]}]
	b.quality = "magic"
	b.identified = true
	h.equipped.waist = b
	h.level = 30 # high-tier affixes raise the belt's level requirement
	var fl: Dictionary = CharacterSheet.compute_sheet(h).flask
	eq("flask: potency and recovery from gear", [fl.heal, fl.cooldown], [1300, 8.0])
	Game.reset_flask()
	Game.set_ui({"phase": "playing", "dead": false})
	h.life = 10
	Game.drink_flask()
	check("flask: heals and starts its cooldown", float(h.life) > 10 and Game.flask_fraction() < 1.0, [h.life, Game.flask_fraction()])
	var after: float = h.life
	h.life = 10
	Game.drink_flask()
	eq("flask: not ready", h.life, 10)
	Game.reset_flask()
	h.life = after
	Game.set_ui({"phase": "loading"})
	eq("monsters: floor 1 pool", Monsters.pool(1), ["skeleton", "ghoul"])
	check("monsters: deeper floors add kinds", Monsters.pool(20).size() == 6 and not "warden" in Monsters.pool(99))
	eq("monsters: boss floors", [Monsters.is_boss_floor(10), Monsters.is_boss_floor(11), Monsters.is_boss_floor(100)], [true, false, true])
	eq("monsters: waves", [Monsters.waves(1), Monsters.waves(10).size(), Monsters.waves(60).size()], [[4, 6, 8], 4, 5])
	check("monsters: scale up", Monsters.life_mult(100) > 50 and Monsters.damage_mult(100) > 20 and Monsters.life_mult(1) == 1.0)


func test_arena() -> void:
	# Every room shape: spawns, the door and the chest spot are reachable from the entry.
	for f in [1, 2, 3]:
		var z := ArenaBuilder.build(f)
		var nav := ZoneNav.new(Vector2i(ArenaBuilder.W, ArenaBuilder.H))
		for b in ZoneRuntime._all(z, "Blocker"):
			nav.block(b.cells())
		for p in ZoneRuntime._all(z, "Prop"):
			if p.block != Vector2i.ZERO:
				nav.block(p.footprint())
		var entry: Vector2 = z.get_meta("entry")
		var targets: Array = z.get_meta("spawns").duplicate()
		targets.append(z.get_meta("center") + Vector2(0, 40))
		targets.append(z.get_meta("door").approach_point() + Vector2(0, 10))
		var bad: Array = []
		for tgt in targets:
			var path := nav.find_path(entry, tgt)
			if path.is_empty() or path.back().distance_to(tgt) > 48:
				bad.append(tgt)
		eq("arena: floor %d (%s) is connected" % [f, ArenaBuilder.SHAPES[(f - 1) % 3]], bad, [])
		check("arena: floor %d has 4 spawn circles and a door" % f, z.get_meta("spawns").size() == 4 and z.get_meta("door") is Prop)
		z.free()


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
	var offers := Economy.gamble_offers()
	check("economy: gamble offers", offers.size() > 10)
	h.inventory.clear()
	Economy.gamble(offers[0].baseId)
	check("economy: gamble", h.inventory.size() == 1 and Game.save.stats.gambles == 1 and h.inventory[0].quality in ["magic", "rare", "unique"])
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
		"chest30": ["chest", 30, {"rarity": 0, "quantity": 0, "gold": 0, "seek": {}}, 5000],
	}
	var t0 := Time.get_ticks_msec()
	for k in cases:
		var c: Array = cases[k]
		var sim := Loot.simulate_drops(c[0], {"ilvl": c[1], "fortune": c[2], "rng": Rng.new(12345)}, c[3])
		eq("loot: %s tally matches reference" % k, sim.tally, REF_SIMS[k].tally)
		eq("loot: %s gold matches reference" % k, sim.gold, REF_SIMS[k].gold)
	print("  (loot sims took %d ms)" % (Time.get_ticks_msec() - t0))
	var drops := Loot.roll_treasure("boss", {"ilvl": 12, "fortune": Loot.NO_FORTUNE})
	check("loot: boss always drops", drops.size() == 6, drops.size())
	var q := {}
	var rng := Rng.new(99)
	for i in 4000:
		var qq := Loot.roll_quality(10, 1, Loot.NO_FORTUNE, {}, rng)
		q[qq] = q.get(qq, 0) + 1
	check("loot: quality spread", q.get("magic", 0) > q.get("rare", 0) and q.get("rare", 0) > q.get("unique", 0) and q.get("normal", 0) > 0, q)
