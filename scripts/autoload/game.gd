extends Node
## The live session (port of the web build's session + UI store).
##
## - `save` is the mutable SaveData (same JSON shape as before). Mutate it,
##   then call `commit()`: bumps `rev`, emits `changed`, unlocks achievements,
##   and schedules an autosave (1.5s debounce). `flush()` saves immediately.
## - `ui` holds UI-facing state (open panels, dialog, hover name...). Change it
##   with `set_ui({...})`, which emits `ui_changed`.
## - World bridge: systems ask the live scene to spawn drops / float text via
##   `spawn_drops()` / `float_text()`; the zone listens to the signals.

signal changed
signal ui_changed(keys: Array)
signal toast_added(text: String, color: String)
## origin: "player" | Vector2 (world px)
signal drops_requested(drops: Array, origin: Variant)
## at: null (over the player) or Vector2 (world px)
signal float_text_requested(text: String, color: String, at: Variant)

var save: Dictionary = {}
var rev := 0
var ui := {
	"phase": "loading", # loading | menu | playing
	"load_progress": 0.0,
	"paused": false,
	"left": "", # "" | character | stash | vendor | gamble | smith | codex | lab | options
	"right": "", # "" | inventory
	"overlay": "", # "" | map
	"dialog": {}, # {} | {npcId, title, sub, line, notes: Array[String], (floors: true)}
	"service_npc": "",
	"cursor_mode": "",
	"hover_name": {}, # {} | {text, color, sub}
	"location": "refuge", # refuge | room
	"room": "", # expedition node id while in a room
	"zone_title": "The Refuge",
	"zone_sub": "Safe",
	"dead": false,
}

## The flask refills on the game clock (seconds of play, not wall time).
var clock := 0.0
var _flask_from := 0.0
var _flask_ready := 0.0

var _sheet: Dictionary = {}
var _sheet_rev := -1
var _unlocked := {}
var _save_timer: Timer


func _process(delta: float) -> void:
	clock += delta


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_save_timer = Timer.new()
	_save_timer.one_shot = true
	_save_timer.wait_time = 1.5
	_save_timer.timeout.connect(flush)
	add_child(_save_timer)


func boot() -> void:
	save = SaveIO.load_game()
	rev += 1
	changed.emit()


func has_hero() -> bool:
	return save.get("hero") != null and typeof(save.get("hero")) == TYPE_DICTIONARY


func hero() -> Dictionary:
	assert(has_hero(), "no hero")
	return save.hero


## Call after mutating `save`.
func commit() -> void:
	rev += 1
	_sheet_rev = -1
	for id in Achievements.unlocked_ids(save):
		if not _unlocked.has(id):
			_unlocked[id] = true
			Platform.unlock_achievement(id)
	changed.emit()
	_save_timer.start()


func flush() -> void:
	_save_timer.stop()
	SaveIO.save_game(save)


## Cached character sheet for the current rev (see CharacterSheet.compute_sheet).
func sheet() -> Dictionary:
	if _sheet_rev != rev:
		_sheet = CharacterSheet.compute_sheet(hero())
		_sheet_rev = rev
	return _sheet


func set_ui(patch: Dictionary) -> void:
	for k in patch:
		ui[k] = patch[k]
	ui_changed.emit(patch.keys())


## Close every panel/dialog (Esc). Returns true if anything was open.
func close_all() -> bool:
	var dialog_open: bool = not ui.dialog.is_empty() and not ui.dialog.get("modal", false)
	var any: bool = ui.left != "" or ui.right != "" or ui.overlay != "" or dialog_open
	if any:
		set_ui({"left": "", "right": "", "overlay": "", "dialog": {} if dialog_open else ui.dialog, "service_npc": ""})
	return any


# ------------------------------------------------------------ the flask
## 0..1, how full the rejuvenation flask is (1 = ready).
func flask_fraction() -> float:
	if clock >= _flask_ready:
		return 1.0
	return clampf((clock - _flask_from) / maxf(0.001, _flask_ready - _flask_from), 0.0, 1.0)


func drink_flask() -> void:
	if not has_hero() or ui.phase != "playing" or ui.dead:
		return
	var h := hero()
	var sh := sheet()
	if flask_fraction() < 1.0:
		float_text("Not ready.", "#c68cff")
		return
	if float(h.life) >= float(sh.life):
		float_text("I'm fine.", "#e8e4d8")
		return
	var heal: int = sh.flask.heal
	h.life = minf(float(sh.life), float(h.life) + heal)
	_flask_from = clock
	_flask_ready = clock + float(sh.flask.cooldown)
	float_text("+%d" % heal, "#c68cff")


func reset_flask() -> void:
	_flask_from = 0.0
	_flask_ready = 0.0


# ------------------------------------------------------------ where you are
## The expedition in progress ({} = none).
func expedition() -> Dictionary:
	if not has_hero():
		return {}
	var e = hero().get("expedition", {})
	return e if e is Dictionary else {}


