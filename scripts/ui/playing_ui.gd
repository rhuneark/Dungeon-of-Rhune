class_name PlayingUi
extends Control
## In-game UI: HUD, the left/right/overlay panel slots, dialog box, cursor
## item and tooltip, and the hotkeys (input actions in project.godot).

const INVENTORY := preload("res://scripts/ui/panels/inventory_panel.gd")
const CHARACTER := preload("res://scripts/ui/panels/character_panel.gd")
const OPTIONS := preload("res://scripts/ui/panels/options_panel.gd")
const LAB := preload("res://scripts/ui/panels/lab_panel.gd")
const SKILLS := preload("res://scripts/ui/panels/skills_overlay.gd")

var _left: UiPanel
var _right: UiPanel
var _overlay: UiPanel
var _left_id := ""
var _right_id := ""
var _overlay_id := ""
var _panels: Control


func _ready() -> void:
	mouse_filter = MOUSE_FILTER_IGNORE
	add_child(Hud.new())
	_panels = Control.new()
	_panels.mouse_filter = MOUSE_FILTER_IGNORE
	add_child(_panels)
	add_child(DialogBox.new())
	add_child(CursorItem.new())
	add_child(UiTip.new())
	Game.ui_changed.connect(_on_ui)
	View.changed.connect(_layout)
	_layout()
	_sync()


func _layout() -> void:
	size = View.ui_size
	_panels.size = View.ui_size


func _on_ui(keys: Array) -> void:
	if "left" in keys or "right" in keys or "overlay" in keys or "service_npc" in keys:
		_sync()


func _make_left(id: String) -> UiPanel:
	match id:
		"character": return CHARACTER.new()
		"quests": return JournalPanels.QuestsPanel.new()
		"codex": return JournalPanels.CodexPanel.new()
		"options": return OPTIONS.new()
		"lab": return LAB.new() if Platform.dev_tools else null
	return ServicePanels.create(id)


func _sync() -> void:
	var ui := Game.ui
	var left: String = ui.left
	if left != _left_id or (_left != null and left in ["vendor", "herbs"]):
		if _left:
			_left.queue_free()
		_left = _make_left(left) if left != "" else null
		_left_id = left
		if _left:
			_panels.add_child(_left)
	if ui.right != _right_id:
		if _right:
			_right.queue_free()
		_right = INVENTORY.new() if ui.right == "inventory" else null
		_right_id = ui.right
		if _right:
			_panels.add_child(_right)
	elif _right:
		_right.mark() # sell/stash hints depend on the left panel
	if ui.overlay != _overlay_id:
		if _overlay:
			_overlay.queue_free()
		_overlay = SKILLS.new() if ui.overlay == "skills" else null
		_overlay_id = ui.overlay
		if _overlay:
			_panels.add_child(_overlay)
	UiTip.clear()


func _toggle_left(p: String) -> void:
	Game.set_ui({"left": "" if Game.ui.left == p else p, "dialog": {}})


func _unhandled_input(e: InputEvent) -> void:
	if Game.ui.phase != "playing" or not (e is InputEventKey) or not e.pressed:
		return
	if e.is_action_pressed("back"):
		UiTip.clear()
		if not Game.close_all():
			# Nothing open: Esc returns you to the menu (progress is saved).
			Game.flush()
			Game.set_ui({"phase": "menu"})
	elif e.is_echo():
		return
	elif e.is_action_pressed("toggle_inventory"):
		Game.set_ui({"right": "" if Game.ui.right != "" else "inventory"})
	elif e.is_action_pressed("toggle_character"):
		_toggle_left("character")
	elif e.is_action_pressed("toggle_skills"):
		Game.set_ui({"overlay": "" if Game.ui.overlay == "skills" else "skills", "dialog": {}})
	elif e.is_action_pressed("toggle_quests"):
		_toggle_left("quests")
	elif e.is_action_pressed("toggle_codex"):
		_toggle_left("codex")
	elif e.is_action_pressed("toggle_options"):
		_toggle_left("options")
	elif e.is_action_pressed("toggle_lab") and Platform.dev_tools:
		_toggle_left("lab")
	elif e.is_action_pressed("close_panels"):
		UiTip.clear()
		Game.close_all()
	else:
		return
	get_viewport().set_input_as_handled()


## The item stuck to your mouse (D2: pick up, carry, place).
class CursorItem extends Control:
	func _init() -> void:
		mouse_filter = MOUSE_FILTER_IGNORE
		z_index = 50

	func _process(_d: float) -> void:
		queue_redraw()

	func _draw() -> void:
		if not Game.has_hero():
			return
		var held = Game.hero().get("cursor")
		if held == null:
			return
		var sz := ItemIcon.size_px(held)
		ItemIcon.draw(self, held, (get_local_mouse_position() - sz / 2.0).round(), true, Color(1, 1, 1, 0.92))
