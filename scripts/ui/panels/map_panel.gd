class_name MapPanel
extends UiPanel
## The expedition map (full overlay, M): the rooms ahead as a branching path,
## left to right, ending at the Warden's vault. Hover a room to read what it
## grants and what it costs; click a lit one to walk in. The right column also
## tallies what the expedition has given you so far (boons, synergies) and
## what it has put on you (afflictions, dreads, Threat).

var _info: VBoxContainer
var _canvas: MapCanvas


func _init() -> void:
	side = "full"
	title = "Expedition"


func build(body: VBoxContainer) -> void:
	var e := Game.expedition()
	if e.is_empty():
		body.add_child(UiKit.para("No expedition charted. Talk to Maren at the map table.", "t10", UiKit.DIM, HORIZONTAL_ALIGNMENT_CENTER))
		return
	title = "Expedition · Tier %d" % int(e.tier)
	var row := UiKit.hbox(8)
	_canvas = MapCanvas.new()
	_canvas.e = e
	_canvas.custom_minimum_size = Vector2(maxf(380.0, View.ui_size.x - 300.0), View.ui_size.y - 130.0)
	_canvas.hovered_changed.connect(_show)
	_canvas.picked.connect(_pick)
	row.add_child(_canvas)
	_info = UiKit.vbox(2)
	_info.custom_minimum_size.x = 250
	_info.size_flags_horizontal = SIZE_EXPAND_FILL
	row.add_child(_info)
	body.add_child(row)
	var foot := UiKit.hbox(6)
	foot.add_child(UiKit.label(_hint(e), "t10", UiKit.DIM))
	foot.add_child(UiKit.spacer())
	foot.add_child(UiKit.button("Close (M)", close))
	body.add_child(foot)
	_show("")


static func _can_walk() -> bool:
	if Game.ui.location != "room":
		return true
	return Arena.current != null and Arena.current.state in ["cleared", "looted"]


static func _hint(e: Dictionary) -> String:
	if not _can_walk():
		return "Clear this room first; then pick the next one here."
	var opts := Expedition.options(e)
	if opts.size() == 1 and opts[0] == e.at:
		return "You left this room unfinished. Walk back in to finish it."
	return "Lit rooms are open to you. Click one to walk in."


func _pick(id: String) -> void:
	if not _can_walk():
		Game.float_text("Clear this room first.", "#e8e4d8")
		return
	Game.enter_room(id)


func _show(id: String) -> void:
	if _info == null:
		return
	for c in _info.get_children():
		_info.remove_child(c)
		c.queue_free()
	var e := Game.expedition()
	if id != "":
		_room_block(e, id)
		_info.add_child(UiKit.gap(4))
		_info.add_child(UiKit.hline())
		_info.add_child(UiKit.gap(2))
	for l in summary_lines(e, true):
		var lab := UiKit.para(String(l[0]), "t10", l[1])
		_info.add_child(lab)


func _room_block(e: Dictionary, id: String) -> void:
	var n := Expedition.node(e, id)
	var r := Expeditions.room(String(n.type))
	var head := UiKit.label(String(r.name) + (" (greedy)" if n.greedy else ""), "t20", Color(String(r.color)))
	_info.add_child(head)
	_info.add_child(UiKit.label("Monster level %d%s" % [Expedition.level_of(int(e.tier), int(n.step)), "  ·  cleared" if Expedition.is_cleared(e, id) else ""], "t10", UiKit.FAINT))
	_info.add_child(UiKit.para(String(r.desc), "t10", UiKit.DIM))
	if r.boon != "" and r.boon != "respite":
		var b: Dictionary = Expeditions.BOONS[r.boon]
		_info.add_child(UiKit.label("Grants %s%s" % [b.name, " x%d" % int(n.stacks) if int(n.stacks) > 1 else ""], "t10", UiKit.GOOD))
		for line in Expedition.stat_lines(b.stats, int(n.stacks)):
			_info.add_child(UiKit.label("  " + String(line), "t10", UiKit.GOOD))
	for a in n.afflictions:
		var af: Dictionary = Expeditions.AFFLICTIONS[a]
		_info.add_child(UiKit.label("Afflicts %s: %s (+%d Threat)" % [af.name, af.desc, int(af.threat)], "t10", UiKit.BAD))


