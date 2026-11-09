class_name UiPanel
extends PanelContainer
## Base for every window: framed box with a title bar and close button that
## rebuilds its body whenever the save changes (Game.changed) — content is
## derived from the save, so a rebuild is always correct. Per-panel view
## state (tabs, selections) lives in member vars and survives rebuilds.
## Rebuilds are deferred to _process so a button can safely trigger one.

## "left" | "right" | "full"
var side := "left"
var panel_width := 340.0
var title := ""
var closable := true
var _dirty := true
var _scroll_mem := {}
var _scrolls := {}


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	Game.changed.connect(mark)
	View.changed.connect(_place)
	_place()


func mark() -> void:
	_dirty = true


func _process(_d: float) -> void:
	if _dirty:
		_dirty = false
		_rebuild()
	if side == "full":
		# Word-wrapped labels report huge heights for one layout pass; a
		# container never shrinks on its own, so pin the overlay's size.
		var want := Vector2(View.ui_size.x - 12, View.ui_size.y - 58)
		if size != want:
			size = want
	elif size.y > get_combined_minimum_size().y + 0.5:
		# ...and side panels shrink back to their content once wrapping settles.
		reset_size()


## Override: fill the body.
func build(_body: VBoxContainer) -> void:
	pass


## Override for side effects on close (default: clear this panel's slot).
func close() -> void:
	match side:
		"right": Game.set_ui({"right": ""})
		"full": Game.set_ui({"overlay": ""})
		_: Game.set_ui({"left": "", "service_npc": ""})


func _rebuild() -> void:
	for k in _scrolls:
		if is_instance_valid(_scrolls[k]):
			_scroll_mem[k] = _scrolls[k].scroll_vertical
	_scrolls.clear()
	for c in get_children():
		remove_child(c)
		c.queue_free()
	var root := UiKit.vbox(0)
	add_child(root)

	var header := Control.new()
	header.custom_minimum_size = Vector2(0, 20)
	header.mouse_filter = MOUSE_FILTER_IGNORE
	var t := UiKit.label(title, "title18", UiKit.GOLD)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	t.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	header.add_child(t)
	if closable:
		var x := UiKit.button("x", close, 4)
		x.tooltip_text = ""
		header.add_child(x)
		header.resized.connect(func(): x.position = Vector2(header.size.x - x.size.x, 0))
	root.add_child(header)
	root.add_child(UiKit.gap(1))
	root.add_child(UiKit.hline())
	root.add_child(UiKit.gap(4))

	var body := UiKit.vbox(2)
	root.add_child(body)
	build(body)
	reset_size()
	_place()


## A remembered-scroll area of fixed height; add content to the returned box.
func scroll_area(key: String, height: float) -> Array:
	var sc := ScrollContainer.new()
	sc.custom_minimum_size = Vector2(0, height)
	sc.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	sc.mouse_filter = MOUSE_FILTER_PASS
	var inner := UiKit.vbox(2)
	inner.size_flags_horizontal = SIZE_EXPAND_FILL
	sc.add_child(inner)
	_scrolls[key] = sc
	if _scroll_mem.has(key):
		var v: int = _scroll_mem[key]
		(func(): if is_instance_valid(sc): sc.scroll_vertical = v).call_deferred()
	return [sc, inner]


func _place() -> void:
	var ui := View.ui_size
	match side:
		"full":
			position = Vector2(6, 6)
			custom_minimum_size = Vector2(ui.x - 12, ui.y - 58)
			size = custom_minimum_size
		"right":
			custom_minimum_size.x = panel_width
			position = Vector2(ui.x - 6 - size.x, 6)
		_:
			custom_minimum_size.x = panel_width
			position = Vector2(6, 6)


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and side == "right":
		position.x = View.ui_size.x - 6 - size.x
