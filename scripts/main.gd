extends Node
## Boot + phase router. Order: load save → loading screen warms every texture
## (progress bar) → main menu → playing (zone scene + runtime + in-game UI).
## Also owns the lifecycle hooks: flush the save on focus loss and before the
## window closes.

const ZONE_SCENE := "res://scenes/world/thornwick.tscn"

var world: Node2D
var ui_layer: CanvasLayer
var ui_root: Control
var _screen: Control
var _zone: Zone
var _runtime: ZoneRuntime
var _phase := ""
var _warm: PackedStringArray = []
var _warm_i := 0


func _ready() -> void:
	get_tree().set_auto_accept_quit(false)
	world = Node2D.new()
	world.name = "World"
	add_child(world)
	ui_layer = CanvasLayer.new()
	ui_layer.name = "UI"
	ui_layer.layer = 10
	add_child(ui_layer)
	ui_root = Control.new()
	ui_root.name = "UiRoot"
	ui_root.theme = UiKit.theme()
	ui_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(ui_root)
	View.changed.connect(_apply_view)
	_apply_view()
	Game.ui_changed.connect(func(keys): if "phase" in keys: _route())

	Game.boot()
	_warm = Art.art_files()
	_route()


func _apply_view() -> void:
	ui_layer.scale = Vector2(View.ui_scale, View.ui_scale)
	ui_root.size = View.ui_size
	# Rasterize text at device resolution. The pixel fonts are re-gridded
	# (assets/fonts/README.md) so at even UI scales every font pixel is whole
	# device pixels: crisp, and grayscale AA only shows at 1.5x/3x.
	get_viewport().oversampling_override = View.ui_scale


func _process(_d: float) -> void:
	if Game.ui.phase != "loading":
		return
	# Warm a handful of textures per frame so the bar moves.
	var n := 0
	while _warm_i < _warm.size() and n < 12:
		Art.warm(_warm[_warm_i])
		_warm_i += 1
		n += 1
	Game.set_ui({"load_progress": float(_warm_i) / maxf(1.0, _warm.size())})
	if _warm_i >= _warm.size():
		Game.set_ui({"phase": "menu"})


func _route() -> void:
	var phase: String = Game.ui.phase
	if phase == _phase:
		return
	_phase = phase
	if _screen:
		_screen.queue_free()
		_screen = null
	if phase != "playing":
		_leave_zone()
	match phase:
		"loading":
			_screen = LoadingScreen.new()
		"menu":
			_screen = MainMenu.new()
		"playing":
			_enter_zone()
			_screen = PlayingUi.new()
	if _screen:
		ui_root.add_child(_screen)


func _enter_zone() -> void:
	_leave_zone()
	_zone = load(ZONE_SCENE).instantiate()
	world.add_child(_zone)
	_runtime = ZoneRuntime.new()
	_runtime.name = "Runtime"
	world.add_child(_runtime)
	_runtime.setup(_zone)


func _leave_zone() -> void:
	if _runtime:
		_runtime.queue_free()
		_runtime = null
	if _zone:
		_zone.queue_free()
		_zone = null


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_WM_CLOSE_REQUEST:
			if Game.has_hero() or not Game.save.is_empty():
				Game.flush()
			get_tree().quit()
		NOTIFICATION_APPLICATION_FOCUS_OUT:
			if not Game.save.is_empty():
				Game.flush()
		NOTIFICATION_APPLICATION_PAUSED:
			Game.set_ui({"paused": true})
			if not Game.save.is_empty():
				Game.flush()
		NOTIFICATION_APPLICATION_RESUMED:
			Game.set_ui({"paused": false})
