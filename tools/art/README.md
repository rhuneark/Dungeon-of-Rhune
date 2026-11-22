# Art pipeline (PixelLab)

All game art is generated with the [PixelLab](https://pixellab.ai) API and packed into crisp,
game-ready sheets. Prompts live in one file, so changing the look of something is a text edit.

```
spec.py      every asset + its prompt (characters, tilesets, props, item icons, rhunes)
gen.py       calls the API for anything missing in out/ (idempotent; delete a file to regenerate it)
pack.py      out/ → assets/art/ sheets + assets/art/art_meta.json (frame grids, tile corners, sizes)
pixellab.py  tiny API client
ref/         composition guides that steer re-generation of buildings (see below)
out/         raw generations (kept so pack.py can be re-run without spending generations);
             out/candidates/ holds alternative takes from --variants
.cache/      PixelLab ids (characters/tilesets) — lets gen.py add new animations to EXISTING characters
```

```bash
export PIXELLAB_TOKEN=...        # not needed inside the Claude Code cloud session (proxy injects it)
python3 tools/art/gen.py         # everything missing (or: chars | tiles | props | icons | rhunes)
python3 tools/art/gen.py props --only tavern,chapel --variants 3   # takes → out/candidates/
python3 tools/art/pack.py        # rebuild assets/art + art_meta.json (Godot re-imports on focus)
```

**The look** is grim gothic high fantasy at dusk, and it holds together because every world
asset is forced onto one palette, `PALETTE` in spec.py (map objects get it as PixelLab's
`color_image`, tilesets as `target_palette`, the two reference-drawn NPCs via a palette-locked
first frame). Item icons are not palette-locked. To change an asset, prefer generating a few
takes (`--variants`) and copying the best from `out/candidates/<name>_<i>.png` to
`out/props/<name>.png`; the rejected takes stay in candidates/ in case you change your mind.

pack.py also:
- recolours per spec: `TILE_REMAP` (mud browns → grey-brown mud, bright grass tufts → dry moor)
  and `PROP_REMAP` (the tavern's pale windows → lamplight);
- removes tiny stray specks left by background removal (`despeckle`);
- adds mirrored copies of each plain ground tile as variants (`"v": 1` in art_meta) so big
  areas don't show a grid; build_thornwick.gd picks among them at random;
- finds each prop's light-emitting pixels (lamplight, fire, rune colours) and writes them to
  `assets/art/glow/<name>.png` plus light positions (`glow` in art_meta). The game draws those
  pixels unshaded over the dusk tint and puts a flickering light on each.

Conventions: world tiles 32px ("high top-down"), characters on 64px canvases ("low top-down",
8 directions), item icons 32px per inventory cell (a 2x3 armor is 64x96). Notes:

- Sync endpoints time out at ~30s through some proxies; everything here uses the async
  job endpoints (map objects, characters, tilesets) and reads results as base64.
- Tileset corner labels sometimes come back inverted relative to the prompts; `pack.py`
  detects that from the pixels (the grass side must be the greener one).
- Characters export as a ZIP through `api.pixellab.ai` (the image CDN host may be blocked).
- Buildings: plain prompts drift into isometric corner views. `ref/` holds the current
  front-facing art of each building in `PROP_REFS`; gen.py desaturates it and passes it as
  `init_image` (`REF_STRENGTH` 130, per-asset overrides), which keeps the front-facing
  composition while the prompt + palette set the look. Square towers still turn to a corner
  at any strength, so the lore tower is round (no guide). New buildings without a guide: make
  several takes and pick a front-facing one.
- Lit windows come out pale parchment; recolour them to lamplight with `PROP_REMAP` only where
  parchment means windows (the dark tavern), or prompt "glowing warm amber candlelit windows".
- Tilesets use PixelLab's "pro" mode (`raggedness`/`roundness` for soft borders). Sets share
  terrain via `*_base_from` (base tile id + reference image), which makes the shared grass
  identical. To re-roll a set but keep its grass, move its json to `out/tiles/prev/` first.
- The tiles-pro endpoint (tile variations) only returns image CDN links, and that host is not
  reachable from the cloud session; mirrored variants are made in pack.py instead.
- Map objects larger than ~40k px² come back on a flat colour; `gen.py` keys it out from the
  borders (`strip_flat_background`).
