extends Node
## Boot + phase router. Order: load save → loading screen warms every texture
## (progress bar) → main menu → playing (zone + runtime + in-game UI).
## While playing, the zone follows Game.ui.location: the Refuge (the hub), or
## the expedition room you walked into, built on the fly (ArenaBuilder + the
## Arena that runs it).
## Also owns the lifecycle hooks: flush the save on focus loss and before the
## window closes.

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
	Game.ui_changed.connect(func(keys):
		if "phase" in keys:
			_route()
		elif ("location" in keys or "room" in keys) and Game.ui.phase == "playing":
			_enter_zone.call_deferred())

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
	var e := Game.expedition()
	var room_id: String = Game.ui.get("room", "")
	var in_room: bool = Game.ui.location == "room" and not Expedition.node(e, room_id).is_empty()
	_zone = ArenaBuilder.build_room(e, Expedition.node(e, room_id)) if in_room else ArenaBuilder.build_refuge()
	world.add_child(_zone)
	_runtime = ZoneRuntime.new()
	_runtime.name = "Runtime"
	world.add_child(_runtime)
	_runtime.setup(_zone)
	if in_room:
		var arena := Arena.new()
		arena.name = "Arena"
		_zone.add_child(arena)
		arena.setup(_zone, _runtime, e, Expedition.node(e, room_id))
	else:
		# Home: the townsfolk patch you up.
		Game.hero().life = Game.sheet().life
		if Game.ui.location != "refuge":
			Game.set_ui({"location": "refuge", "room": ""})
		if Game.expedition().get("done", false):
			Game.finish_expedition.call_deferred()
		Game.set_ui({"zone_title": "The Refuge", "zone_sub": Seasons.badge(Game.hero()) + " · Safe"})


func _leave_zone() -> void:
	if _runtime:
		_runtime.queue_free()
		_runtime = null
	if _zone:
		_zone.queue_free()
		_zone = null
	Game.set_ui({"hover_name": {}})


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
