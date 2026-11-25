# Dungeon of Rhune (Godot 4.7, GDScript)

The game: ALL DUNGEON. You start in the Refuge (a plain dungeon hall: the townsfolk, the stash,
Maren's map table). Expeditions: a branching map (6 steps of 2-3 rooms + the Warden's vault) you
pick your way through; each room is one sealed arena (waves, then a chest) whose type grants a
stacking boon for the expedition; greedy rooms double it but add stacking afflictions (Threat
feeds the loot); boons/afflictions synergize. Beating the Warden opens the next tier (no floors,
no floor 100). Death loses the expedition, not your items. Modes: Season/Eternal x Trade/SSF,
one stash per pair, hero roster; trading is planned. Gear is the whole build: no classes, no
skills, no skill trees, no mana, no potions (one rejuvenation flask on a cooldown). Levels only
give attribute points. Keep it that way unless asked; "we'll build it out later".

Ships on **Steam** (Godot desktop exports + optional GodotSteam GDExtension) and the **web**
(Godot Web export). There is no RUN.game, no Electron, no npm anymore. Never re-add them.

## File Structure

- **project.godot**: autoloads (order matters: View, Platform, Art, Game), input map (all hotkeys
  are actions), Compatibility renderer, nearest filtering, pixel snapping, NO stretch mode,
  `[rhune] steam/app_id` (0 = no Steam), custom user dir "Dungeon of Rhune".
- **scripts/main.gd** (scenes/main.tscn): boot → loading screen (warms every texture via
  `Art.warm`) → menu (hero roster; new hero picks realm + mode) → playing. While playing, the zone
  follows `Game.ui.location`: refuge → `ArenaBuilder.build_refuge()`; room → `ArenaBuilder.
  build_room(expedition, node)` + an `Arena` (`Game.ui.room` = node id). Owns World (zone +
  ZoneRuntime) and the UI CanvasLayer
  (scaled by `View.ui_scale`, root Control sized `View.ui_size`). Sets
  `Viewport.oversampling_override = ui_scale`. Flushes the save on focus loss and window close.
