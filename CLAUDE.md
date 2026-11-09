# Dungeon of Rhune (Godot 4.7, GDScript)

Ships on **Steam** (Godot desktop exports + optional GodotSteam GDExtension) and the **web**
(Godot Web export). There is no RUN.game, no Electron, no npm anymore. Never re-add them.

## File Structure

- **project.godot**: autoloads (order matters: View, Platform, Art, Game), input map (all hotkeys
  are actions), Compatibility renderer, nearest filtering, pixel snapping, NO stretch mode,
  `[rhune] steam/app_id` (0 = no Steam), custom user dir "Dungeon of Rhune".
- **scripts/main.gd** (scenes/main.tscn): boot → loading screen (warms every texture via
  `Art.warm`) → menu → playing. Owns World (zone + ZoneRuntime) and the UI CanvasLayer
  (scaled by `View.ui_scale`, root Control sized `View.ui_size`). Sets
  `Viewport.oversampling_override = ui_scale`. Flushes the save on focus loss and window close.
- **scripts/autoload/**: `view.gd` (integer world zoom + UI scale, prefs in user://view.cfg),
  `platform.gd` (Steam via `Engine.get_singleton("Steam")`, fullscreen, quit, achievements,
  `dev_tools`), `art.gd` (art_meta.json, character frames, tile coords, cached textures),
  `game.gd` (the session: `save`, `commit()`, `flush()`, `sheet()`, `ui` + `set_ui()`, toasts,
  world bridge signals `drops_requested` / `float_text_requested`).
- **scripts/content/**: pure data (static funcs + static var caches). **scripts/systems/**:
  rules (static funcs). Port of the old TS with the SAME dictionary keys (camelCase:
  `baseId`, `uniqueValues`...) so saves are unchanged. `Rng` is mulberry32, bit-identical to the
  TS build.
- **scenes/world/thornwick.tscn**: the town, edited in the editor (Ground TileMapLayer with
  terrains, Decals, Things y-sorted, Items, Blockers, Spawn). Node types in **scripts/world/**:
  `Prop` (art/block/action/approach_dy, anchored at the visible base), `NpcSpot`,
  `PlacedItem`, `Blocker`, `Zone` (root: zone_name, level, critter_area).
- **scripts/world/zone_runtime.gd**: brings a Zone to life (nav from terrain + footprints +
  blockers, player, NPCs, goose, ground loot, hover/click, camera). `interact.gd`: what using
  things does (dialogs, panels, quest events).
- **scripts/ui/**: all UI built in code. `ui_kit.gd` (palette, fonts, 9-slice pixel frames,
  widget factories), `ui_panel.gd` (base window: rebuilds its body on `Game.changed`, deferred),
  `playing_ui.gd` (panel slots + hotkeys), `hud.gd`, `main_menu.gd`, `grid_view.gd`,
  `item_icon.gd`, `ui_tip.gd` + `item_tooltip.gd`, `panels/`.
- **assets/**: `art/` (packed by tools/art/pack.py + art_meta.json), `fonts/` (re-gridded pixel
  fonts, see its README), `tiles/terrain.tres` (built by tools/godot/build_tileset.gd), icon.
- **tests/test_systems.tscn**: rules tests. **tools/godot/**: builders + test drivers.
- **export_presets.cfg**: Windows Desktop, Linux, macOS, Web → `builds/` (ignored).
  **steam/**: SteamPipe templates. **STEAM.md**: the release guide.

## Key Patterns

- **Crisp pixels**: world in WORLD PIXELS (32px tiles, 64px characters), UI in UI PIXELS (32px
  per inventory cell); both scale by whole device-pixel factors (UI may be 1.5x on mid-size
  windows). Keep positions integer, never scale art by non-integers. Fonts only at: Jersey 10
  at 10/20, Jacquarda Bastarda 9 at 18/36, Silkscreen at 8 (`UiKit.STYLES`). UI layouts must
  fit ~800×450 UI px (min 690×430). No ✓ ★ → glyphs in the fonts; use ASCII.
- **Textures**: get them through `Art` (cached). A texture first loaded inside `_draw()` renders
  white, which is why main.gd warms them all at boot.
- **Game → UI**: `Game.commit()` emits `changed` (panels rebuild); `Game.set_ui({...})` emits
  `ui_changed(keys)`. Never per-frame. **UI → game**: `Game.ui` fields the runtime reads, or
  direct calls (`Interact`, `Actions`, `Economy`).
- **Mouse routing**: full-screen UI containers are `MOUSE_FILTER_IGNORE`; panels `STOP`. World
  clicks arrive in `ZoneRuntime._unhandled_input`; world hover is skipped while
  `gui_get_hovered_control()` is set. Buttons are `FOCUS_NONE` (Space/Enter must not press them).
- **Content vs systems**: new items/affixes/uniques/rhunes/skills/quests are DATA in
  `scripts/content/`; rules in `scripts/systems/`. Tooltips and stats are derived, so
  rebalancing data updates existing saves. Stats are string ids (`res:fire`, `seek:rhune`,
  `tagPct:projectile`, `skill:<id>`, `quirk:<id>`). Scale by tag/damage type, never by skill.
- **Save mutations**: mutate `Game.save` / `Game.hero()`, then `Game.commit()` (1.5s debounced
  autosave; `Game.flush()` saves now). Item movement goes through `Actions`.
- **Errors**: rules return `""` for success or an error string; optional dicts return `{}`.
  JSON numbers load as floats: `SaveIO` normalizes them back to ints.
- **Platform posture**: only `platform.gd` touches Steam/OS; every call must degrade gracefully.
  The game runs identically with no GodotSteam addon, App ID 0, or no Steam client.
- **GDScript gotchas**: `var x := dict.key` fails to infer, so type it (`var x: bool = ...`).
  Warnings about Variant inference are errors. In `-s` tool scripts, autoloads are not globals
  at compile time. Load game scripts at runtime (see tools/godot/run.gd).

## What to Modify

- **New zone** → new scene with a `Zone` root (copy thornwick.tscn's layer layout), loaded from
  main.gd (`ZONE_SCENE`; zone switching comes with the Wilds).
- **New art** → prompt in `tools/art/spec.py`, run `gen.py` then `pack.py` (writes
  assets/art + art_meta.json). New props appear in a Prop's `art` picker. Buildings use the
  FRONT style and are sized so doors fit the 64px characters.
- **Loot tuning** → `scripts/content/treasure_classes.gd` (TCs + `QUALITY_TUNING`), affix tiers
  and weights in `affixes.gd`; check with the Loot Lab (`` ` ``).
- **UI** → `scripts/ui/` (new left panel: add to `PlayingUi._make_left`). Palette: `UiKit`.
- **Hotkeys** → Project Settings → Input Map + `PlayingUi._unhandled_input`.
- **View scale** → `WORLD_TARGET_H` / `UI_TARGET_H` in `scripts/autoload/view.gd`.
- **Steam** → App ID in project.godot `[rhune]`; achievements in `scripts/content/achievements.gd`
  (must match Steamworks API names); release steps in STEAM.md.

## Verification

- `godot --headless --path . --import` clean (no SCRIPT ERROR); `godot --headless --path . -s
  tools/godot/smoke.gd` loads every script (`SMOKE bad=0`).
- `godot --headless --path . res://tests/test_systems.tscn` → `RESULT 207/207`.
- `xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution
  1600x900 -s tools/godot/run.gd -- res://tools/godot/play_test.gd` → `PLAYTEST OK`.
- Screenshots: same with `res://tools/godot/shots.gd <out_dir>` (also try 1366x768 → UI 1.5x).
- `godot --headless --path . --export-pack "Linux" builds/pck/rhune.pck` then
  `godot --main-pack builds/pck/rhune.pck` boots to the menu (checks export filters).
