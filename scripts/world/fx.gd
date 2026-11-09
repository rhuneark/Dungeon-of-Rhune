class_name Fx
extends Node2D
## Small world effects in WORLD PIXELS: floating text, light beams over
## unique/rhune drops, sparkles.

const FONT_BODY := preload("res://assets/fonts/jersey10.woff2")


static func pixel_label(text: String, color: Color, size := 10, outline := 2) -> Label:
	var l := Label.new()
	l.text = text
	var ls := LabelSettings.new()
	ls.font = FONT_BODY
	ls.font_size = size
	ls.font_color = color
	ls.outline_size = outline
	ls.outline_color = Color.BLACK
	l.label_settings = ls
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return l


func float_text(text: String, color: Color, at: Vector2) -> void:
	var l := pixel_label(text, color)
	add_child(l)
	l.reset_size()
	l.position = (at - Vector2(l.size.x / 2.0, l.size.y)).round()
	var tw := create_tween()
	tw.tween_property(l, "position:y", l.position.y - 30, 1.4)
	tw.parallel().tween_property(l, "modulate:a", 0.0, 0.5).set_delay(0.9)
	tw.tween_callback(l.queue_free)


func beam(at: Vector2, color: Color, life := 4.0) -> void:
	var holder := Node2D.new()
	holder.position = at.round()
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	holder.material = mat
	for i in 8:
		var r := ColorRect.new()
		var w := 10 - i
		r.size = Vector2(w, 140 - i * 4)
		r.position = Vector2(-w / 2.0, -140 + i * 4)
		r.color = Color(color, 0.06 + i * 0.015)
		r.use_parent_material = true
		r.mouse_filter = Control.MOUSE_FILTER_IGNORE
		holder.add_child(r)
	add_child(holder)
	var tw := create_tween().set_loops(int(life * 2))
	tw.tween_property(holder, "modulate:a", 0.55, 0.25)
	tw.tween_property(holder, "modulate:a", 1.0, 0.25)
	get_tree().create_timer(life).timeout.connect(func():
		var fade := create_tween()
		fade.tween_property(holder, "modulate:a", 0.0, 0.8)
		fade.tween_callback(holder.queue_free))


func sparkle(at: Vector2, color: Color) -> void:
	var p := CPUParticles2D.new()
	p.position = at + Vector2(0, -6)
	p.one_shot = true
	p.amount = 12
	p.lifetime = 0.7
	p.explosiveness = 1.0
	p.direction = Vector2.UP
	p.spread = 180.0
	p.initial_velocity_min = 15.0
	p.initial_velocity_max = 35.0
	p.gravity = Vector2(0, 20)
	p.color = color
	var mat := CanvasItemMaterial.new()
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	p.material = mat
	add_child(p)
	p.emitting = true
	get_tree().create_timer(1.2).timeout.connect(p.queue_free)
