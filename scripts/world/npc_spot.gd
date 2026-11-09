@tool
class_name NpcSpot
extends Sprite2D
## Where an NPC stands (position = their feet). The zone replaces this marker
## with the animated NPC at runtime; in the editor it previews their art.

@export var npc_id := ""
## Character sheet in assets/art/chars/ (set by the converter; preview only).
@export var sheet := "":
	set(v):
		sheet = v
		_refresh()


func _ready() -> void:
	_refresh()


func _refresh() -> void:
	var path := "res://assets/art/chars/%s.png" % sheet
	if sheet == "" or not ResourceLoader.exists(path):
		texture = null
		return
	var t := AtlasTexture.new()
	t.atlas = load(path)
	t.region = Rect2(0, 0, 64, 64)
	texture = t
	centered = false
	offset = Vector2(-32, -63)
