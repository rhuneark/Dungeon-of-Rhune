class_name UiTip
extends Control
## The one tooltip. Sources call `UiTip.item(self, ...)` / `UiTip.text(self, ...)`
## on mouse motion; the tip hides itself as soon as its source is no longer
## under the pointer (or was freed), so panels can rebuild freely.

static var inst: UiTip

var source: Control
var _key := ""
var _box: PanelContainer


func _ready() -> void:
	inst = self
	mouse_filter = MOUSE_FILTER_IGNORE
	z_index = 40
	_box = PanelContainer.new()
	_box.add_theme_stylebox_override("panel", UiKit.tip_frame())
	_box.mouse_filter = MOUSE_FILTER_IGNORE
	_box.visible = false
	add_child(_box)


func _exit_tree() -> void:
	if inst == self:
		inst = null


static func clear(src: Control = null) -> void:
	if inst and (src == null or inst.source == src):
		inst._hide()


static func text(src: Control, title: String, lines: Array, color := "") -> void:
	if inst:
		inst._show(src, "t|%s|%s|%s" % [title, "\n".join(lines), color], func(): return inst._text_lines(title, lines, color))


## ctx: "none" | "sell" | "buy"; price < 0 = no price line.
static func item(src: Control, it: Dictionary, ctx := "none", price := -1, extra: Array = []) -> void:
	if inst:
		inst._show(src, "i|%s|%s|%d|%d|%s" % [it.uid, ctx, price, Game.rev, extra], func(): return ItemTooltip.lines(it, ctx, price, extra))


func _hide() -> void:
	source = null
	_key = ""
	_box.visible = false


func _show(src: Control, key: String, build: Callable) -> void:
	source = src
	if key != _key:
		_key = key
		_rebuild(build.call())
	_box.visible = true
	_place()


func _text_lines(title: String, lines: Array, color: String) -> Array:
	var out := []
	if title != "":
		out.append({"text": title, "color": Color(color) if color != "" else UiKit.GOLD})
	for l in lines:
		if String(l) != "":
			out.append({"text": String(l)})
	return out


## lines: [{text, color?: Color, style?: String}]
func _rebuild(lines: Array) -> void:
	for c in _box.get_children():
		_box.remove_child(c)
		c.queue_free()
	var v := UiKit.vbox(0)
	var widest := 0.0
	for l in lines:
		var style: String = l.get("style", "t10")
		var s: Array = UiKit.STYLES[style]
		widest = maxf(widest, s[0].get_string_size(l.text, HORIZONTAL_ALIGNMENT_LEFT, -1, s[1]).x)
	var w := minf(ceilf(widest), 262.0)
	for l in lines:
		var lab := UiKit.para(l.text, l.get("style", "t10"), l.get("color", UiKit.PARCH), HORIZONTAL_ALIGNMENT_CENTER)
		lab.custom_minimum_size.x = w
		if l.get("gap", false):
			v.add_child(UiKit.gap(2))
		v.add_child(lab)
	_box.add_child(v)
	_box.reset_size()


func _place() -> void:
	var m := get_global_mouse_position()
	var sz := _box.get_combined_minimum_size()
	_box.size = sz
	var ui := View.ui_size
	var x := roundf(m.x - sz.x / 2.0)
	var y := roundf(m.y - sz.y - 14)
	if y < 2:
		y = roundf(m.y + 18)
	x = clampf(x, 2, ui.x - sz.x - 2)
	y = clampf(y, 2, ui.y - sz.y - 2)
	_box.position = Vector2(x, y)


func _process(_d: float) -> void:
	if source == null:
		return
	if not is_instance_valid(source) or not source.is_visible_in_tree():
		_hide()
		return
	var hc := get_viewport().gui_get_hovered_control()
	if hc == null or not (hc == source or source.is_ancestor_of(hc)):
		_hide()
		return
	_place()
