extends Node
## Whole-town overview with footprints (red), walls (magenta) and approach
## points (cyan) drawn over the map. Run via run.gd; args: out.png [zoom town_x town_y [clean]]
## ("clean" skips the overlay).
var frame := 0
var out := "/tmp/overview.png"


func _ready() -> void:
	var args: Array = get_meta("args", [])
	if args.size() > 0:
		out = args[0]
	if args.size() > 3:
		set_meta("zoom", float(args[1]))
		set_meta("cx", float(args[2]))
		set_meta("cy", float(args[3]))
	set_meta("clean", args.size() > 4 and args[4] == "clean")


func _process(_d: float) -> void:
	frame += 1
	var game := get_node("/root/Game")
	if frame == 60:
		game.save.hero = HeroData.new_hero("Overview")
		game.set_ui({"phase": "playing"})
	if frame == 75:
		var rt := _find(get_tree().root, "ZoneRuntime")
		var cam: Camera2D = rt.camera
		cam.zoom = Vector2(get_meta("zoom", 0.42), get_meta("zoom", 0.42))
		cam.limit_left = -100000
		cam.limit_top = -100000
		cam.limit_right = 100000
		cam.limit_bottom = 100000
		rt.set_process(false)
		cam.position = Iso.vertex(16 + get_meta("cx", 30.0), 16 + get_meta("cy", 23.0))
		if not get_meta("clean", false):
			var o := Overlay.new()
			o.zone = rt.zone
			o.nav = rt.nav
			rt.zone.add_child(o)
		get_tree().root.get_node("Main/UI").visible = false
	if frame == 90:
		get_viewport().get_texture().get_image().save_png(out)
		print("OVERVIEW ", out)
		get_tree().quit()


func _find(n: Node, cls: String) -> Node:
	for c in n.get_children():
		if c.get_script() and c.get_script().get_global_name() == cls:
			return c
		var r := _find(c, cls)
		if r:
			return r
	return null


class Overlay extends Node2D:
	var zone: Node
	var nav: ZoneNav

	func _ready() -> void:
		z_index = 100

	func _draw() -> void:
		for y in nav.size.y:
			for x in nav.size.x:
				if nav.astar.is_point_solid(Vector2i(x, y)):
					var pts := Iso.rect_corners(Rect2i(x, y, 1, 1))
					draw_colored_polygon(pts, Color(1, 0, 0, 0.18))
		for p in _props(zone):
			if p.block != Vector2i.ZERO:
				var pts := Iso.rect_corners(p.footprint())
				pts.append(pts[0])
				draw_polyline(pts, Color(1, 0.2, 0.2, 0.95), 2.0)
			if p.action != "none":
				draw_circle(p.approach_point(), 5, Color(0, 1, 1))

	func _props(n: Node) -> Array:
		var out := []
		for c in n.get_children():
			if c is Prop:
				out.append(c)
			out.append_array(_props(c))
		return out