## The expedition so far, as [text, colour] lines (also the HUD tooltip).
static func summary_lines(e: Dictionary, colored := false) -> Array:
	var out: Array = []
	if e.is_empty():
		return out
	var c := func(text: String, col: Color): return [text, col] if colored else text
	out.append(c.call("Threat %d: +%d%% Rarity, +%d%% Quantity, +%d%% XP" % [int(e.threat), int(e.threat * Expeditions.THREAT_RARITY), int(e.threat * Expeditions.THREAT_QUANTITY), int(e.threat * Expeditions.THREAT_XP)], UiKit.GOLD))
	if e.boons.is_empty():
		out.append(c.call("No boons yet.", UiKit.FAINT))
	for b in e.boons:
		var def: Dictionary = Expeditions.BOONS[b]
		out.append(c.call("%s x%d: %s" % [def.name, int(e.boons[b]), ", ".join(Expedition.stat_lines(def.stats, int(e.boons[b])))], UiKit.GOOD))
	for s in Expedition.synergies(e):
		out.append(c.call("Synergy %s: %s" % [s.name, s.desc], UiKit.RARE))
	for a in e.afflictions:
		var def: Dictionary = Expeditions.AFFLICTIONS[a]
		out.append(c.call("%s x%d: %s" % [def.name, int(e.afflictions[a]), def.desc], UiKit.BAD))
	for d in Expedition.dreads(e):
		out.append(c.call("Dread %s: %s" % [d.name, d.desc], Color("#ff6a5a")))
	return out


## Draws the path: rooms as framed icons by step (columns) and lane (rows),
## lines for the ways between them.
class MapCanvas extends Control:
	signal hovered_changed(id: String)
	signal picked(id: String)

	const BOX := 40.0
	var e: Dictionary = {}
	var hovered := ""

	func _init() -> void:
		mouse_filter = MOUSE_FILTER_STOP

	func _pos(id: String) -> Vector2:
		var steps := float(Expeditions.STEPS + 1)
		if id == Expedition.START:
			return Vector2(28, roundf(size.y / 2.0))
		var n := Expedition.node(e, id)
		var x := 28.0 + float(n.step) * (size.x - 56.0) / steps
		var y := 30.0 + float(n.lane) * (size.y - 60.0) / 2.0
		return Vector2(x, y).round()

	func _gui_input(ev: InputEvent) -> void:
		if ev is InputEventMouseMotion:
			var id := _node_at(ev.position)
			if id != hovered:
				hovered = id
				queue_redraw()
				hovered_changed.emit(id)
		elif ev is InputEventMouseButton and ev.pressed and ev.button_index == MOUSE_BUTTON_LEFT:
			var id := _node_at(ev.position)
			if id != "" and Expedition.can_enter(e, id):
				picked.emit(id)
				accept_event()

	func _node_at(p: Vector2) -> String:
		for id in e.nodes:
			if Rect2(_pos(id) - Vector2(BOX, BOX) / 2.0, Vector2(BOX, BOX)).has_point(p):
				return id
		return ""

	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), UiKit.WELL)
		var open := Expedition.options(e)
		var path: Array = [Expedition.START] + Array(e.cleared)
		# Ways between rooms: walked (gold), open now (bright), the rest (faint).
		for from in e.edges:
			for to in e.edges[from]:
				var col := Color(UiKit.EDGE, 0.8)
				var w := 1.0
				if from in path and (to in path):
					col = UiKit.GOLD
					w = 2.0
				elif (from == e.at or (from == Expedition.START and e.at == Expedition.START)) and to in open:
					col = UiKit.PARCH
					w = 2.0
				draw_line(_pos(from), _pos(to), col, w)
		# The Refuge, where every expedition starts.
		draw_circle(_pos(Expedition.START), 6.0, UiKit.GOLD)
		for id in e.nodes:
			_draw_node(id, id in open)

	func _draw_node(id: String, open: bool) -> void:
		var n := Expedition.node(e, id)
		var r := Expeditions.room(String(n.type))
		var c := _pos(id)
		var rect := Rect2(c - Vector2(BOX, BOX) / 2.0, Vector2(BOX, BOX))
		var cleared := Expedition.is_cleared(e, id)
		var frame := UiKit.EDGE
		if cleared:
			frame = UiKit.GOOD
		elif id == e.at:
			frame = UiKit.GOLD
		elif open:
			frame = UiKit.PARCH
		if n.greedy and not cleared:
			frame = UiKit.BAD if not open else Color("#ff6a5a")
		draw_rect(rect, UiKit.PANEL)
		draw_rect(rect, frame, false, 2.0 if open or id == hovered else 1.0)
		var tex := Art.icon_texture(String(r.icon))
		if tex:
			var s := 1.0 if tex.get_width() <= 32 else 0.5
			var sz := Vector2(tex.get_width(), tex.get_height()) * s
			var mod := Color(1, 1, 1, 1.0 if open or cleared or id == hovered else 0.45)
			draw_texture_rect(tex, Rect2((c - sz / 2.0).round(), sz), false, mod)
		# One red pip per point of Threat the room would add.
		for i in int(n.threat):
			draw_rect(Rect2(rect.position + Vector2(3 + i * 5, BOX - 6), Vector2(3, 3)), UiKit.BAD)
		if cleared:
			draw_rect(Rect2(rect.position + Vector2(BOX - 8, 3), Vector2(5, 5)), UiKit.GOOD)
		if id == hovered:
			draw_rect(rect.grow(2), Color(UiKit.GOLD, 0.6), false, 1.0)
