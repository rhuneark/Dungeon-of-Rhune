extends UiPanel
## Attributes, defense, offense and Fortune (the targeted find stats).


func _init() -> void:
	title = "Character"
	panel_width = 340


func _row(box: VBoxContainer, label: String, value: String, color := UiKit.PARCH, tip := "") -> void:
	var r := UiKit.stat_row(label, value, color)
	if tip != "":
		r.mouse_filter = MOUSE_FILTER_PASS
		r.gui_input.connect(func(e): if e is InputEventMouseMotion: UiTip.text(r, "", [tip]))
	box.add_child(r)


func _spend(a: String) -> void:
	var hero := Game.hero()
	if int(hero.attrPoints) <= 0:
		return
	hero.attrs[a] = int(hero.attrs[a]) + 1
	hero.attrPoints = int(hero.attrPoints) - 1
	Game.commit()


func build(body: VBoxContainer) -> void:
	var hero := Game.hero()
	var sh := Game.sheet()
	var head := UiKit.vbox(0)
	var n := UiKit.label(hero.name, "t20")
	n.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.add_child(n)
	var lv := UiKit.label("Level %d %s" % [int(hero.level), Disciplines.combo_title(hero.disciplines[0], hero.disciplines[1])], "t10", UiKit.GOLD)
	lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.add_child(lv)
	var need := HeroData.xp_to_next(int(hero.level))
	var b := UiKit.bar(float(hero.xp) / need, UiKit.GOLD, 220, 4)
	b.size_flags_horizontal = SIZE_SHRINK_CENTER
	head.add_child(b)
	var xp := UiKit.label("%d / %d XP" % [int(hero.xp), need], "s8", UiKit.DIM)
	xp.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.add_child(xp)
	body.add_child(head)
	body.add_child(UiKit.gap(2))

	var cols := UiKit.hbox(8)
	var l := UiKit.vbox(0)
	var r := UiKit.vbox(0)
	l.size_flags_horizontal = SIZE_EXPAND_FILL
	r.size_flags_horizontal = SIZE_EXPAND_FILL
	cols.add_child(l)
	cols.add_child(r)
	body.add_child(cols)

	var pts := int(hero.attrPoints)
	l.add_child(UiKit.label("ATTRIBUTES" + (" (%d TO SPEND)" % pts if pts > 0 else ""), "s8", UiKit.GOOD if pts > 0 else UiKit.DIM))
	for a in HeroData.ATTRS:
		var info: Dictionary = HeroData.ATTR_INFO[a]
		var row := UiKit.hbox(4)
		row.mouse_filter = MOUSE_FILTER_PASS
		row.add_child(UiKit.label(info.name, "t10", UiKit.DIM))
		row.add_child(UiKit.spacer())
		var val := int(sh.attrs[a])
		row.add_child(UiKit.label(str(val), "t10", UiKit.MAGIC if val > int(hero.attrs[a]) else UiKit.PARCH))
		if pts > 0:
			var aa: String = a
			row.add_child(UiKit.button("+", func(): _spend(aa), 3))
		row.gui_input.connect(func(e): if e is InputEventMouseMotion: UiTip.text(row, info.name, [info.desc]))
		l.add_child(row)
		l.add_child(UiKit.hline(UiKit.ROW_LINE))

	l.add_child(UiKit.gap(4))
	l.add_child(UiKit.label("DEFENSE", "s8", UiKit.DIM))
	_row(l, "Life", str(int(sh.life)), Color("#e06a5a"))
	_row(l, "Mana", str(int(sh.mana)), UiKit.MAGIC)
	_row(l, "Armor", str(int(sh.armor)))
	_row(l, "Block", "%d%%" % int(sh.block))
	var cap: int = CharacterSheet.RES_CAP
	for t in ["fire", "cold", "lightning", "poison", "void"]:
		var v := int(sh.res.get(t, 0))
		var c := UiKit.GOOD if v >= cap else (UiKit.BAD if v < 0 else UiKit.PARCH)
		_row(l, "%s Res" % Stats.DAMAGE_TYPE_NAMES[t], "%d%%" % mini(cap, v), c, "Uncapped: %d%% (cap %d%%)" % [v, cap])
	_row(l, "Damage Reduced", str(int(sh.raw.get("dmgReduce", 0))))
	_row(l, "Thorns", str(int(sh.raw.get("thorns", 0))))

	r.add_child(UiKit.label("OFFENSE", "s8", UiKit.DIM))
	_row(r, "Weapon Damage", "%d-%d" % [int(sh.damage[0]), int(sh.damage[1])])
	for t in sh.adds:
		var rng: Array = sh.adds[t]
		_row(r, "+ %s" % Stats.DAMAGE_TYPE_NAMES[t], "%d-%d" % [int(rng[0]), int(rng[1])], UiKit.MAGIC)
	_row(r, "Attacks / sec", "%.2f" % float(sh.attacksPerSec))
	_row(r, "Crit Chance", "%.1f%%" % float(sh.critChance))
	_row(r, "Crit Damage", "+%s%%" % UiKit.fmt_num(sh.critDamage))
	_row(r, "Cast Speed", "+%s%%" % UiKit.fmt_num(sh.castSpeed))
	_row(r, "Move Speed", "+%s%%" % UiKit.fmt_num(sh.moveSpeed))
	_row(r, "Life Regen", UiKit.fmt_num(sh.lifeRegen))
	r.add_child(UiKit.gap(4))
	r.add_child(UiKit.label("FORTUNE", "s8", UiKit.GOLD))
	var f: Dictionary = sh.fortune
	_row(r, "Rarity Find", "+%s%%" % UiKit.fmt_num(f.rarity), UiKit.GOLD, "Better quality on every item that drops (diminishing returns for rare and unique).")
	_row(r, "Item Quantity", "+%s%%" % UiKit.fmt_num(f.quantity), UiKit.GOLD, "Fewer empty drops.")
	_row(r, "Extra Gold", "+%s%%" % UiKit.fmt_num(f.gold), UiKit.GOLD)
	for k in Stats.SEEK_KINDS:
		var v: float = float(f.seek.get(k, 0))
		var nm: String = Stats.SEEK_NAMES[k]
		var tip := "Only boosts the unique roll." if k == "unique" else "More %s drops: multiplies how often loot of this kind is picked." % nm.to_lower()
		_row(r, "%s Find" % nm, "+%s%%" % UiKit.fmt_num(v), UiKit.GOLD if v > 0 else UiKit.FAINT, tip)
