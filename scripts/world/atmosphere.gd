class_name Atmosphere
extends Node2D
## The mood of a zone: dusk light, torchlight, mist, embers and a vignette.
##
## - A CanvasModulate tints the whole world canvas to a cold dusk (`ambient`).
## - Props whose art has light-emitting pixels (lit windows, lanterns, fire,
##   glowing runes; found by tools/art/pack.py, see `glow` in art_meta.json)
##   get those pixels redrawn unshaded on top, so they glow through the dark,
##   and a flickering PointLight2D per cluster. New art gets lights
##   automatically; `LIGHT_TUNING` only adjusts them per art.
## - A drifting fog layer (pixel-snapped noise) sits over the world, lit by the
##   same lights. A screen-space vignette darkens the edges.
## The UI lives on its own CanvasLayer and is never tinted.

const LIGHT_MASK := 1
## Moonlit dusk. Multiplies every world pixel that isn't lit or emissive.
@export var ambient := Color(0.66, 0.68, 0.80)
@export var fog_color := Color(0.70, 0.75, 0.84)
@export var fog_density := 0.26

## art -> {radius_mul, energy_mul, kind (overrides the detected colour), embers}.
const LIGHT_TUNING := {
	"lamp_post": {"radius_mul": 1.9, "energy_mul": 1.1},
	"campfire": {"radius_mul": 2.2, "energy_mul": 1.25, "kind": "fire", "embers": true},
	"smithy": {"radius_mul": 1.5, "energy_mul": 1.15, "kind": "fire", "embers": true},
	"brazier": {"radius_mul": 2.0, "energy_mul": 1.2, "kind": "fire", "embers": true},
	"gate": {"radius_mul": 1.3, "energy_mul": 1.0, "kind": "fire"},
	"waypoint": {"radius_mul": 1.4, "energy_mul": 0.9},
	"pit_entrance": {"radius_mul": 1.3, "energy_mul": 0.9},
	"statue": {"radius_mul": 1.6, "energy_mul": 1.0},
}
const COLORS := {
	"warm": Color(1.0, 0.72, 0.42),
	"fire": Color(1.0, 0.52, 0.22),
	"rune": Color(0.45, 0.85, 1.0),
}

static var _light_tex_cache := {}

var _lights: Array = [] # {light, base, t, speed}
var _player_light: PointLight2D


func setup(zone: Zone, map_px: Vector2) -> void:
	var cm := CanvasModulate.new()
	cm.color = ambient
	add_child(cm)
	for p in ZoneRuntime._all(zone, "Prop"):
		if p.texture:
			_light_prop(p)
	_add_fog(map_px)
	_add_vignette()


## A soft light that follows the hero, so they never vanish in the dark.
func attach_player_light(sprite: Node2D) -> void:
	_player_light = _make_light(Color(0.85, 0.82, 0.72), 96, 0.55)
	_player_light.position = Vector2(0, -18)
	sprite.add_child(_player_light)


func _process(delta: float) -> void:
	for l in _lights:
		l.t += delta * l.speed
		var f: float = 0.86 + 0.08 * sin(l.t * 7.3) + 0.06 * sin(l.t * 13.1 + 1.7)
		l.light.energy = l.base * f


# ------------------------------------------------------------ prop lights
func _light_prop(p: Prop) -> void:
	var clusters: Array = Art.prop_meta(p.art).get("glow", [])
	var glow_tex := Art.glow_texture(p.art)
	if clusters.is_empty() or glow_tex == null:
		return
	var tune: Dictionary = LIGHT_TUNING.get(p.art, {})
	# Glow layer: the emissive pixels, unshaded, drawn over the prop.
	var glow := Sprite2D.new()
	glow.texture = glow_tex
	glow.centered = false
	glow.offset = p.offset
	glow.flip_h = p.flip_h
	var mat := CanvasItemMaterial.new()
	mat.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	glow.material = mat
	p.add_child(glow)
	for i in clusters.size():
		var c: Array = clusters[i]
		var local := Vector2(float(c[0]), float(c[1]))
		if p.flip_h:
			local.x = p.texture.get_width() - local.x
		var at: Vector2 = p.global_position + p.offset + local
		var n := float(c[2])
		var kind: String = tune.get("kind", c[3])
		var radius: float = clampf(34.0 + sqrt(n) * 7.0, 40.0, 120.0) * float(tune.get("radius_mul", 1.0))
		var energy: float = clampf(0.55 + n / 160.0, 0.55, 1.0) * float(tune.get("energy_mul", 1.0))
		var light := _make_light(COLORS.get(kind, COLORS.warm), radius, energy)
		light.position = at.round()
		add_child(light)
		_lights.append({"light": light, "base": energy, "t": randf() * 10.0, "speed": randf_range(0.8, 1.2)})
		if i == 0 and tune.get("embers", false):
			_add_embers(at)


