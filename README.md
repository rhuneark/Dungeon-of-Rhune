# Dungeon of Rhune

A pixel-art ARPG homage: Diablo II's loot, Grim Dawn's dual masteries, Last Epoch's per-skill
trees, and Diablo's weird little things, with its own twists. No story mode; the world
explains itself through small lore quests. This build is the **foundation + the main town,
Thornwick**. Combat, the Wilds and the Pit come next.

**Engine:** Godot 4.7 (GDScript, Compatibility renderer). **Platforms:** Steam (Windows,
Linux/Steam Deck; macOS optional) and the web, all from Godot export presets. All art is
generated with PixelLab (see `tools/art/`).

## Run it

1. Install [Godot 4.7](https://godotengine.org/download) (standard build, not .NET).
2. Open `project.godot` in the editor (first open imports the art; takes a few seconds).
3. Press **F5**. Editor runs are debug builds, so the Loot Lab (`` ` ``) is on.

To change the town, open `scenes/world/thornwick.tscn` (see *Editing Thornwick* below).
Shipping on Steam (App ID, GodotSteam, exports, SteamPipe, Cloud, achievements, Deck) is in
[STEAM.md](STEAM.md).

## Controls

| | |
|---|---|
| Click / hold | walk (A* pathing); click people, objects and loot labels to use them |
| WASD / arrows / left stick | walk directly |
| I (B) · C · K (T) · Q · L · O | Inventory · Character · Skills · Quests · Codex · Options |
| Right-click item | use / equip; sell when a shop is open; move to/from stash or crucible |
| Esc / Space | close panels (Esc with nothing open → menu) |
| `` ` `` (backtick) | **Loot Lab** dev tool: roll any treasure class, simulate 5,000 drops, cheats (debug builds, `--dev-tools`, `RHUNE_DEVTOOLS=1`, `?dev` on the web) |
| F11 / Alt+Enter | fullscreen |

All keys are input actions (Project Settings → Input Map), so rebinding is a settings change.

## What's in the foundation

**Loot (the heart).** D2-style item model: base types with item levels, tiered prefixes/suffixes
gated by affix level, quality ladder (crude → normal → superior → magic → rare → unique), magic
items drop **unidentified** (Old Varn reads them for free, or use a Scroll of Insight), rares get
two-word names, uniques roll **variable stats** (perfect rolls are tracked). Treasure classes with
picks and "no drop" weights. Grid ("tetris") inventory, paperdoll, shared stash, D2 cursor
pickup/place/swap. Ground loot pops out in arcs with coloured labels; uniques get a light beam.

**Fortune: "magic find of certain things".** Three classic stats plus **Targeted Find**:

- *Rarity Find*: better quality on everything (D2 diminishing returns on rare/unique)
- *Item Quantity*: fewer empty drops · *Extra Gold*
- *Weapon / Armor / Jewelry / Curio / Rhune Find*: more of THAT kind of drop
- *Unique Find*: boosts only the unique roll

Gear can roll these ("Scribe's" = Rhune Find, "Grailseeker's" = Unique Find, ...), so players can
build a hunting kit for exactly what they're chasing. Tune it all in the Loot Lab.

**Rhunes & Rhunewords** (the namesake). 12 rhunes with weapon/armor/shield effects; socket the
right ones *in order* into a plain item with exactly that many sockets to speak one of 9
Rhunewords. Brannoc's **Crucible** fuses 3 identical rhunes into the next, reforges magic items,
and can strip sockets; he also punches sockets into plain gear.

**Curios**: charms that work from the backpack (small/medium/grand). Every cell they use is a
cell you can't fill with loot.

**Disciplines (Grim Dawn) + skill trees (Last Epoch).** No classes. Pick any two of four
Disciplines (Bulwark, Emberwright, Galeborn, Hollowcaller); every pair has a title (Forgeguard,
Ashbinder, Nightwind...). Path Points (1/level + lore quests) raise Discipline rank: passive stats
per rank, skills unlock at rank thresholds. Specialize up to 5 skills; each has its own node tree,
and specialized skills level up with your XP (one tree point per level, plus +skill gear). Nodes
include cross-discipline conversions (a Bulwark slam that turns to fire, thralls that use forge
fire). If it makes sense, it works. Tree effects are data the combat layer will read.

**Thornwick.** Six NPCs with services: Old Varn (identify, Codex), Brannoc (crucible, sockets),
Pell (trader), Mother Ysolde (potions/scrolls), "Lucky" Odo (sealed goods = gambling), Captain
Maren (the gate). Plus the Wishing Well (gold → loot), your Strongbox, the Sealed Stair, a
Rhunestone Circle (future waypoint), a graveyard, a pond and **the Goose**. Eight lore quests are
completable in town and pay out Path Points, XP, items and lore entries.

**The Codex**: Holy Grail tracking for every unique (with best roll %), rhune and rhuneword
you've found, plus unlocked lore.

**Crisp pixels.** No window stretching: the world camera zooms by a whole number (~480 world px
visible vertically) and the UI layer scales by a whole number (UI canvas ≥ 690×430), so every
art pixel is a block of device pixels. Exception: 645–860 px tall windows (e.g. a 1366×768
laptop) get a 1.5× UI so text stays readable. Text is rasterized at device resolution, and the
pixel fonts are re-gridded so their pixels land on whole device pixels (`assets/fonts/README.md`).
Options (O) lets players pick UI scale and world zoom. World: 32px tiles, 64px characters; UI:
32px per inventory cell.

**Perspective.** Classic 16-bit "top-down three-quarter": ground seen from above, buildings and
characters seen from the front.

## Editing Thornwick

`scenes/world/thornwick.tscn` is a normal Godot scene, edited in the 2D editor:

- **Ground** (TileMapLayer): paint with the *Terrains* tab (grass, dirt, cobble, water; corners
  autotile). Water is not walkable.
- **Things** (y-sorted) and **Decals** (flat, under everything): `Prop` nodes. Pick the `art`
  (any file in `assets/art/props/`), set `block` (footprint in tiles, drawn red in the editor),
  `action` (stash, well, quests, inspect, waypoint, statue, gate), `display_name`, and
  `approach_dy` (where the player stands to use it, the cyan dot). The node's position is
  where the prop meets the ground.
- **NpcSpot**: where an NPC stands (`npc_id` from `scripts/content/npcs.gd`).
- **Items**: `PlacedItem` quest items on the ground (`key` is remembered once taken).
- **Blockers**: invisible walls (magenta). **Spawn**: where the hero appears.
- `critter_area` on the root: where the goose wanders.

`tools/godot/build_thornwick.gd` generated the first version of this scene from the web build's
data. Re-running it overwrites your edits, so don't, unless you mean to start over.

## Where things live

```
project.godot           settings, autoloads, input map, [rhune] Steam settings
scenes/main.tscn        entry scene → scripts/main.gd (boot, loading screen, phase router, lifecycle)
scenes/world/           zone scenes (thornwick.tscn)
scripts/autoload/       View (pixel-perfect scaling) · Platform (Steam, fullscreen, quit, dev tools)
                        Art (sprite sheets/atlases) · Game (save session + UI state + world bridge)
scripts/content/        pure data, where the design lives
  stats.gd item_bases.gd affixes.gd uniques.gd rhunes.gd rare_names.gd treasure_classes.gd
  disciplines.gd (skills + trees) lore.gd quest_defs.gd npcs.gd achievements.gd
scripts/systems/        rules over the data (no rendering)
  item_gen.gd loot.gd   item creation, treasure-class resolution, quality rolls
  item_text.gd          derived item view: names, colours, final damage/defense, prices
  character_sheet.gd    stat sheet (gear, curios, disciplines, passives, tree nodes)
  actions.gd            item flow: pickup, cursor, equip, socketing, identify, sell
  economy.gd            vendors, gambling, wishing well, sockets, crucible recipes
  skill_rules.gd quest_rules.gd progression.gd hero_data.gd grid.gd save_io.gd rng.gd
scripts/world/          zone.gd + editor node types (prop, npc_spot, placed_item, blocker),
                        zone_runtime.gd (player, NPCs, goose, input, camera), zone_nav.gd (A*),
                        ground_items.gd (loot labels/beams), fx.gd, interact.gd (what clicking does)
scripts/ui/             UI built in code: ui_kit.gd (palette, fonts, frames), ui_panel.gd (base
                        window), hud.gd, playing_ui.gd (panel slots + hotkeys), main_menu.gd,
                        grid_view.gd, item_icon.gd, ui_tip.gd + item_tooltip.gd, panels/
assets/                 art (packed sprites + art_meta.json), fonts, tiles/terrain.tres, icon
tests/test_systems.tscn 207 rules tests (loot/item parity with the original web build)
tools/art/              PixelLab pipeline (prompts → generation → packing into assets/art/)
tools/godot/            tileset/scene builders and test drivers (play_test, shots)
```

## Tests

```bash
godot --headless --path . --import                      # once, after cloning
godot --headless --path . res://tests/test_systems.tscn # rules: prints PASS/FAIL, exits non-zero on failure
# plays the real game with synthetic input (walk, pick up, talk, hotkeys, save):
xvfb-run -a godot --path . --resolution 1600x900 -s tools/godot/run.gd -- res://tools/godot/play_test.gd
```

## Next up (proposed)

1. **Combat**: basic attack + the 12 skills reading their tree effects; life/mana; monsters with
   treasure classes; the Coin-Gobbler (loot goblin) already has a TC.
2. **The Wilds**: first outdoor zone south of the gate (a new zone scene), then the Pit's first
   floors below the Sealed Stair (~1/4 of a D2 act for the first release).
3. Waypoints (Rhunestone Circles), sets, more uniques/rhunewords, skill icons and attack
   animations (PixelLab can add them to the existing characters), sound.
4. Secrets: the Goose's key, a bright-and-cheerful secret level, Omens (temporary Targeted Find).
