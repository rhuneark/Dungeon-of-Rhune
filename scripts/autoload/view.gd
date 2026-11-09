extends Node
## Pixel-perfect scaling. The window renders at native resolution (no stretch);
## the world Camera2D zooms by `world_zoom` (integer device px per world px,
## ~480 world px visible vertically) and the UI CanvasLayer scales by
## `ui_scale` (UI canvas >= 690x430 UI px). Whole numbers keep pixel art crisp;
## 1.5x is used only for mid-size windows (645–860 px tall) so text stays
## readable on small laptops. Players can override both in Options.

signal changed

const WORLD_TARGET_H := 480.0
const UI_TARGET_H := 540.0
const UI_MIN_H := 430.0
const UI_MIN_W := 690.0
const UI_SCALE_CHOICES: Array[float] = [1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0]
const ZOOM_CHOICES: Array[int] = [1, 2, 3, 4, 5, 6]
const PREFS_PATH := "user://view.cfg"

var device_size := Vector2i(1600, 900)
var ui_scale := 2.0
var world_zoom := 2
## UI canvas size in UI px.
var ui_size := Vector2(800, 450)
## Player overrides: 0 = auto.
var pref_ui := 0.0
var pref_zoom := 0


func _ready() -> void:
	var cfg := ConfigFile.new()
	if cfg.load(PREFS_PATH) == OK:
		pref_ui = float(cfg.get_value("view", "ui", 0.0))
		pref_zoom = int(cfg.get_value("view", "zoom", 0))
	get_window().size_changed.connect(_apply)
	_apply()


static func auto_ui_scale(w: float, h: float) -> float:
	var fits := func(s: float) -> bool: return h / s >= UI_MIN_H and w / s >= UI_MIN_W
	var s := maxf(1.0, roundf(h / UI_TARGET_H))
	while s > 1.0 and not fits.call(s):
		s -= 1.0
	if s == 1.0 and fits.call(1.5):
		s = 1.5
	return s


static func auto_zoom(h: float) -> int:
	return maxi(1, roundi(h / WORLD_TARGET_H))


func _apply() -> void:
	device_size = get_window().size
	world_zoom = pref_zoom if pref_zoom > 0 else auto_zoom(device_size.y)
	ui_scale = pref_ui if pref_ui > 0.0 else auto_ui_scale(device_size.x, device_size.y)
	ui_size = Vector2(floorf(device_size.x / ui_scale), floorf(device_size.y / ui_scale))
	changed.emit()


func set_prefs(ui: float, zoom: int) -> void:
	pref_ui = ui
	pref_zoom = zoom
	var cfg := ConfigFile.new()
	cfg.set_value("view", "ui", ui)
	cfg.set_value("view", "zoom", zoom)
	cfg.save(PREFS_PATH)
	_apply()
