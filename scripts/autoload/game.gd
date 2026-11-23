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
	"overlay": "", # unused for now
	"dialog": {}, # {} | {npcId, title, sub, line, notes: Array[String], (floors: true)}
	"service_npc": "",
	"cursor_mode": "",
	"hover_name": {}, # {} | {text, color, sub}
	"location": "town", # town | dungeon
	"floor": 0, # dungeon floor (1-100)
	"zone_title": "Thornwick",
	"zone_sub": "Town · Safe",
	"dead": false,
}

## The flask refills in real time (ms, Time.get_ticks_msec).
var _flask_from := 0
var _flask_ready := 0

var _sheet: Dictionary = {}
var _sheet_rev := -1
var _unlocked := {}
var _save_timer: Timer


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
	var any: bool = ui.left != "" or ui.right != "" or dialog_open
	if any:
		set_ui({"left": "", "right": "", "dialog": {} if dialog_open else ui.dialog, "service_npc": ""})
	return any


# ------------------------------------------------------------ the flask
## 0..1, how full the rejuvenation flask is (1 = ready).
func flask_fraction() -> float:
	var now := Time.get_ticks_msec()
	if now >= _flask_ready:
		return 1.0
	return clampf(float(now - _flask_from) / maxf(1.0, float(_flask_ready - _flask_from)), 0.0, 1.0)


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
	var now := Time.get_ticks_msec()
	_flask_from = now
	_flask_ready = now + int(float(sh.flask.cooldown) * 1000.0)
	float_text("+%d" % heal, "#c68cff")


func reset_flask() -> void:
	_flask_from = 0
	_flask_ready = 0


# ------------------------------------------------------------ where you are
## Go down the Sealed Stair to `floor` (1, or a checkpoint).
func enter_dungeon(floor: int) -> void:
	var h := hero()
	h.bestFloor = maxi(int(h.get("bestFloor", 0)), floor)
	commit()
	set_ui({"location": "dungeon", "floor": floor, "dead": false, "dialog": {}, "left": "", "service_npc": ""})


func next_floor() -> void:
	enter_dungeon(int(ui.floor) + 1)


## Back to Thornwick (the portal, the Town button, or after dying): the
## townsfolk patch you up.
func return_to_town() -> void:
	if not has_hero():
		return
	hero().life = sheet().life
	reset_flask()
	commit()
	flush()
	set_ui({"location": "town", "floor": 0, "dead": false, "dialog": {}, "left": "", "service_npc": ""})


## Floors you may start a descent from: 1 and every 5th floor you've reached.
func checkpoints() -> Array:
	var out := [1]
	var best := int(hero().get("bestFloor", 0))
	var f := 5
	while f <= best:
		out.append(f)
		f += 5
	return out


func toast(text: String, color := "") -> void:
	toast_added.emit(text, color)


func spawn_drops(drops: Array, origin: Variant) -> void:
	drops_requested.emit(drops, origin)


func float_text(text: String, color: String, at: Variant = null) -> void:
	float_text_requested.emit(text, color, at)
