# Dungeon of Rhune

A pixel-art ARPG homage: Diablo II's loot, Grim Dawn's dual masteries, Last Epoch's per-skill
trees, and Diablo's weird little things — with its own twists. No story mode; the world
explains itself through small lore quests. This build is the **foundation + the main town,
Thornwick**. Combat, the Wilds and the Pit come next.

Built on Pixi.js v8 + React 19 + Tailwind v4 + Vite + TypeScript + the RundotGameAPI SDK.
All art is generated with PixelLab (see `tools/art/`).

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # type-checks, then builds dist/
```

## Controls

| | |
|---|---|
| Click / hold | walk (A* pathing); click people, objects and loot labels to use them |
| WASD / arrows | walk directly |
| I · C · K · Q · L | Inventory · Character · Skills · Quests · Codex |
| Right-click item | use / equip; sell when a shop is open; move to/from stash or crucible |
| Esc / Space | close panels (Esc with nothing open → menu) |
| ~ (backtick) | **Loot Lab** dev tool: roll any treasure class, simulate 5,000 drops, cheats |

## What's in the foundation

**Loot (the heart).** D2-style item model: base types with item levels, tiered prefixes/suffixes
gated by affix level, quality ladder (crude → normal → superior → magic → rare → unique), magic
items drop **unidentified** (Old Varn reads them for free — or use a Scroll of Insight), rares get
two-word names, uniques roll **variable stats** (perfect rolls are tracked). Treasure classes with
picks and "no drop" weights. Grid ("tetris") inventory, paperdoll, shared stash, D2 cursor
pickup/place/swap. Ground loot pops out in arcs with coloured labels; uniques get a light beam.

**Fortune — "magic find of certain things".** Three classic stats plus **Targeted Find**:

- *Rarity Find* — better quality on everything (D2 diminishing returns on rare/unique)
- *Item Quantity* — fewer empty drops · *Extra Gold*
- *Weapon / Armor / Jewelry / Curio / Rhune Find* — more of THAT kind of drop
- *Unique Find* — boosts only the unique roll

Gear can roll these ("Scribe's" = Rhune Find, "Grailseeker's" = Unique Find, ...), so players can
build a hunting kit for exactly what they're chasing. Tune it all in the Loot Lab.

**Rhunes & Rhunewords** (the namesake). 12 rhunes with weapon/armor/shield effects; socket the
right ones *in order* into a plain item with exactly that many sockets to speak one of 9
Rhunewords. Brannoc's **Crucible** fuses 3 identical rhunes into the next, reforges magic items,
and can strip sockets; he also punches sockets into plain gear.

**Curios** — charms that work from the backpack (small/medium/grand). Every cell they use is a
cell you can't fill with loot.

**Disciplines (Grim Dawn) + skill trees (Last Epoch).** No classes. Pick any two of four
Disciplines (Bulwark, Emberwright, Galeborn, Hollowcaller); every pair has a title (Forgeguard,
Ashbinder, Nightwind...). Path Points (1/level + lore quests) raise Discipline rank: passive stats
per rank, skills unlock at rank thresholds. Specialize up to 5 skills; each has its own node tree,
and specialized skills level up with your XP (one tree point per level, plus +skill gear). Nodes
include cross-discipline conversions (a Bulwark slam that turns to fire, thralls that use forge
fire) — if it makes sense, it works. Tree effects are data the combat layer will read.

**Thornwick.** Six NPCs with services — Old Varn (identify, Codex), Brannoc (crucible, sockets),
Pell (trader), Mother Ysolde (potions/scrolls), "Lucky" Odo (sealed goods = gambling), Captain
Maren (the gate) — plus the Wishing Well (gold → loot), your Strongbox, the Sealed Stair, a
Rhunestone Circle (future waypoint), a graveyard, a pond and **the Goose**. Eight lore quests are
completable in town and pay out Path Points, XP, items and lore entries.

**The Codex** — Holy Grail tracking: every unique (with best roll %), rhune and rhuneword you've
found, plus unlocked lore.

**Crisp pixels.** World and UI each scale by an integer number of *device* pixels (computed from
the real DPR), the camera snaps to the device grid, and the UI renders into a fixed "UI canvas"
with native-size pixel fonts (Jersey 10, Jacquarda Bastarda 9, Silkscreen). World: 32px tiles,
64px characters; UI: 32px per inventory cell.

## Where things live

```
src/content/            pure data — the design lives here
  stats.ts              stat registry (tags, damage types, Targeted Find kinds, tooltip text)
  items/                bases, affixes, uniques (+quirks), rhunes & rhunewords, rare names
  loot/                 treasure classes + quality tuning
  skills/               Disciplines, skills, per-skill trees, combo titles
  lore/                 lore entries + lore quests
  npcs.ts
src/systems/            rules over the data (pure TS, no rendering)
  itemGen.ts loot.ts    item creation, treasure-class resolution, quality rolls
  itemText.ts           derived item view: names, colours, final damage/defense, prices
  character.ts          stat sheet (gear, curios, disciplines, passives, tree nodes)
  actions.ts            item flow: pickup, cursor, equip, socketing, identify, sell
  economy.ts            vendors, gambling, wishing well, sockets, crucible recipes
  skills.ts quests.ts progression.ts hero.ts inventory.ts save.ts rng.ts
src/game/               Pixi world
  engine/               nav (A*), tilemap (Wang autotiling), art slicing, ground loot, fx
  world/thornwick.ts    the town map (terrain painting, props, NPCs, placed items)
  scenes/townScene.ts   input, player, NPCs, goose, camera, interactions
  interact.ts           what clicking things does (dialogs, panels, quest events)
src/ui/                 React UI (panels, HUD, tooltips) inside the integer-scaled UI root
src/view/viewport.ts    pixel-perfect frame/zoom/UI-scale math
tools/art/              PixelLab pipeline (prompts → generation → packing)
```

## Next up (proposed)

1. **Combat** — basic attack + the 12 skills reading their tree effects; life/mana; monsters with
   treasure classes; the Coin-Gobbler (loot goblin) already has a TC.
2. **The Wilds** — first outdoor zone south of the gate, then the Pit's first floors below the
   Sealed Stair (~1/4 of a D2 act for the first release).
3. Waypoints (Rhunestone Circles), sets, more uniques/rhunewords, skill/ability icons and attack
   animations (PixelLab can add them to the existing characters), sound.
4. Secrets: the Goose's key, a bright-and-cheerful secret level, Omens (temporary Targeted Find).

## RUN.game

- Before deploying, run `rundot init` (this is a **landscape** game; `game.config.prod.json` still
  says portrait — re-init with `--orientation Landscape`).
- `public/thumbnail.jpg` is a real 512×512 town shot.
