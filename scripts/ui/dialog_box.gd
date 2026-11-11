class_name DialogBox
extends PanelContainer
## NPC conversation box (D2's talk window): line, quest notes, services.

const SERVICE_LABEL := {
	"trade": "Trade", "herbs": "Trade", "gamble": "Sealed Goods", "smith": "Crucible & Sockets",
	"identify": "Identify Items", "codex": "Codex", "gate": "The Wilds?",
}


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	Game.ui_changed.connect(func(keys): if "dialog" in keys: _rebuild())
	View.changed.connect(_place)
	_rebuild()


func _rebuild() -> void:
	for c in get_children():
		remove_child(c)
		c.queue_free()
	var d: Dictionary = Game.ui.dialog
	visible = not d.is_empty()
	if d.is_empty():
		return
	custom_minimum_size = Vector2(420, 0)
	add_theme_stylebox_override("panel", UiKit.frame(9))
	var v := UiKit.vbox(3)
	var head := UiKit.hbox(4)
	head.add_child(UiKit.label(d.title, "head", UiKit.GOLD))
	head.add_child(UiKit.spacer())
	if d.get("sub", "") != "":
		head.add_child(UiKit.label(String(d.sub).to_upper(), "label", UiKit.DIM))
	v.add_child(head)
	v.add_child(UiKit.para(d.line))
	for n in d.get("notes", []):
		v.add_child(UiKit.para(n, "t10", UiKit.GOLD))
	v.add_child(UiKit.gap(2))
	var row := HFlowContainer.new()
	row.add_theme_constant_override("h_separation", 4)
	row.add_theme_constant_override("v_separation", 4)
	var npc_id: String = d.get("npcId", "")
	var npc := Npcs.get_npc(npc_id) if npc_id != "" else {}
	if not npc.is_empty():
		for sv in npc.services:
			var s: String = sv
			row.add_child(UiKit.button(SERVICE_LABEL.get(s, s), func(): Interact.npc_service(npc_id, s)))
		row.add_child(UiKit.button("Talk", func(): Interact.talk_to(npc_id)))
	row.add_child(UiKit.button("Leave", func(): Game.set_ui({"dialog": {}})))
	v.add_child(row)
	add_child(v)
	reset_size()
	_place.call_deferred()


func _place() -> void:
	reset_size()
	position = Vector2(roundf((View.ui_size.x - size.x) / 2.0), View.ui_size.y - 56 - size.y)


func _process(_d: float) -> void:
	if visible and size.y > get_combined_minimum_size().y + 0.5:
		reset_size()


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		position = Vector2(roundf((View.ui_size.x - size.x) / 2.0), View.ui_size.y - 56 - size.y)