- **scripts/autoload/**: `view.gd` (integer world zoom + UI scale, prefs in user://view.cfg),
  `platform.gd` (Steam via `Engine.get_singleton("Steam")`, fullscreen, quit, achievements,
  `dev_tools`), `art.gd` (art_meta.json, character frames, tile coords, cached textures),
  `game.gd` (the session: `save`, `commit()`, `flush()`, `sheet()`, `ui` + `set_ui()`, toasts,
  the flask (`drink_flask`, `flask_fraction`, on the game `clock`), expeditions (`expedition()`,
  `start_expedition`, `enter_room`, `room_cleared`, `finish_expedition`, `abandon_expedition`,
  `return_to_refuge`), roster (`roster`, `select_hero`, `add_hero`, `delete_hero`), the stash
  (`stash()` / `stash_key()`: one per realm:mode), world bridge signals `drops_requested` /
  `float_text_requested`).
- **scripts/content/expeditions.gd** (ROOMS, BOONS, AFFLICTIONS, SYNERGIES, DREADS, THREAT_*)
  + **scripts/systems/expedition.gd** (generate (seeded), options/enter/complete, hero_stats
  (fed into CharacterSheet), monster_mods (fed into Arena/Mob), level_of (tier*4 + step),
  start/finish/abandon). State is plain JSON on `hero.expedition`. **scripts/content/seasons.gd**:
  realms (CURRENT season, eternal), modes (trade/ssf), `migrate()` for ended seasons.
- **scripts/content/**: pure data (static funcs + static var caches). **scripts/systems/**:
  rules (static funcs). Port of the old TS with the SAME dictionary keys (camelCase:
  `baseId`, `uniqueValues`...) so saves are unchanged. `Rng` is mulberry32, bit-identical to the
  TS build.
- Zones are built in code (no hand-made scenes): Ground + Shade TileMapLayers, Decals, Things
  (y-sorted), Items, Blockers, Spawn. Node types in **scripts/world/**: `Prop`
  (art/block/action/approach_dy, anchored at the visible base; put a base on a tile line when
  it has an action, or its approach point lands in its own footprint), `NpcSpot`, `Blocker`,
  `Zone` (root: zone_name, level, ambient, fog_density, hero_light).
- **scripts/world/arena_builder.gd** builds the Refuge and every room as a Zone at runtime: an
  axis-aligned shape (refuge / hall with bays / cross / court with stone islands; never diagonal
  walls), drawn top-down oblique from `assets/art/tiles/dungeon_walls.png` (made by
  `tools/art/dungeon_walls.py`: flagstone floor, dark wall caps with a lit rim, a 2-tile brick face
  on every wall with floor below it, a Shade layer of wall shadow on the floor), then dressed by
  the room type (wall art between the torches, tall props on the shoulders / flanking the door in
  a court, low props scattered, a 2x floor sigil in the room colour, spawn circles, door);
  **arena.gd** runs a room (waves (Swarming/Relentless), Mob AI (straight at the hero when clear, else the nav flow field
  `ZoneNav.flow_to/flow_step`), projectiles (collide on the same feet line the shooters' thin
  line-of-sight checks), every hit both ways (Embers/Frostbite add elemental shares), XP/drops,
  death (loses the expedition), the chest (leaned by room type, +1 roll per 4 Threat), the exit
  (opens the map; the vault's finishes the expedition); a Sanctuary clears on entry). Monster
  numbers and level scaling: scripts/content/monsters.gd (tuned with campaign_test.gd).
  `ground_items.gd`: loot is never drawn as the item: name label + unshaded floor ring + beam
  sized by tier (`TIERS`), spark flight, landing burst, light for rare+.
- **scripts/world/zone_runtime.gd**: brings a Zone to life (nav from terrain + footprints +
  blockers, player, NPCs, ground loot, hover/click, camera, the hero's attacks: walk into range,
  swing timed by attack speed, `Arena.player_attack` at 55% of the swing). `interact.gd`: what
  using things does (dialogs, panels, the map table / Deep Gate, chest, exit, portal). `atmosphere.gd`: the look at runtime (dusk
  CanvasModulate, a flickering PointLight2D per glow cluster from art_meta, unshaded glow
  sprites, pixel-snapped fog shader, embers, vignette CanvasLayer). Loot labels and float text
  live on an `Overlay` CanvasLayer (follows the camera) so the tint never dims them.
- **scripts/ui/**: all UI built in code. `ui_kit.gd` (palette, fonts, 9-slice pixel frames,
  widget factories), `ui_panel.gd` (base window: rebuilds its body on `Game.changed`, deferred),
  `playing_ui.gd` (panel slots, the full overlay (`Game.ui.overlay` = "map" → `panels/
  map_panel.gd`), hotkeys incl. M map, T refuge), `hud.gd`, `main_menu.gd`, `grid_view.gd`,
  `item_icon.gd`, `ui_tip.gd` + `item_tooltip.gd`, `panels/`.
- **assets/**: `art/` (packed by tools/art/pack.py + art_meta.json; `art/glow/` = each prop's
  light-emitting pixels, `glow` clusters in art_meta), `fonts/` (re-gridded pixel fonts, see its
  README), icon.
- **tests/test_systems.tscn**: rules tests. **tools/godot/**: builders + test drivers.
- **export_presets.cfg**: Windows Desktop, Linux, macOS, Web → `builds/` (ignored).
  **steam/**: SteamPipe templates. **STEAM.md**: the release guide.

## Key Patterns

- **Crisp pixels**: world in WORLD PIXELS (32px tiles, 64px characters), UI in UI PIXELS (32px
  per inventory cell); both scale by whole device-pixel factors (UI may be 1.5x on mid-size
  windows). Keep positions integer, never scale art by non-integers. Text is the plain Jersey 10
  at 10 (body/captions) and 20 (titles); the gothic Jacquarda is for the logo only (36)
  (`UiKit.STYLES`). Keep text bright on dark panels (PARCH/DIM). UI layouts must fit ~800×450
  UI px (min 690×430). No ✓ ★ → glyphs in the fonts; use ASCII.
- **Textures**: get them through `Art` (cached). A texture first loaded inside `_draw()` renders
  white, which is why main.gd warms them all at boot.
- **Game → UI**: `Game.commit()` emits `changed` (panels rebuild); `Game.set_ui({...})` emits
  `ui_changed(keys)`. Never per-frame. **UI → game**: `Game.ui` fields the runtime reads, or
  direct calls (`Interact`, `Actions`, `Economy`).
- **Mouse routing**: full-screen UI containers are `MOUSE_FILTER_IGNORE`; panels `STOP`. World
  clicks arrive in `ZoneRuntime._unhandled_input`; world hover is skipped while
  `gui_get_hovered_control()` is set. Buttons are `FOCUS_NONE` (Space/Enter must not press them).
- **Content vs systems**: new items/affixes/uniques/rhunes/monsters are DATA in
  `scripts/content/`; rules in `scripts/systems/`. Tooltips and stats are derived, so
  rebalancing data updates existing saves. Stats are string ids (`res:fire`, `seek:rhune`,
  `tagPct:projectile`, `flaskRecovery`, `quirk:<id>`). Attack tags: melee / ranged+projectile
  (bows) / spell+projectile (caster weapons). Attribute ids stay might/finesse/vigor/spirit;
  players see Strength/Dexterity/Stamina/Intelligence.
- **Gear rules**: 4 ring slots (ring1-ring4). Belts roll `charmSlots` (1-8); charms (bases
  curio_*) count ONLY in the equipped belt's `charms`, taking `charmSize` slots (1/2/3).
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

- **New room type** → an entry in `Expeditions.ROOMS` (+ its boon in BOONS); dressing comes from
  its `wall`/`props`/`color`. New afflictions/synergies/dreads are data there too. Re-run
  `tools/godot/room_shots.gd` to look at it; run the campaign bot to check balance.
- **New art** → prompt in `tools/art/spec.py`, run `gen.py` (use `--only x --variants 3` and pick
  from out/candidates/) then `pack.py` (writes assets/art + art_meta.json + glow). New props
  appear in a Prop's `art` picker. LOOK: grim gothic high fantasy at dusk; everything in the
  world is forced onto `spec.PALETTE` (keep it that way, it's what makes the world cohere). The
  lamplight/fire/rune palette colours are for things that emit light: the packer turns them into
  lights. PERSPECTIVE: top-down oblique like Chronicon / a 2D Diablo: floors seen from above,
  everything standing seen from the front with a sliver of top, NEVER an isometric corner view.
  Buildings use the FRONT style (square towers drift to a corner view, so towers are round) and
  are sized so doors fit the 64px characters. Small props that drift (chests, crates, pillars,
  carts...) are `spec.FRONT_PROPS`: `tools/art/guides.py` draws a front-facing composition guide,
  gen.py passes it at strength 70; generate `--variants 4` and pick the straight-on ones.
  `tools/godot/room_shots.gd <out_dir>` shoots every dungeon room shape for a look check.
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
- `godot --headless --path . res://tests/test_systems.tscn` → `RESULT 270/270`.
- `xvfb-run -a -s "-screen 0 1600x900x24" godot --path . --audio-driver Dummy --resolution
  1600x900 -s tools/godot/run.gd -- res://tools/godot/play_test.gd` → `PLAYTEST OK` (includes
  "every NPC and usable object is reachable", chart → click a room on the map → fight → T).
- Screenshots: same with `res://tools/godot/shots.gd <out_dir>` (also try 1366x768 → UI 1.5x);
  `res://tools/godot/room_shots.gd <out_dir> [types]` shoots the Refuge, every room type, the map.
- Dungeon: same with `res://tools/godot/dungeon_test.gd [out_dir] [tier]` → a bot charts an
  expedition and clears two rooms picked off the map → `DUNGEON OK`.
- Balance: `godot --headless --path . --fixed-fps 60 --audio-driver Dummy -s tools/godot/run.gd --
  res://tools/godot/campaign_test.gd 4 [max_deaths] [greed]` → a gear-managing bot plays
  expeditions through Tier 4 (one line per room, one per expedition) → `CAMPAIGN OK` (expect
  20-25 game minutes, level 21-25, 0-1 deaths, usually at the first Warden after a greedy path;
  it's random, so run 3 in parallel after touching monsters.gd, expeditions.gd, AI, XP or loot).
- `godot --headless --path . --export-pack "Linux" builds/pck/rhune.pck` then
  `godot --main-pack builds/pck/rhune.pck` boots to the menu (checks export filters).
