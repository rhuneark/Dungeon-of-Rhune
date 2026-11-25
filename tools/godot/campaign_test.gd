extends Node
## Plays expeditions from Tier 1 like a careful (if unimaginative) player, to
## check the difficulty curve: it fights (nearest monster, flask under half
## life), opens the chest, picks everything up, then does what a Refuge trip
## would: identify, equip upgrades, slot charms, spend attribute points, sell
## the rest and buy shop upgrades. Its path: greedy rooms while Threat is low,
## safe rooms (and Sanctuaries) once it climbs. Death loses the expedition, as
## it would yours; it charts the same tier again. One line per room, one per
## expedition; CAMPAIGN OK when it finishes the target tier.
## --fixed-fps 60 runs it faster than real time:
##   godot --headless --path . --fixed-fps 60 --audio-driver Dummy \
##     -s tools/godot/run.gd -- res://tools/godot/campaign_test.gd [tiers] [max_deaths] [greed]

const VENDORS := ["pell", "brannoc"]

var target := 4
var max_deaths := 6
## Take greedy rooms while Threat is below this.
var greed := 4
var frame := 0
var phase := "menu"
var t := 0.0
var arena: Arena
var rt
var stats := {}
var deaths := 0
var started := 0.0


func _ready() -> void:
	var a: Array = get_meta("args", [])
	if a.size() > 0:
		target = int(a[0])
	if a.size() > 1:
		max_deaths = int(a[1])
	if a.size() > 2:
		greed = int(a[2])
	SaveIO.dir = "user://campaign_saves_%d" % OS.get_process_id()


func _find(n: Node, cls: String) -> Node:
	for c in n.get_children():
		if c.get_script() and c.get_script().get_global_name() == cls:
			return c
		var r := _find(c, cls)
		if r:
			return r
	return null


func _process(delta: float) -> void:
	frame += 1
	t += delta
	match phase:
		"menu":
			if frame == 30:
				SaveIO.wipe_save()
				var m := _find(get_tree().root, "MainMenu")
				m._name = "Bot"
				m._start()
				phase = "refuge"
				t = 0
		"refuge":
			if t > 0.5:
				if started == 0.0:
					started = Game.clock
				_manage()
				if not Expedition.active(Game.hero()):
					Game.start_expedition(mini(target, Expedition.max_tier(Game.hero())))
					stats.exp_t0 = Game.clock
				Game.enter_room(_choose())
				phase = "enter"
				t = 0
		"enter":
			var a := Arena.current
			if a != null and a != arena and t > 0.2:
				arena = a
				rt = _find(get_tree().root, "ZoneRuntime")
				stats = {"t0": Game.clock, "flasks": 0, "min": 1.0, "exp_t0": stats.get("exp_t0", Game.clock)}
				phase = "fight"
				t = 0
		"fight":
			_fight()
		"loot":
			if t > 2.5:
				for e in rt.ground_items.entries.duplicate():
					if e.landed and rt._pickup(e):
						rt.ground_items.remove(e)
				_manage()
				_report()
				var e := Game.expedition()
				if e.get("done", false):
					print("EXPEDITION T%d done  %.1f min  threat %d  boons %s  afflictions %s" % [int(e.tier), (Game.clock - float(stats.exp_t0)) / 60.0, int(e.threat), e.boons, e.afflictions])
					var tier := int(e.tier)
					Game.finish_expedition()
					Game.return_to_refuge()
					if tier >= target:
						print("CAMPAIGN OK tiers=%d level=%d deaths=%d minutes=%.1f" % [tier, Game.hero().level, deaths, (Game.clock - started) / 60.0])
						get_tree().quit(0)
						return
					phase = "refuge"
				else:
					Game.enter_room(_choose())
					phase = "enter"
				t = 0


