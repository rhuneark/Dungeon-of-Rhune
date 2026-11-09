extends Node
## The outside world: Steam (via the optional GodotSteam GDExtension),
## fullscreen, quitting, achievements, dev-tool gating. Everything degrades
## gracefully: no GodotSteam addon, no App ID, or no Steam client running all
## mean "play without Steam".

signal fullscreen_changed(on: bool)

const SETTINGS_PATH := "user://settings.cfg"

var kind := "web" if OS.has_feature("web") else "desktop"
var steam: Object = null
var steam_available := false
var steam_name := ""
var steam_status := "not installed"
## Loot Lab + debug keys: debug builds (editor runs), `--dev-tools`, RHUNE_DEVTOOLS=1, or ?dev on the web.
var dev_tools := false
var _settings := ConfigFile.new()
var _steam_needs_callbacks := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_settings.load(SETTINGS_PATH)
	dev_tools = OS.is_debug_build() or "--dev-tools" in OS.get_cmdline_user_args() or OS.get_environment("RHUNE_DEVTOOLS") == "1"
	if kind == "web" and OS.has_feature("web"):
		var q = JavaScriptBridge.eval("window.location.search", true)
		if typeof(q) == TYPE_STRING and "dev" in q:
			dev_tools = true
	_init_steam()
	set_process(_steam_needs_callbacks)
	if kind == "desktop" and not Engine.is_editor_hint():
		# Release builds start fullscreen; editor/debug runs start windowed unless changed.
		var fs: bool = _settings.get_value("display", "fullscreen", not OS.is_debug_build())
		if fs and DisplayServer.get_name() != "headless":
			set_fullscreen(true, false)


func _process(_delta: float) -> void:
	if steam and _steam_needs_callbacks:
		steam.call("run_callbacks")


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_fullscreen"):
		set_fullscreen(not is_fullscreen())
		get_viewport().set_input_as_handled()


# ------------------------------------------------------------------ Steam
func _init_steam() -> void:
	if not Engine.has_singleton("Steam"):
		return
	var app_id := int(OS.get_environment("SteamAppId"))
	if app_id <= 0:
		app_id = int(ProjectSettings.get_setting("rhune/steam/app_id", 0))
	if app_id <= 0:
		steam_status = "no App ID"
		return
	steam = Engine.get_singleton("Steam")
	if bool(ProjectSettings.get_setting("rhune/steam/require_launch_through_steam", false)) and not OS.is_debug_build():
		if steam.call("restartAppIfNecessary", app_id):
			get_tree().quit()
			return
	# GodotSteam changed steamInitEx's signature across versions; support both.
	var argc := 3
	for m in steam.get_method_list():
		if m.name == "steamInitEx":
			argc = m.args.size()
	var result = steam.call("steamInitEx", app_id, true) if argc == 2 else steam.call("steamInitEx", false, app_id, true)
	var ok := typeof(result) == TYPE_DICTIONARY and int(result.get("status", 1)) == 0
	steam_available = ok
	steam_status = "connected" if ok else "offline (%s)" % (result.get("verbal", "init failed") if typeof(result) == TYPE_DICTIONARY else "init failed")
	if ok:
		steam_name = str(steam.call("getPersonaName"))
	else:
		steam = null


func unlock_achievement(id: String) -> void:
	if not steam_available:
		return
	steam.call("setAchievement", id)
	steam.call("storeStats")


# ------------------------------------------------------------- display
func is_fullscreen() -> bool:
	var m := DisplayServer.window_get_mode()
	return m == DisplayServer.WINDOW_MODE_FULLSCREEN or m == DisplayServer.WINDOW_MODE_EXCLUSIVE_FULLSCREEN


func set_fullscreen(on: bool, remember := true) -> void:
	DisplayServer.window_set_mode(DisplayServer.WINDOW_MODE_FULLSCREEN if on else DisplayServer.WINDOW_MODE_WINDOWED)
	if remember:
		_settings.set_value("display", "fullscreen", on)
		_settings.save(SETTINGS_PATH)
	fullscreen_changed.emit(on)


func can_quit() -> bool:
	return kind == "desktop"


func quit() -> void:
	Game.flush()
	get_tree().quit()
