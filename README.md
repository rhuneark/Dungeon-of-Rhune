# Dungeon of Rhune

A pixel-art ARPG you can pick up for half an hour and come back to every day. **All dungeon.**
Thornwick sank into the Deep; its last people hold out in the Refuge, a plain undercroft hall,
and help however they can. From Maren's map table you chart **expeditions**: a branching map of
rooms, each sealed until its horde is dead, each granting something for the rest of the
expedition, ending at a Warden's vault. You design your own path of resistance and reward.
D2-style loot is the heart of it, and **your gear is your build**: no classes, no skill trees.

**Engine:** Godot 4.7 (GDScript, Compatibility renderer). **Platforms:** Steam (Windows,
Linux/Steam Deck; macOS optional) and the web, all from Godot export presets. All art is
generated with PixelLab (see `tools/art/`).

## Run it

1. Install [Godot 4.7](https://godotengine.org/download) (standard build, not .NET).
2. Open `project.godot` in the editor (first open imports the art; takes a few seconds).
3. Press **F5**. Editor runs are debug builds, so the Loot Lab (`` ` ``) is on.

To change rooms or the Refuge, see *Editing rooms and the Refuge* below.

### Keeping your PC copy up to date

New work is pushed to the `claude/trusting-cray-6gvlg9` branch on GitHub. **Double-click
`update.bat`** (Windows; `./update.sh` on macOS/Linux) to pull the latest into your folder, then
switch back to Godot, which reloads changed files. Local edits are kept: they're stashed for the update and re-applied. To send your own edits back,
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
| M | the expedition map |
| T | portal back to the Refuge (from a room) |
| WASD / arrows / left stick | walk directly |
| I (B) · C · L · O | Inventory · Character · Codex · Options |
| Right-click item | equip (rings fill all four fingers); slot a charm into your belt; sell when a shop is open; move to/from stash or crucible |
| Esc / Space | close panels (Esc with nothing open → menu) |
| `` ` `` (backtick) | **Loot Lab** dev tool: roll any treasure class, simulate 5,000 drops, cheats (debug builds, `--dev-tools`, `RHUNE_DEVTOOLS=1`, `?dev` on the web) |
| F11 / Alt+Enter | fullscreen |

All keys are input actions (Project Settings → Input Map), so rebinding is a settings change.

## The game

**Expeditions (the dungeon).** Talk to Captain Maren at the map table (or use the Deep Gate)
and chart a tier. The map is six steps of 2-3 rooms and the **Warden's vault** at the end; you
see every room's type and price before you pick. Each room is one sealed arena about the size of
an Infernal Hordes room: waves pour out of four summoning circles, then a chest rises, the door
opens onto the map, and a portal home appears. Room types each look different (wall sigils,
props, light) and grant a **boon** for the rest of the expedition:

| Room | Boon | Its chest |
|---|---|---|
| Rhune Sanctum | +75% Rhune Find | heavy with rhunes |
| Statue Hall | +50% Armor Find, +10% Armor | favours armor |
| Armory | +50% Weapon Find | favours weapons |
| Reliquary | +60% Jewelry Find | favours rings/amulets |
| Curio Den | +70% Charm Find | favours charms |
| Treasury | +60% Extra Gold | |
| Ossuary | +15% Experience | |
| Drowned Chapel | +10% Life | |
| War Room | +12% Damage | |
| Fortune Vault | +40% Rarity Find (always greedy, two afflictions) | leans unique |
| Sanctuary | no monsters: heals, lifts your newest affliction | none |

**Greed.** About 40% of rooms are **greedy**: double the boon, but they bring an **affliction**
that stays for the rest of the expedition (Hardened, Savage, Swarming, Rallied, Embers,
Frostbite, Withering, Exposed, Hasted, Relentless). Afflictions stack and every one raises
**Threat**; each point of Threat gives +6% Rarity Find, +4% Item Quantity and +3% XP, and every
4 Threat adds a roll to each chest. Combinations matter: three different Find boons make
*Prospector* (+25% Quantity), Coin + Fortune make *Midas Touch*, Whetstone + Blessing make *War
Chant*; but Embers + Exposed become *Wildfire*, Swarming + Relentless *The Horde*, three Hardened
*Ironclad*. Greedy paths pay; stacked afflictions kill. Easy paths are safe and poor.

**Tiers.** Beating a Warden opens the next tier (monster level = 4 per tier + the room's step),
so there's no floor 100: just harder maps. Die and the expedition is gone (boons, afflictions,
everything it granted); you keep the items you carry. Leave through a portal and it waits for
you on the map. An expedition is about 4-6 minutes.

**Balance.** Checked with a bot that plays like a careful player (wears what drops, shops,
spends points, takes greed while Threat is low): it finishes Tiers 1-4 in 20-25 minutes at
level 21-25, sometimes dying to its first Warden after a greedy path. Archers and casters hold
their ground and shoot (they don't kite).

**Modes.** Every hero is made in a realm, **Season 1** or **Eternal**, and a mode, **Trade** or
**SSF** (solo self-found). Each realm + mode pair has its own stash, so a season starts from
nothing and SSF loot stays SSF. When a season ends its heroes and stash move to Eternal (items
that don't fit wait to be reclaimed). The title screen keeps a roster of up to 12 heroes.
In-game trading between Trade heroes is planned; SSF heroes will never see it.

**Combat is your weapon.** Swords, axes and maces swing in an arc and hit everything in it; bows
shoot arrows; wands and staves cast bolts with a little splash. The weapon also decides which
attribute adds physical damage: Strength (melee), Dexterity (bows), Intelligence (casters).
Monster hits go through your block, armor, resistances and damage reduction; life leech, life
on kill and thorns all work.

**Levels are attribute points.** 5 per level: Strength, Dexterity, Stamina (life),
Intelligence (elemental damage). Everything else is gear.

**The flask.** No potions to carry: one rejuvenation flask on a cooldown (Q). Small heals 250;
Mother Ysolde brews a Medium (500) once you finish a Tier 4 expedition and a Large (1000) after Tier 11. Flask
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

**The Refuge (the hub).** Plain stone, a fire, the strongbox, and each of the townsfolk in
their corner: Old Varn (identify everything, free; the Codex), Mother Ysolde (the flask),
Brannoc (crucible, sockets), Pell (trade), "Lucky" Odo (sealed goods = gambling), Captain Maren
(the map table). The Refuge patches you up whenever you're home.

**The Codex**: Holy Grail tracking for every unique (with best roll %), rhune and rhuneword.

**Crisp pixels.** No window stretching: the world camera zooms by a whole number (~480 world px
visible vertically) and the UI layer scales by a whole number (UI canvas ≥ 690×430), so every
art pixel is a block of device pixels. Exception: 645–860 px tall windows (e.g. a 1366×768
laptop) get a 1.5× UI so text stays readable. Text is rasterized at device resolution, and the
pixel fonts are re-gridded so their pixels land on whole device pixels (`assets/fonts/README.md`).
Options (O) lets players pick UI scale and world zoom. World: 32px tiles, 64px characters; UI:
32px per inventory cell. Text uses one plain pixel face (Jersey 10) in bright colours; the gothic
face is only the logo.

**Look.** Top-down oblique, like Chronicon or a 2D Diablo: floors seen from straight above,
everything standing (walls, buildings, chests, pillars, people) seen from the front with a sliver
of its top, never at an isometric corner angle. Rooms are axis-aligned halls whose north walls
show a brick face, near-black stone lit by wall torches, braziers, summoning circles and each
room type's own colour (Diablo II-dark). All world art shares one 47-colour palette (`PALETTE` in `tools/art/spec.py`).
`scripts/world/atmosphere.gd` tints each zone and lights it: torches, braziers and runes get
real flickering lights, found automatically from their colours. The UI and loot labels are never tinted.

## Editing rooms and the Refuge

Nothing is a hand-made scene any more: `scripts/world/arena_builder.gd` builds the Refuge and
every expedition room at runtime (an axis-aligned shape, oblique walls from
`assets/art/tiles/dungeon_walls.png` drawn by `tools/art/dungeon_walls.py`, then the dressing:
torches and the room type's wall art, its props, a floor sigil in its colour, spawn circles, the
door). A room type is data in `scripts/content/expeditions.gd` (`ROOMS`: boon, wall art, props,
colour, chest lean); boons, afflictions, synergies and dreads live there too, and
`scripts/systems/expedition.gd` has the rules (map generation, stacking, Threat).
`scripts/world/arena.gd` runs a room (waves, monsters, hits, the chest). Monster stats and level
scaling are data in `scripts/content/monsters.gd`. Lights come from the art itself: a prop whose
art has lamplight, fire or rune colours glows on its own (tune per art in `LIGHT_TUNING`,
`scripts/world/atmosphere.gd`). `tools/godot/room_shots.gd <out_dir>` photographs the Refuge,
every room type and the map.

## Where things live

```
project.godot           settings, autoloads, input map, [rhune] Steam settings
scenes/main.tscn        entry scene → scripts/main.gd (boot, loading screen, phase router,
                        the Refuge or an expedition room, lifecycle)
scripts/autoload/       View (pixel-perfect scaling) · Platform (Steam, fullscreen, quit, dev tools)
                        Art (sprite sheets/atlases) · Game (save session, UI state, the flask,
                        expeditions and travel, roster, per-mode stash, world bridge)
scripts/content/        pure data, where the design lives
  stats.gd item_bases.gd affixes.gd uniques.gd rhunes.gd rare_names.gd treasure_classes.gd
  monsters.gd npcs.gd achievements.gd expeditions.gd (rooms, boons, afflictions, synergies)
  seasons.gd (realms, modes, season migration)
scripts/systems/        rules over the data (no rendering)
  item_gen.gd loot.gd   item creation (belts roll charm slots), treasure classes, quality rolls
  item_text.gd          derived item view: names, colours, final damage/defense, prices
  character_sheet.gd    stat sheet (gear + belt charms), the weapon's attack, the flask
  actions.gd            item flow: pickup, cursor, equip (4 rings), charms, socketing, identify, sell
  economy.gd            vendor, gambling, sockets, crucible recipes
  expedition.gd         the map, walking it, what boons/afflictions add up to, tiers
  progression.gd hero_data.gd grid.gd save_io.gd (v2 saves upgrade in place) rng.gd
scripts/world/          zone.gd + editor node types (prop, npc_spot, blocker),
                        zone_runtime.gd (player, NPCs, input, camera, the hero's attacks),
                        arena.gd + arena_builder.gd (rooms + the Refuge), zone_nav.gd (A*, flow field),
                        ground_items.gd (loot labels/beams), fx.gd, interact.gd (what clicking does),
                        atmosphere.gd (tint, prop lights, mist, embers, vignette)
scripts/ui/             UI built in code: ui_kit.gd (palette, fonts, frames), ui_panel.gd (base
                        window), hud.gd (life, flask, boss bar), playing_ui.gd (panel slots +
                        hotkeys), main_menu.gd, grid_view.gd, item_icon.gd, ui_tip.gd +
                        item_tooltip.gd, panels/ (inventory with the belt strip, character,
                        map_panel.gd (the expedition map), ...)
assets/                 art (packed sprites + glow masks + art_meta.json), fonts, icon
tests/test_systems.tscn rules tests (items, loot, rings, charms, flask, tiers, rooms, expeditions,
                        modes, saves)
tools/art/              PixelLab pipeline (spec, gen, pack), dungeon_walls.py, guides.py
tools/godot/            test drivers (play_test, dungeon_test, campaign_test, shots, room_shots)
```

## Tests

```bash
godot --headless --path . --import                      # once, after cloning
godot --headless --path . res://tests/test_systems.tscn # rules: prints PASS/FAIL, exits non-zero on failure
# plays the real game with synthetic input (walk, pick up, talk, flask, chart, map click, hit, T, save):
xvfb-run -a godot --path . --resolution 1600x900 -s tools/godot/run.gd -- res://tools/godot/play_test.gd
# a bot charts an expedition and clears two rooms picked off the map (add `<out_dir> <tier>`):
xvfb-run -a godot --path . --resolution 1600x900 -s tools/godot/run.gd -- res://tools/godot/dungeon_test.gd
# balance: a bot plays expeditions through Tier 4 with real gear management, faster than real time:
godot --headless --path . --fixed-fps 60 --audio-driver Dummy -s tools/godot/run.gd -- res://tools/godot/campaign_test.gd 4
```

## Next up (proposed)

1. **Trading** between Trade heroes (needs a backend: Steam Inventory or our own service), and
   ladders per season. SSF heroes stay out of it.
2. **More expedition content**: more room types, afflictions and synergies; named map events
   (a Coin-Gobbler room, elite packs); Warden variants per tier band.
3. **Gear-granted powers**: procs and "grants a skill" affixes/uniques (on-hit novas, chain
   lightning, frost armor), so builds come from what you wear.
4. Cosmetic dressing for the Refuge; sound and music.
