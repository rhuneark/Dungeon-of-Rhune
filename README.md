# Dungeon of Rhune

A pixel-art ARPG you can pick up for half an hour and come back to every day. **One town, one
dungeon.** Thornwick is stuck in one endless night; somewhere a hundred floors down the Sealed
Stair an hourglass has stopped, and the only way anyone leaves is for someone to conquer floor
100. So you go down: one sealed room at a time, a horde to clear in each, a chest when it's
empty, and the stair to the next floor. The townsfolk help however they can. D2-style loot is
the heart of it, and **your gear is your build**: no classes, no skill trees.

**Engine:** Godot 4.7 (GDScript, Compatibility renderer). **Platforms:** Steam (Windows,
Linux/Steam Deck; macOS optional) and the web, all from Godot export presets. All art is
generated with PixelLab (see `tools/art/`).

## Run it

1. Install [Godot 4.7](https://godotengine.org/download) (standard build, not .NET).
2. Open `project.godot` in the editor (first open imports the art; takes a few seconds).
3. Press **F5**. Editor runs are debug builds, so the Loot Lab (`` ` ``) is on.

To change the town, open `scenes/world/thornwick.tscn` (see *Editing Thornwick* below).

### Keeping your PC copy up to date

New work is pushed to the `claude/trusting-cray-6gvlg9` branch on GitHub. **Double-click
`update.bat`** (Windows; `./update.sh` on macOS/Linux) to pull the latest into your folder, then
switch back to Godot, which reloads changed files. Local edits (say, town changes made in the
editor) are kept: they're stashed for the update and re-applied. To send your own edits back,
commit and push them to the same branch (GitHub Desktop: *Commit* then *Push origin*).

First time only (your folder is still on the old web version, which has no `update.bat`), in a
terminal opened in the folder:

```bash
git fetch origin claude/trusting-cray-6gvlg9
git checkout claude/trusting-cray-6gvlg9
```

If `checkout` complains about local changes, run `git stash` first. No Git clone yet?
`git clone -b claude/trusting-cray-6gvlg9 https://github.com/rhuneark/Dungeon-of-Rhune.git`
Shipping on Steam (App ID, GodotSteam, exports, SteamPipe, Cloud, achievements, Deck) is in
[STEAM.md](STEAM.md).

## Controls

| | |
|---|---|
| Click / hold | walk (A* pathing); click people, objects and loot labels to use them |
| Click a monster | walk into range and keep attacking it until it falls (hold to chain to the next) |
| Shift + click | attack where you stand (hold to keep attacking) |
| Q (or 1) | drink the rejuvenation flask |
| T | portal back to Thornwick (in the dungeon) |
| WASD / arrows / left stick | walk directly |
| I (B) · C · L · O | Inventory · Character · Codex · Options |
| Right-click item | equip (rings fill all four fingers); slot a charm into your belt; sell when a shop is open; move to/from stash or crucible |
| Esc / Space | close panels (Esc with nothing open → menu) |
| `` ` `` (backtick) | **Loot Lab** dev tool: roll any treasure class, simulate 5,000 drops, cheats (debug builds, `--dev-tools`, `RHUNE_DEVTOOLS=1`, `?dev` on the web) |
| F11 / Alt+Enter | fullscreen |

All keys are input actions (Project Settings → Input Map), so rebinding is a settings change.

## The game

**The Sealed Stair (the dungeon).** Talk to Captain Maren (or click the Stair) and pick a
start: **Continue** (the floor after the last one you cleared: town trips to sell, identify and
gear up never cost you progress), floor 1, or any 5th floor you've reached. Every floor is one sealed room about the size
of an Infernal Hordes arena (hall, round or cross shaped). Waves pour out of four summoning
circles; deeper down come archers, brutes, ember cultists, wraiths and champions (tougher, blue,
better loot). Every 10th floor an **Hourglass Warden** holds the room. When the last monster
falls, a chest rises in the middle (the real haul), the sealed door opens onto the next floor,
and a portal home appears. Die and the town drags you home: you keep everything you carry, but
your next descent starts from a checkpoint. About a minute a floor early on, two or three by
floor 15.

**The climb.** Tuned with a bot that plays like a careful player (wears what drops, shops,
spends points): it reaches floor 15 at about level 15 in 20-35 minutes, with 0-2 deaths. Monster
life grows about x5 by floor 15, damage about x3; new kinds join at floors 4, 7, 11 and 16.

**Combat is your weapon.** Swords, axes and maces swing in an arc and hit everything in it; bows
shoot arrows; wands and staves cast bolts with a little splash. The weapon also decides which
attribute adds physical damage: Strength (melee), Dexterity (bows), Intelligence (casters).
Monster hits go through your block, armor, resistances and damage reduction; life leech, life
on kill and thorns all work.

**Levels are attribute points.** 5 per level: Strength, Dexterity, Stamina (life),
Intelligence (elemental damage). Everything else is gear.

**The flask.** No potions to carry: one rejuvenation flask on a cooldown (Q). Small heals 250;
Mother Ysolde brews a Medium (500) once you reach floor 20 and a Large (1000) at floor 50. Flask
potency and faster recovery roll on belts, amulets and charms.

**Loot (the heart).** D2-style item model: base types with item levels, tiered prefixes/suffixes
gated by affix level, quality ladder (crude → normal → superior → magic → rare → unique), magic
items drop **unidentified** (Old Varn reads them for free), rares get two-word names, uniques
roll **variable stats** (perfect rolls are tracked). Treasure classes with picks and "no drop"
weights. Grid ("tetris") inventory, paperdoll with **four ring slots** (two each side), shared
stash, D2 cursor pickup/place/swap. Loot on the ground is never drawn as the item: a drop arcs
out as a spark, lands with a flash, and becomes its name over a glowing ring with a beam of
light whose height and colour say how good it is (a white glint for plain items, a blue beam for
magic, tall gold/orange beams with drifting motes and floor light for rares, rhunes and uniques).

**Belts and charms.** Every belt rolls 1-8 charm slots (Sash 1-3, Belt 2-5, Heavy Belt 4-6, War
Girdle 6-8). Charms only work slotted into your equipped belt, and take slots by size: Small 1,
Large 2, Grand 3. A better belt is a bigger charm rack.

**Fortune: "magic find of certain things".** Rarity Find (better quality), Item Quantity (fewer
empty drops), Extra Gold, and **Targeted Find**: Weapon / Armor / Jewelry / Charm / Rhune Find
(more of THAT kind of drop) and Unique Find. Tune it all in the Loot Lab.

**Rhunes & Rhunewords** (the namesake). 12 rhunes with weapon/armor/shield effects; socket the
right ones *in order* into a plain item with exactly that many sockets to speak one of 9
Rhunewords. Brannoc's **Crucible** fuses 3 identical rhunes into the next, reforges magic items,
and can strip sockets; he also punches sockets into plain gear.

**Thornwick (the town).** Compact, like a Rogue Encampment: the stash by the campfire, the Stair
to the north, and each townsperson at their own door: Old Varn (identify everything, free; the
Codex), Mother Ysolde (the flask), Brannoc (crucible, sockets), Pell (trade), "Lucky" Odo
(sealed goods = gambling), Captain Maren (the Stair). The town patches you up whenever you're
home.

**The Codex**: Holy Grail tracking for every unique (with best roll %), rhune and rhuneword.

**Crisp pixels.** No window stretching: the world camera zooms by a whole number (~480 world px
visible vertically) and the UI layer scales by a whole number (UI canvas ≥ 690×430), so every
art pixel is a block of device pixels. Exception: 645–860 px tall windows (e.g. a 1366×768
laptop) get a 1.5× UI so text stays readable. Text is rasterized at device resolution, and the
pixel fonts are re-gridded so their pixels land on whole device pixels (`assets/fonts/README.md`).
Options (O) lets players pick UI scale and world zoom. World: 32px tiles, 64px characters; UI:
32px per inventory cell. Text uses one plain pixel face (Jersey 10) in bright colours; the gothic
face is only the logo.

**Look.** Classic 16-bit top-down three-quarter view. Thornwick is a gothic hamlet at night;
the Stair is near-black stone lit only by wall torches, braziers and summoning circles (Diablo
II-dark). All world art shares one 47-colour palette (`PALETTE` in `tools/art/spec.py`).
`scripts/world/atmosphere.gd` tints each zone (town dusk, dungeon dark) and lights it: torches,
braziers, lit windows and runes get real flickering lights, found automatically from their
colours. The UI and loot labels are never tinted.

## Editing Thornwick and the Stair

`scenes/world/thornwick.tscn` is a normal Godot scene, edited in the 2D editor:

- **Ground** (TileMapLayer): paint with the *Terrains* tab (grass, dirt, cobble, water; corners
  autotile). Water is not walkable.
- **Things** (y-sorted) and **Decals** (flat, under everything): `Prop` nodes. Pick the `art`
  (any file in `assets/art/props/`), set `block` (footprint in tiles, drawn red in the editor),
  `action` (stash, stair, statue), `display_name`, and `approach_dy` (where the player stands to
  use it, the cyan dot). The node's position is where the prop meets the ground.
- **NpcSpot**: where an NPC stands (`npc_id` from `scripts/content/npcs.gd`).
- **Blockers**: invisible walls (magenta). **Spawn**: where the hero appears.
- The root `Zone` sets the mood: `ambient` tint, `fog_density`, `hero_light` radius.

`tools/godot/build_thornwick.gd` builds this scene. Re-running it overwrites edits made in the
editor, so either make layout changes in the builder and re-run it, or edit the scene and stop
re-running it. Lights come from the art itself: a prop whose art has lamplight, fire or rune
colours glows on its own (tune per art in `LIGHT_TUNING`, `scripts/world/atmosphere.gd`).

Dungeon floors aren't scenes: `scripts/world/arena_builder.gd` builds each room at runtime
(shape, walls from the dungeon cliff tileset, torches, pillars, spawn circles, the door) and
`scripts/world/arena.gd` runs it (waves, monsters, hits, the chest). Monster stats and the
floor-by-floor scaling are data in `scripts/content/monsters.gd`.

## Where things live

```
project.godot           settings, autoloads, input map, [rhune] Steam settings
scenes/main.tscn        entry scene → scripts/main.gd (boot, loading screen, phase router,
                        town or dungeon floor, lifecycle)
scenes/world/           thornwick.tscn (the town)
scripts/autoload/       View (pixel-perfect scaling) · Platform (Steam, fullscreen, quit, dev tools)
                        Art (sprite sheets/atlases) · Game (save session, UI state, the flask,
                        town/dungeon travel, checkpoints, world bridge)
scripts/content/        pure data, where the design lives
  stats.gd item_bases.gd affixes.gd uniques.gd rhunes.gd rare_names.gd treasure_classes.gd
  monsters.gd npcs.gd achievements.gd
scripts/systems/        rules over the data (no rendering)
  item_gen.gd loot.gd   item creation (belts roll charm slots), treasure classes, quality rolls
  item_text.gd          derived item view: names, colours, final damage/defense, prices
  character_sheet.gd    stat sheet (gear + belt charms), the weapon's attack, the flask
  actions.gd            item flow: pickup, cursor, equip (4 rings), charms, socketing, identify, sell
  economy.gd            vendor, gambling, sockets, crucible recipes
  progression.gd hero_data.gd grid.gd save_io.gd rng.gd
scripts/world/          zone.gd + editor node types (prop, npc_spot, blocker),
                        zone_runtime.gd (player, NPCs, input, camera, the hero's attacks),
                        arena.gd + arena_builder.gd (dungeon floors), zone_nav.gd (A*),
                        ground_items.gd (loot labels/beams), fx.gd, interact.gd (what clicking does),
                        atmosphere.gd (tint, prop lights, mist, embers, vignette)
scripts/ui/             UI built in code: ui_kit.gd (palette, fonts, frames), ui_panel.gd (base
                        window), hud.gd (life, flask, boss bar), playing_ui.gd (panel slots +
                        hotkeys), main_menu.gd, grid_view.gd, item_icon.gd, ui_tip.gd +
                        item_tooltip.gd, panels/ (inventory with the belt strip, character, ...)
assets/                 art (packed sprites + glow masks + art_meta.json), fonts, tiles/terrain.tres, icon
tests/test_systems.tscn rules tests (items, loot, rings, charms, flask, floors, rooms, saves)
tools/art/              PixelLab pipeline (prompts → generation → packing into assets/art/)
tools/godot/            builders and test drivers (play_test, dungeon_test, campaign_test, shots, tour)
```

## Tests

```bash
godot --headless --path . --import                      # once, after cloning
godot --headless --path . res://tests/test_systems.tscn # rules: prints PASS/FAIL, exits non-zero on failure
# plays the real game with synthetic input (walk, pick up, talk, flask, descend, hit, portal, save):
xvfb-run -a godot --path . --resolution 1600x900 -s tools/godot/run.gd -- res://tools/godot/play_test.gd
# a bot clears floors 1-2 (or from any floor: add `<out_dir> <floor>`), opens the chests, takes the stair:
xvfb-run -a godot --path . --resolution 1600x900 -s tools/godot/run.gd -- res://tools/godot/dungeon_test.gd
# balance: a bot plays floors 1-15 with real gear management (prints a line per floor), faster than real time:
godot --headless --path . --fixed-fps 60 --audio-driver Dummy -s tools/godot/run.gd -- res://tools/godot/campaign_test.gd 15
```

## Next up (proposed)

1. **Balance the climb to 100**: monster scaling vs. gear power past floor 30 (more item tiers:
   exceptional/elite bases, affix tiers past level 30), floor modifiers.
2. **Gear-granted powers**: procs and "grants a skill" affixes/uniques (on-hit novas, chain
   lightning, frost armor), so builds come from what you wear.
3. Monster affixes for champions and uniques (fire-enchanted, extra fast, ...), the Coin-Gobbler
   (loot goblin; its treasure class already exists), sets.
4. Sound and music.