func _fight() -> void:
	var h := Game.hero()
	var sh := Game.sheet()
	if Game.ui.dead:
		deaths += 1
		print("  DIED in %s (T%d level %d) after %.0fs (hero level %d, life %d)" % [arena.room.name, int(arena.exp.tier), arena.level, Game.clock - float(stats.t0), h.level, sh.life])
		if deaths > max_deaths:
			print("CAMPAIGN WALL tier=%d deaths=%d" % [int(arena.exp.tier), deaths])
			get_tree().quit(1)
			return
		Game.return_to_refuge()
		phase = "refuge"
		t = 0
		return
	stats.min = minf(float(stats.min), float(h.life) / float(sh.life))
	if float(h.life) < float(sh.life) * 0.5 and Game.flask_fraction() >= 1.0:
		Game.drink_flask()
		stats.flasks = int(stats.flasks) + 1
	var tgt = rt.player.target
	stats.retarget = float(stats.get("retarget", 0.0)) - get_process_delta_time()
	if tgt == null or not is_instance_valid(tgt) or tgt.dead or float(stats.retarget) <= 0.0:
		stats.retarget = 3.0
		var best = null
		for m in arena.mobs:
			if not m.dead and m.state != "spawn" and (best == null or m.position.distance_to(rt.player.pos) < best.position.distance_to(rt.player.pos)):
				best = m
		rt.player.target = best
	if arena.state == "cleared":
		if arena.chest:
			arena.open_chest()
		phase = "loot"
		t = 0
	elif Game.clock - float(stats.t0) > 600:
		print("CAMPAIGN TIMEOUT %s alive=%d state=%s player=%s" % [arena.room.name, arena.alive(), arena.state, rt.player.pos])
		var tg = rt.player.target
		if tg != null and is_instance_valid(tg):
			print("  target %s at %s dist=%.0f los=%s path=%s swing=%.2f pend=%s" % [tg.def.id, tg.position, tg.position.distance_to(rt.player.pos), rt.nav.line_of_sight(rt.player.pos, tg.position), rt.player.path, rt.player.swing, rt.player.get("pending")])
			print("  find_path=%s" % [rt.nav.find_path(rt.player.pos, tg.position)])
		for m in arena.mobs:
			if not m.dead:
				print("  mob %s state=%s at %s walkable=%s" % [m.def.id, m.state, m.position, rt.nav.walkable(m.position)])
		get_tree().quit(1)


func _report() -> void:
	var h := Game.hero()
	var sh := CharacterSheet.compute_sheet(h)
	var wpn: Dictionary = h.equipped.get("weapon", {})
	var res: Dictionary = sh.res
	var n: Dictionary = arena.room_node
	var tag := "%s%s" % [arena.room.name, (" (greedy: %s)" % ",".join(n.afflictions)) if n.greedy else ""]
	print("T%d R%d L%2d %-38s %4.0fs  lvl %2d  life %4d  dps %5.1f  armor %4d  res f%d c%d  flasks %d  low %3d%%  threat %d  gold %5d  %s" % [
		int(arena.exp.tier), int(n.step), arena.level, tag, Game.clock - float(stats.t0), h.level, sh.life, _dps(sh), sh.armor, res.get("fire", 0), res.get("cold", 0),
		stats.flasks, roundi(float(stats.min) * 100.0), int(arena.exp.threat), h.gold, ItemText.item_name(wpn) if not wpn.is_empty() else "fists"])
	if OS.has_environment("CAMPAIGN_VERBOSE"):
		var gear: Array = []
		for slot in h.equipped:
			var it: Dictionary = h.equipped[slot]
			gear.append("%s=%s(%s)" % [slot, it.baseId, it.quality])
		print("     attrs %s  unmet %s  %s" % [sh.attrs, sh.unmet, " ".join(gear)])


## The next room: greedy ones while Threat is low; past that, a Sanctuary if
## one is open, else the room adding the least Threat.
func _choose() -> String:
	var e := Game.expedition()
	var opts := Expedition.options(e)
	var best: String = opts[0]
	var best_v := -999.0
	for id in opts:
		var n := Expedition.node(e, id)
		var v := randf() * 0.5
		if int(e.threat) < greed:
			v += 2.0 if n.greedy else 0.0
		else:
			v -= float(n.threat) * 2.0
			if n.type == "sanctuary" and not e.taken.is_empty():
				v += 3.0
		if v > best_v:
			best_v = v
			best = id
	return best


# ---------------------------------------------------------- the Refuge trip
func _manage() -> void:
	var h := Game.hero()
	Actions.identify_all()
	_equip_upgrades(h)
	for it in h.inventory.duplicate():
		if Actions.charm_size(it) > 0 and h.equipped.has("waist"):
			var belt: Dictionary = h.equipped.waist
			if Actions.belt_used(belt) + Actions.charm_size(it) <= Actions.belt_capacity(belt):
				Grid.remove_item(Actions.grid_of("inv"), it.uid)
				Actions.insert_charm(it)
	_spend_points(h)
	for it in h.inventory.duplicate():
		Actions.sell(it)
	_shop(h)
	_equip_upgrades(h)
	_spend_points(h)
	for it in h.inventory.duplicate():
		Actions.sell(it)
	Game.commit()


func _slots_for(item: Dictionary) -> Array:
	var out: Array = []
	var h := Game.hero()
	var two_h: bool = h.equipped.has("weapon") and ItemBases.get_base(h.equipped.weapon.baseId).twoHanded
	for s in Actions.EQUIP_SLOTS:
		if Actions.slot_fits(item, s) and not (s == "offhand" and two_h):
			out.append(s)
	return out


