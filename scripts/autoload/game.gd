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
## origin: "player" | "well" | Vector2 (world px)
signal drops_requested(drops: Array, origin: Variant)
## at: null (over the player) or Vector2 (world px)
signal float_text_requested(text: String, color: String, at: Variant)

var save: Dictionary = {}
var rev := 0
var ui := {
	"phase": "loading", # loading | menu | playing
	"load_progress": 0.0,
	"paused": false,
	"left": "", # "" | character | stash | vendor | herbs | gamble | smith | codex | quests | well | lab | options
	"right": "", # "" | inventory
	"overlay": "", # "" | skills
	"dialog": {}, # {} | {npcId, title, sub, line, notes: Array[String]}
	"service_npc": "",
	"cursor_mode": "", # "" | identify
	"hover_name": {}, # {} | {text, color, sub}
}

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
	var any: bool = ui.left != "" or ui.right != "" or ui.overlay != "" or not ui.dialog.is_empty() or ui.cursor_mode != ""
	if any:
		set_ui({"left": "", "right": "", "overlay": "", "dialog": {}, "service_npc": "", "cursor_mode": ""})
	return any


func toast(text: String, color := "") -> void:
	toast_added.emit(text, color)


func spawn_drops(drops: Array, origin: Variant) -> void:
	drops_requested.emit(drops, origin)


func float_text(text: String, color: String, at: Variant = null) -> void:
	float_text_requested.emit(text, color, at)
