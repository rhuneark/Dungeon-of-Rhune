class_name SaveIO
## Persistence: user://saves/rhune_save_v2.json (the OS user-data folder;
## Steam Auto-Cloud syncs it). Writes are atomic (write .tmp, keep the previous
## file as .bak, rename); loads fall back to the .bak. A save/load failure
## must never brick the game.
##
## JSON turns every number into a float, so loads convert integral floats back
## to ints, then sanitize stale content ids (renamed bases are dropped).
## v2 saves (the floor-climbing build) load and are upgraded in place: the
## one stash becomes the Eternal Trade stash, floors become expedition tiers.
## v1 saves from the town-only build are left alone on disk and not read.

## Overridable (tests point it elsewhere so they never touch a real save).
static var dir := "user://saves"
const SAVE_KEY := "rhune_save_v2"


static func path() -> String:
	return dir + "/" + SAVE_KEY + ".json"


## Drop items whose base no longer exists (content gets renamed as the game evolves).
static func _clean_items(items) -> Array:
	var out: Array = []
	if not items is Array:
		return out
	for it in items:
		if it is Dictionary and ItemBases.has_base(String(it.get("baseId", ""))):
			it.socketed = _clean_items(it.get("socketed", []))
			out.append(it)
	return out


static func _valid_item(it) -> bool:
	return it is Dictionary and ItemBases.has_base(String(it.get("baseId", "")))


static func sanitize(raw: Dictionary) -> Dictionary:
	var save := HeroData.default_save()
	for k in raw:
		save[k] = raw[k]
	var stats: Dictionary = HeroData.default_save().stats
	var raw_stats = raw.get("stats")
	if raw_stats is Dictionary:
		for k in raw_stats:
			stats[k] = raw_stats[k]
	save.stats = stats
	if not save.codex is Dictionary:
		save.codex = {}
	# v2 had one shared stash: it becomes the Eternal Trade stash.
	var stashes = save.get("stashes", {})
	if not stashes is Dictionary:
		stashes = {}
	if save.has("stash"):
		if stashes.is_empty():
			stashes["eternal:trade"] = save.stash
		save.erase("stash")
	for k in stashes.keys():
		stashes[k] = _clean_items(stashes[k])
	save.stashes = stashes
	if not save.get("reclaim") is Dictionary:
		save.reclaim = {}
	for k in save.reclaim.keys():
		save.reclaim[k] = _clean_items(save.reclaim[k])
	save.version = 3
	if save.hero is Dictionary:
		_clean_hero(save.hero)
	else:
		save.hero = null
	var bench: Array = []
	for h in save.get("bench", []):
		if h is Dictionary:
			bench.append(_clean_hero(h))
	save.bench = bench
	Seasons.migrate(save)
	return save


static func _clean_hero(h: Dictionary) -> Dictionary:
	h.inventory = _clean_items(h.get("inventory", []))
	var eq = h.get("equipped", {})
	if not eq is Dictionary:
		eq = {}
	for k in eq.keys():
		if not _valid_item(eq[k]):
			eq.erase(k)
		else:
			eq[k].socketed = _clean_items(eq[k].get("socketed", []))
			if eq[k].has("charms"):
				eq[k].charms = _clean_items(eq[k].charms)
	h.equipped = eq
	if h.get("cursor") != null and not _valid_item(h.cursor):
		h.cursor = null
	elif h.get("cursor") != null:
		h.cursor.socketed = _clean_items(h.cursor.get("socketed", []))
	else:
		h.cursor = null
	if not h.get("flags") is Dictionary:
		h.flags = {}
	h.crucible = _clean_items(h.get("crucible", []))
	# Floors became tiers (about four levels of monster each).
	if h.has("bestFloor"):
		h.bestTier = maxi(int(h.get("bestTier", 0)), int(h.bestFloor) / Expeditions.TIER_LEVELS)
		h.erase("bestFloor")
	h.erase("resumeFloor")
	h.bestTier = int(h.get("bestTier", 0))
	if not h.get("expedition") is Dictionary:
		h.expedition = {}
	if not h.get("mode") in Seasons.MODES:
		h.mode = "trade"
	if not h.get("realm") is String:
		h.realm = Seasons.ETERNAL
	return h


## JSON numbers come back as floats: turn integral ones back into ints.
static func normalize(v: Variant) -> Variant:
	match typeof(v):
		TYPE_FLOAT:
			if is_finite(v) and v == floorf(v) and absf(v) < 9007199254740992.0:
				return int(v)
			return v
		TYPE_ARRAY:
			var a: Array = []
			for e in v:
				a.append(normalize(e))
			return a
		TYPE_DICTIONARY:
			var d := {}
			for k in v:
				d[k] = normalize(v[k])
			return d
	return v


static func _read(p: String) -> Variant:
	if not FileAccess.file_exists(p):
		return null
	var text := FileAccess.get_file_as_string(p)
	if text == "":
		return null
	var json := JSON.new()
	if json.parse(text) != OK:
		return null
	return json.data if json.data is Dictionary else null


static func load_game() -> Dictionary:
	var raw = _read(path())
	if raw == null:
		if FileAccess.file_exists(path()):
			push_warning("[save] corrupt save — trying the backup")
		raw = _read(path() + ".bak")
	if raw == null:
		return HeroData.default_save()
	return sanitize(normalize(raw))


static func save_game(data: Dictionary) -> void:
	if DirAccess.make_dir_recursive_absolute(dir) != OK and not DirAccess.dir_exists_absolute(dir):
		push_warning("[save] cannot create " + dir)
		return
	var p := path()
	var tmp := p + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_warning("[save] save failed — will retry on the next save (%s)" % error_string(FileAccess.get_open_error()))
		return
	f.store_string(JSON.stringify(data))
	f.close()
	if FileAccess.file_exists(p):
		DirAccess.copy_absolute(p, p + ".bak")
	var err := DirAccess.rename_absolute(tmp, p)
	if err != OK:
		push_warning("[save] rename failed (%s)" % error_string(err))


static func wipe_save() -> void:
	for p in [path(), path() + ".bak", path() + ".tmp"]:
		if FileAccess.file_exists(p):
			DirAccess.remove_absolute(p)
