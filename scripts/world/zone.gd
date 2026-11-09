@tool
class_name Zone
extends Node2D
## A playable map. Editor data lives on this node and its children:
##   Ground (TileMapLayer)  — terrain; paint with the Terrains tab
##   Decals (Node2D)        — flat decor drawn under everything
##   Things (Node2D, y-sort)— Props, NpcSpots, trees: anything you can walk behind
##   Items (Node2D)         — PlacedItems
##   Blockers (Node2D)      — invisible walls
##   Spawn (Marker2D)       — where the hero appears
## The runtime (movement, NPCs, loot, camera) is in zone_runtime.gd, attached
## by the game when the zone is entered.

@export var zone_name := "Zone"
@export var level := 1
## Area the town critter wanders, in tiles.
@export var critter_area := Rect2i()