func _make_light(color: Color, radius: float, energy: float) -> PointLight2D:
	var l := PointLight2D.new()
	l.texture = light_texture(int(radius))
	l.color = color
	l.energy = energy
	l.range_item_cull_mask = LIGHT_MASK
	l.blend_mode = Light2D.BLEND_MODE_ADD
	return l


## A soft radial light (bright core, long quadratic falloff), one texel per
## world pixel.
static func light_texture(radius: int) -> Texture2D:
	radius = clampi(radius - radius % 4, 16, 256)
	if _light_tex_cache.has(radius):
		return _light_tex_cache[radius]
	var g := Gradient.new()
	var offs := PackedFloat32Array()
	var cols := PackedColorArray()
	for i in 9:
		var d := i / 8.0
		offs.append(d)
		cols.append(Color(1, 1, 1, pow(1.0 - d, 2.0)))
	g.offsets = offs
	g.colors = cols
	var t := GradientTexture2D.new()
	t.gradient = g
	t.fill = GradientTexture2D.FILL_RADIAL
	t.fill_from = Vector2(0.5, 0.5)
	t.fill_to = Vector2(1.0, 0.5)
	t.width = radius * 2
	t.height = radius * 2
	_light_tex_cache[radius] = t
	return t


func _add_embers(at: Vector2) -> void:
	var p := CPUParticles2D.new()
	p.position = at.round()
	p.amount = 14
	p.lifetime = 2.2
	p.preprocess = 2.0
	p.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	p.emission_rect_extents = Vector2(6, 2)
	p.direction = Vector2.UP
	p.spread = 22.0
	p.gravity = Vector2(3, -10)
	p.initial_velocity_min = 10.0
	p.initial_velocity_max = 24.0
	p.scale_amount_min = 1.0
	p.scale_amount_max = 2.0
	var ramp := Gradient.new()
	ramp.colors = PackedColorArray([Color(1.0, 0.85, 0.5, 1.0), Color(1.0, 0.45, 0.15, 0.9), Color(0.6, 0.15, 0.05, 0.0)])
	p.color_ramp = ramp
	var mat := CanvasItemMaterial.new()
	mat.light_mode = CanvasItemMaterial.LIGHT_MODE_UNSHADED
	mat.blend_mode = CanvasItemMaterial.BLEND_MODE_ADD
	p.material = mat
	p.z_index = 1
	add_child(p)


# ------------------------------------------------------------------- fog
const FOG_SHADER := """
shader_type canvas_item;
uniform sampler2D noise : repeat_enable, filter_nearest;
uniform vec4 fog_color : source_color;
uniform float density = 0.3;
uniform vec2 world_size;
void fragment() {
	vec2 wp = floor(UV * world_size);
	vec2 a = floor(wp + TIME * vec2(7.0, 1.6)) / vec2(420.0, 300.0);
	vec2 b = floor(wp + TIME * vec2(-4.5, 2.4)) / vec2(260.0, 200.0);
	float n = texture(noise, a).r * 0.62 + texture(noise, b).r * 0.38;
	float f = smoothstep(0.42, 0.78, n);
	f = floor(f * 5.0) / 5.0;
	COLOR = vec4(fog_color.rgb, f * density);
}
"""


func _add_fog(map_px: Vector2) -> void:
	var noise := FastNoiseLite.new()
	noise.noise_type = FastNoiseLite.TYPE_SIMPLEX_SMOOTH
	noise.frequency = 0.012
	noise.fractal_octaves = 3
	noise.seed = 7
	var nt := NoiseTexture2D.new()
	nt.width = 256
	nt.height = 256
	nt.seamless = true
	nt.noise = noise
	var sh := Shader.new()
	sh.code = FOG_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = sh
	mat.set_shader_parameter("noise", nt)
	mat.set_shader_parameter("fog_color", fog_color)
	mat.set_shader_parameter("density", fog_density)
	mat.set_shader_parameter("world_size", map_px)
	var r := ColorRect.new()
	r.name = "Fog"
	r.size = map_px
	r.material = mat
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.z_index = 2
	add_child(r)


# -------------------------------------------------------------- vignette
const VIGNETTE_SHADER := """
shader_type canvas_item;
uniform float strength = 0.6;
void fragment() {
	vec2 d = (UV - 0.5) * vec2(1.0, 1.15);
	float v = smoothstep(0.32, 0.78, length(d));
	COLOR = vec4(0.02, 0.02, 0.035, v * strength);
}
"""


func _add_vignette() -> void:
	var layer := CanvasLayer.new()
	layer.name = "Vignette"
	layer.layer = 1
	add_child(layer)
	var sh := Shader.new()
	sh.code = VIGNETTE_SHADER
	var mat := ShaderMaterial.new()
	mat.shader = sh
	var r := ColorRect.new()
	r.material = mat
	r.mouse_filter = Control.MOUSE_FILTER_IGNORE
	r.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(r)
