class_name Monsters
## The things in the Deep. Base numbers are for monster level 1; everything
## scales with the room's monster level (Expedition.level_of: tier + step).
## New kinds join the mix deeper down; an Hourglass Warden holds each
## expedition's vault.
##
## Monster: {id, name, sprite, life, damage: [min, max], type (damage type),
##           speed (px/s), range (px), cooldown (s), windup (s, attack start
##           to hit), kind: melee|ranged|caster, (projectile: arrow|fire|frost),
##           (keep: preferred distance for shooters), xp, radius, from (first level),
##           weight, (boss)}

const ALL := {
	"skeleton": {"name": "Rattling Dead", "sprite": "mob_skeleton", "life": 16, "damage": [1, 4], "type": "phys",
		"speed": 62.0, "range": 30.0, "cooldown": 1.3, "windup": 0.35, "kind": "melee", "xp": 25, "radius": 10.0, "from": 1, "weight": 10},
	"ghoul": {"name": "Ghoul", "sprite": "mob_ghoul", "life": 13, "damage": [1, 3], "type": "phys",
		"speed": 92.0, "range": 28.0, "cooldown": 0.9, "windup": 0.25, "kind": "melee", "xp": 25, "radius": 10.0, "from": 1, "weight": 8},
	"archer": {"name": "Bone Archer", "sprite": "mob_archer", "life": 12, "damage": [2, 4], "type": "phys",
		"speed": 58.0, "range": 210.0, "cooldown": 1.9, "windup": 0.45, "kind": "ranged", "projectile": "arrow", "keep": 150.0,
		"xp": 28, "radius": 10.0, "from": 4, "weight": 6},
	"brute": {"name": "Chained Brute", "sprite": "mob_brute", "life": 55, "damage": [5, 10], "type": "phys",
		"speed": 42.0, "range": 36.0, "cooldown": 2.0, "windup": 0.6, "kind": "melee", "xp": 60, "radius": 14.0, "from": 7, "weight": 4},
	"cultist": {"name": "Ember Cultist", "sprite": "mob_cultist", "life": 13, "damage": [3, 6], "type": "fire",
		"speed": 55.0, "range": 200.0, "cooldown": 2.1, "windup": 0.5, "kind": "caster", "projectile": "fire", "keep": 160.0,
		"xp": 35, "radius": 10.0, "from": 11, "weight": 5},
	"wraith": {"name": "Wraith", "sprite": "mob_wraith", "life": 20, "damage": [3, 6], "type": "cold",
		"speed": 74.0, "range": 30.0, "cooldown": 1.2, "windup": 0.3, "kind": "melee", "xp": 38, "radius": 10.0, "from": 16, "weight": 5},
	"warden": {"name": "Hourglass Warden", "sprite": "boss_warden", "life": 420, "damage": [8, 16], "type": "phys",
		"speed": 56.0, "range": 52.0, "cooldown": 1.6, "windup": 0.55, "kind": "melee", "xp": 900, "radius": 20.0, "from": 10, "weight": 0,
		"boss": true},
}


static func get_def(id: String) -> Dictionary:
	var d: Dictionary = ALL.get(id, {})
	if d.is_empty():
		return d
	var out := d.duplicate()
	out.id = id
	return out


## Kinds that can appear on this floor (not the boss).
static func pool(floor: int) -> Array:
	var out: Array = []
	for id in ALL:
		var d: Dictionary = ALL[id]
		if not d.get("boss", false) and int(d.from) <= floor:
			out.append(id)
	return out


## Tuned with tools/godot/campaign_test.gd so a hero wearing what drops
## clears floors 1-15 at about a level per floor (x5.6 life, x3.9 damage by floor 15).
static func life_mult(floor: int) -> float:
	var f := float(floor - 1)
	return 1.0 + 0.26 * f + 0.005 * f * f


static func damage_mult(floor: int) -> float:
	var f := float(floor - 1)
	return 1.0 + 0.18 * f + 0.002 * f * f


static func xp_mult(floor: int) -> float:
	return 1.0 + 0.30 * float(floor - 1)


## How the room fills: [monsters in wave 1, wave 2, ...]. Three waves until
## floor 20, so an early floor is a minute or two.
static func waves(floor: int) -> Array:
	var n := 3 if floor < 20 else (4 if floor < 50 else 5)
	var out: Array = []
	for w in n:
		out.append(mini(26, 4 + roundi(floor * 0.25) + w * 2))
	return out
