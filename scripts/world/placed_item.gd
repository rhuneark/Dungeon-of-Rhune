@tool
class_name PlacedItem
extends Sprite2D
## A specific item lying in the world (quest pages, keys...). Once a hero picks
## it up, its `key` goes into hero.taken and it never respawns for them.

@export var key := ""
@export var base_id := "":
	set(v):
		base_id = v
		_refresh()
## Icon art key (preview only; the game uses the base's art).
@export var icon := "":
	set(v):
		icon = v
		_refresh()


func _ready() -> void:
	_refresh()


func _refresh() -> void:
	var path := "res://assets/art/icons/%s.png" % icon
	texture = load(path) if icon != "" and ResourceLoader.exists(path) else null
	centered = false
	scale = Vector2(0.5, 0.5)
	if texture:
		offset = Vector2(-texture.get_width() / 2.0, -texture.get_height())
