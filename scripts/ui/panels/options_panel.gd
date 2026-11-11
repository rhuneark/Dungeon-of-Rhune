extends UiPanel
## Display options: fullscreen, UI scale, world zoom. Auto picks crisp
## integer scales (1.5x for mid-size windows); players can override.

## Set by the main menu, which shows Options outside the playing UI.
var on_close: Callable


func _init() -> void:
	title = "Options"
	panel_width = 340


func _ready() -> void:
	super._ready()
	View.changed.connect(mark)
	Platform.fullscreen_changed.connect(func(_on): mark())


func close() -> void:
	if on_close.is_valid():
		on_close.call()
	else:
		super.close()


func _fmt(n: float) -> String:
	return "%sx" % UiKit.fmt_num(n)


func build(body: VBoxContainer) -> void:
	var dev := Vector2(View.device_size)
	if Platform.kind == "desktop":
		body.add_child(UiKit.label("DISPLAY (F11 / ALT+ENTER)", "label", UiKit.DIM))
		var row := UiKit.hbox(3)
		var fs := Platform.is_fullscreen()
		row.add_child(UiKit.button("Fullscreen", func(): Platform.set_fullscreen(true), 6, fs))
		row.add_child(UiKit.button("Windowed", func(): Platform.set_fullscreen(false), 6, not fs))
		body.add_child(row)
		body.add_child(UiKit.gap(4))

	body.add_child(UiKit.label("UI SCALE", "label", UiKit.DIM))
	var ui_row := HFlowContainer.new()
	ui_row.add_theme_constant_override("h_separation", 3)
	ui_row.add_theme_constant_override("v_separation", 3)
	ui_row.add_child(UiKit.button("Auto (%s)" % _fmt(View.auto_ui_scale(dev.x, dev.y)), func(): View.set_prefs(0.0, View.pref_zoom), 6, View.pref_ui == 0.0))
	for s in View.UI_SCALE_CHOICES:
		if dev.y / s >= 330 and dev.x / s >= 560:
			var sv: float = s
			ui_row.add_child(UiKit.button(_fmt(s), func(): View.set_prefs(sv, View.pref_zoom), 6, View.pref_ui == s))
	body.add_child(ui_row)
	body.add_child(UiKit.para("Whole numbers are pixel-perfect. 1.5x is slightly soft but readable on mid-size screens. Panels are designed for at least 690x430 UI px.", "t10", UiKit.DIM))
	body.add_child(UiKit.gap(4))

	body.add_child(UiKit.label("WORLD ZOOM", "label", UiKit.DIM))
	var z_row := HFlowContainer.new()
	z_row.add_theme_constant_override("h_separation", 3)
	z_row.add_theme_constant_override("v_separation", 3)
	z_row.add_child(UiKit.button("Auto (%s)" % _fmt(View.auto_zoom(dev.y)), func(): View.set_prefs(View.pref_ui, 0), 6, View.pref_zoom == 0))
	for z in View.ZOOM_CHOICES:
		if dev.y / z >= 220:
			var zv: int = z
			z_row.add_child(UiKit.button(_fmt(z), func(): View.set_prefs(View.pref_ui, zv), 6, View.pref_zoom == z))
	body.add_child(z_row)
	body.add_child(UiKit.para("Higher zoom = bigger sprites, less of the world on screen.", "t10", UiKit.DIM))
	body.add_child(UiKit.gap(4))

	var info := UiKit.vbox(0)
	info.add_child(UiKit.label("Screen: %dx%d px" % [View.device_size.x, View.device_size.y]))
	var small := " — smaller than the layouts expect" if View.ui_size.y < 430 else ""
	info.add_child(UiKit.label("UI: %dx%d at %s%s" % [View.ui_size.x, View.ui_size.y, _fmt(View.ui_scale), small], "t10", UiKit.BAD if small != "" else UiKit.PARCH))
	info.add_child(UiKit.label("World view: %dx%d world px at %s" % [roundi(dev.x / View.world_zoom), roundi(dev.y / View.world_zoom), _fmt(View.world_zoom)]))
	var steam := ""
	if Platform.kind == "desktop":
		steam = " · Steam: %s" % (Platform.steam_name if Platform.steam_available else Platform.steam_status)
	info.add_child(UiKit.label("Platform: %s%s" % [Platform.kind, steam]))
	body.add_child(UiKit.well(info, 4))
