extends SceneTree
## Loads every game script (autoloads are live here) and reports errors.
func _initialize() -> void:
	pass
func _process(_d: float) -> bool:
	var bad := 0
	for dir in ["res://scripts/world", "res://scripts/ui", "res://scripts/ui/panels", "res://scripts"]:
		for f in DirAccess.get_files_at(dir):
			if f.ends_with(".gd"):
				var s = load(dir + "/" + f)
				if s == null or not s.can_instantiate():
					print("BAD ", dir, "/", f)
					bad += 1
	print("SMOKE bad=", bad)
	quit(bad)
	return true
