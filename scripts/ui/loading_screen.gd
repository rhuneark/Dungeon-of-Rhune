class_name LoadingScreen
extends Control
## Title + progress bar while main.gd warms the art.

var _bar: Control
var _pct: Label


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_STOP
	var bg := ColorRect.new()
	bg.color = UiKit.INK
	bg.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(bg)
	var col := UiKit.vbox(10)
	col.alignment = BoxContainer.ALIGNMENT_CENTER
	var t := UiKit.label("Dungeon of Rhune", "title36", UiKit.GOLD)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(t)
	_bar = UiKit.bar(0.0, UiKit.GOLD, 220, 6)
	_bar.size_flags_horizontal = SIZE_SHRINK_CENTER
	col.add_child(_bar)
	_pct = UiKit.label("Carving rhunes… 0%", "t10", UiKit.DIM)
	_pct.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	col.add_child(_pct)
	add_child(col)
	Game.ui_changed.connect(func(keys): if "load_progress" in keys: _refresh())
	View.changed.connect(_layout)
	_layout()


func _layout() -> void:
	size = View.ui_size
	get_child(0).size = size
	get_child(1).size = size


func _refresh() -> void:
	var p: float = Game.ui.load_progress
	_bar.pct = p
	_bar.queue_redraw()
	_pct.text = "Carving rhunes… %d%%" % roundi(p * 100)