## Chart a new expedition at the Refuge's map table and open the map.
func start_expedition(tier: int) -> String:
	var err := Expedition.start(hero(), tier)
	if err != "":
		float_text(err, "#e8e4d8")
		return err
	commit()
	set_ui({"overlay": "map", "dialog": {}, "left": "", "service_npc": ""})
	toast("Expedition charted: Tier %d. Pick your first room." % tier, "#d9b26a")
	return ""


## Walk into a room on the map (the one you left, or one the last room leads to).
func enter_room(id: String) -> String:
	var e := expedition()
	if e.is_empty():
		return "No expedition."
	var err := Expedition.enter(e, id)
	if err != "":
		float_text(err, "#e8e4d8")
		return err
	commit()
	set_ui({"location": "room", "room": id, "dead": false, "dialog": {}, "left": "", "overlay": "", "service_npc": ""})
	return ""


## The room's last monster fell (or the Sanctuary was entered): bank its boon.
## Returns what complete() reported.
func room_cleared() -> Dictionary:
	var e := expedition()
	if e.is_empty():
		return {}
	var got := Expedition.complete(e)
	if got.is_empty():
		return got
	var n: Dictionary = got.node
	var r: Dictionary = Expeditions.room(n.type)
	if String(got.get("lifted", "")) != "":
		toast("The Sanctuary lifts %s." % Expeditions.AFFLICTIONS[got.lifted].name, "#6fd6ff")
	elif r.boon != "" and r.boon != "respite":
		toast("%s%s" % [Expeditions.BOONS[r.boon].name, " x2" if int(n.stacks) > 1 else ""], "#6fbf5a")
	for a in n.afflictions:
		toast("Affliction: %s" % Expeditions.AFFLICTIONS[a].name, "#e06a5a")
	commit()
	return got


## The Warden fell: next tier open, expedition over.
func finish_expedition() -> void:
	var e := expedition()
	var tier := int(e.get("tier", 0))
	var threat := int(e.get("threat", 0))
	Expedition.finish(hero(), save)
	commit()
	set_ui({"dialog": {"npcId": "", "title": "Expedition complete", "sub": "Tier %d" % tier, "notes": [],
		"line": "The Warden's hourglass cracks and the vault falls quiet. Threat %d. Tier %d is open at the map table." % [threat, tier + 1],
		"buttons": [{"text": "Back to the Refuge", "action": func(): return_to_refuge()}]}})


func abandon_expedition() -> void:
	Expedition.abandon(hero())
	commit()


## Back to the Refuge (portal, R, the vault's exit, or after dying): the
## townsfolk patch you up. An unfinished expedition waits on the map.
func return_to_refuge() -> void:
	if not has_hero():
		return
	hero().life = sheet().life
	reset_flask()
	commit()
	flush()
	set_ui({"location": "refuge", "room": "", "dead": false, "dialog": {}, "left": "", "overlay": "", "service_npc": ""})


# -------------------------------------------------------------- the roster
## Every hero on this account: the one being played first, then the bench.
func roster() -> Array:
	var out: Array = []
	if has_hero():
		out.append(save.hero)
	out.append_array(save.get("bench", []))
	return out


## Make roster()[i] the hero being played (the current one goes to the bench).
func select_hero(i: int) -> void:
	var all := roster()
	if i <= 0 or i >= all.size():
		return
	var pick: Dictionary = all[i]
	save.bench.erase(pick)
	if has_hero():
		save.bench.push_front(save.hero)
	save.hero = pick
	reset_flask()
	commit()


func add_hero(h: Dictionary) -> String:
	if roster().size() >= HeroData.MAX_HEROES:
		return "The Refuge can't hold more than %d heroes." % HeroData.MAX_HEROES
	if has_hero():
		save.bench.push_front(save.hero)
	save.hero = h
	reset_flask()
	commit()
	return ""


## Remove roster()[i] for good (its realm's stash stays for the others).
func delete_hero(i: int) -> void:
	var all := roster()
	if i < 0 or i >= all.size():
		return
	if i == 0:
		save.hero = save.bench.pop_front() if not save.bench.is_empty() else null
	else:
		save.bench.erase(all[i])
	commit()
	flush()


# --------------------------------------------------------------- the stash
## Stashes are per realm and mode: Season and Eternal, Trade and SSF never share.
func stash_key(h: Dictionary = {}) -> String:
	if h.is_empty():
		h = hero()
	return "%s:%s" % [String(h.get("realm", "eternal")), String(h.get("mode", "trade"))]


func stash() -> Array:
	if not save.has("stashes") or not save.stashes is Dictionary:
		save.stashes = {}
	var k := stash_key()
	if not save.stashes.has(k):
		save.stashes[k] = []
	return save.stashes[k]


func toast(text: String, color := "") -> void:
	toast_added.emit(text, color)


func spawn_drops(drops: Array, origin: Variant) -> void:
	drops_requested.emit(drops, origin)


func float_text(text: String, color: String, at: Variant = null) -> void:
	float_text_requested.emit(text, color, at)
