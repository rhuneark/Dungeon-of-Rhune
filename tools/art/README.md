# Art pipeline (PixelLab)

All game art is generated with the [PixelLab](https://pixellab.ai) API and packed into crisp,
game-ready sheets. Prompts live in one file, so changing the look of something is a text edit.

```
spec.py      every asset + its prompt (characters, tilesets, props, item icons, rhunes)
gen.py       calls the API for anything missing in out/ (idempotent; delete a file to regenerate it)
pack.py      out/ → assets/art/ sheets + assets/art/art_meta.json (frame grids, tile corners, sizes)
pixellab.py  tiny API client
out/         raw generations (kept so pack.py can be re-run without spending generations)
.cache/      PixelLab ids (characters/tilesets) — lets gen.py add new animations to EXISTING characters
```

```bash
export PIXELLAB_TOKEN=...        # not needed inside the Claude Code cloud session (proxy injects it)
python3 tools/art/gen.py         # everything missing (or: chars | tiles | props | icons | rhunes)
python3 tools/art/pack.py        # rebuild assets/art + art_meta.json (Godot re-imports on focus)
```

Conventions (2.5D isometric): ground is 2:1 diamonds, 64x32, as 16-tile corner sets from
`/create-tiles-pro` (`tile_type: isometric`, `tile_feature: tileset`, `outline_mode:
segmentation` so tiles have no edge lines); characters on 64px canvases ("low top-down",
8 directions); buildings and directional props are isometric map objects seen from the south
corner; item icons 32px per inventory cell (a 2x3 armor is 64x96). Notes:

- Sync endpoints time out at ~30s through some proxies; everything here uses the async
  job endpoints and reads results as base64 (tiles-pro's `tileset_grid_png`, map objects'
  `image`). The `backblaze.pixellab.ai` storage host is blocked here; don't rely on it.
- Corner sets: tile i of the 4x4 grid has mask i = NW<<3|NE<<2|SW<<1|SE, bit 1 = the first
  terrain in the description. On the isometric diamond, NW is the top corner, NE right, SW
  left, SE bottom. `pack.py` colour-matches every set's terrains to one canonical set (so
  grass is the same green everywhere) and bleeds each tile 1px to close the 1-pixel gaps where
  four diamonds meet. The match is per tile, so a terrain looks the same in transition tiles
  as in its solid tile; describe water as one even colour or the shoreline tiles bring darker
  "deep" patches that ring the pond.
- Characters export as a ZIP through `api.pixellab.ai` (the image CDN host may be blocked).
- Buildings (`ISO_BUILDINGS`): the style prompt asks for the door on the lower-left wall, but
  the model sometimes puts it on the right; list those in `MIRROR` and `pack.py` flips them.
  `pack.py` then measures each building's base corner and footprint from its silhouette (the
  bottom corner and its edges keep the isometric slope, found on the silhouette's lower convex
  hull) into art_meta.json. Where something in front of the walls misleads it (crates, a potted
  plant), hand-measured values go in `ISO_FIT`.
- Ground slabs: the model likes to put things on a raised lot or a grass island. Prompts help
  ("the walls stand directly on the ground, no lawn, no yard, no base") but don't always work,
  so either re-roll, or list the art in `SLABS`: `pack.py` reads each column up from the bottom
  (slab outline and side face, then the yard surface, then what stands on it) and either cuts
  the whole slab ("remove", capped at a yard depth) or just its edge so the top sits flush
  ("sink", e.g. the smithy's forge floor). Check the result over grass before relying on it.
- Map objects larger than ~40k px² come back on a flat colour; `gen.py` keys it out from the
  borders (`strip_flat_background`).
