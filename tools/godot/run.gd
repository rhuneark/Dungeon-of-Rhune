extends SceneTree
## Bootstraps the real game plus a driver node (scripts that reference
## autoloads must load after this file compiles, so the driver is loaded here
## at runtime). Run under xvfb (not --headless) to get pixels:
##   xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy \
##     --resolution 1600x900 -s tools/godot/run.gd -- res://tools/godot/play_test.gd [out_dir]


func _initialize() -> void:
	var args := OS.get_cmdline_user_args()
	root.add_child.call_deferred(load("res://scenes/main.tscn").instantiate())
	var driver: Node = load(args[0]).new()
	driver.set_meta("args", args.slice(1))
	root.add_child.call_deferred(driver)