## Wear `item` in `slot` if that scores better (belts take the old belt's charms).
func _try_equip(h: Dictionary, item: Dictionary, slot: String, apply: bool) -> float:
	var old: Dictionary = h.equipped.get(slot, {})
	var before := _score(h)
	var moved: Array = []
	# A two-hander frees the off hand (back to the bag if it's worn).
	var off: Dictionary = {}
	if slot == "weapon" and ItemBases.get_base(item.baseId).twoHanded and h.equipped.has("offhand"):
		off = h.equipped.offhand
		h.equipped.erase("offhand")
	if slot == "waist" and not old.is_empty():
		item.charms = item.get("charms", [])
		for c in old.get("charms", []):
			if Actions.belt_used(item) + Actions.charm_size(c) <= Actions.belt_capacity(item):
				moved.append(c)
		item.charms.append_array(moved)
	h.equipped[slot] = item
	var after := _score(h)
	if not apply or after <= before * 1.01:
		if old.is_empty():
			h.equipped.erase(slot)
		else:
			h.equipped[slot] = old
		for c in moved:
			item.charms.erase(c)
		if not off.is_empty():
			h.equipped.offhand = off
		return after / maxf(0.001, before)
	for c in moved:
		old.charms.erase(c)
	if not off.is_empty() and not Grid.auto_place(Actions.grid_of("inv"), off):
		h.gold += ItemText.sell_price(off)
	return after / maxf(0.001, before)


func _equip_upgrades(h: Dictionary) -> void:
	for pass_i in 3:
		for it in h.inventory.duplicate():
			if Actions.charm_size(it) > 0:
				continue
			var best_slot := ""
			var best := 1.01
			for s in _slots_for(it):
				var gain := _try_equip(h, it, s, false)
				if gain > best:
					best = gain
					best_slot = s
			if best_slot == "":
				continue
			var old: Dictionary = h.equipped.get(best_slot, {})
			Grid.remove_item(Actions.grid_of("inv"), it.uid)
			it.erase("x")
			it.erase("y")
			_try_equip(h, it, best_slot, true)
			if not old.is_empty():
				if not Grid.auto_place(Actions.grid_of("inv"), old):
					h.gold += ItemText.sell_price(old)


func _spend_points(h: Dictionary) -> void:
	# Like most players: two points a level into Strength (to wear armor)
	# until 50, the rest wherever it helps most.
	while int(h.attrPoints) > 0 and int(h.attrs.might) < mini(50, 10 + 2 * (int(h.level) - 1)):
		h.attrs.might = int(h.attrs.might) + 1
		h.attrPoints = int(h.attrPoints) - 1
	while int(h.attrPoints) > 0:
		var best := "vigor"
		var best_score := -1.0
		for a in ["vigor", "might", "finesse", "spirit"]:
			h.attrs[a] = int(h.attrs[a]) + 1
			var s := _score(h) * (1.02 if a == "vigor" else 1.0)
			h.attrs[a] = int(h.attrs[a]) - 1
			if s > best_score:
				best_score = s
				best = a
		h.attrs[best] = int(h.attrs[best]) + 1
		h.attrPoints = int(h.attrPoints) - 1


func _shop(h: Dictionary) -> void:
	for round_i in 4:
		var buy := {}
		var gain_best := 1.04
		for v in VENDORS:
			var grid := Economy.vendor_grid(v)
			for it in grid.items:
				var price := Economy.vendor_price(it)
				if price > int(h.gold):
					continue
				for s in _slots_for(it):
					var gain := _try_equip(h, it, s, false)
					if gain > gain_best:
						gain_best = gain
						buy = {"vendor": v, "item": it}
		if buy.is_empty():
			return
		Economy.buy(buy.vendor, buy.item.uid)
		_equip_upgrades(h)


# ---------------------------------------------------------------- scoring
func _dps(sh: Dictionary) -> float:
	var dmg: Array = sh.damage
	var avg := (float(dmg[0]) + float(dmg[1])) / 2.0
	for k in sh.adds:
		var ad: Array = sh.adds[k]
		avg += (float(ad[0]) + float(ad[1])) / 2.0
	var cc := minf(float(sh.critChance), 95.0) / 100.0
	return avg * float(sh.attacksPerSec) * (1.0 + cc * float(sh.critDamage) / 100.0) * (1.0 + float(sh.attack.tagPct) / 100.0)


func _score(h: Dictionary) -> float:
	var sh := CharacterSheet.compute_sheet(h)
	var fl := float(arena.level + 1) if arena != null and is_instance_valid(arena) else 2.0
	var armor := float(sh.armor)
	var dr := minf(0.8, armor / (armor + 30.0 + 12.0 * fl))
	var res: Dictionary = sh.res
	var r := 0.0
	for k in ["fire", "cold"]:
		r += minf(75.0, float(res.get(k, 0))) / 200.0
	var taken := (1.0 - dr) * 0.75 + (1.0 - r) * 0.25
	var ehp := float(sh.life) / taken / (1.0 - minf(0.75, float(sh.block)) / 100.0 * 0.7)
	return _dps(sh) * ehp
