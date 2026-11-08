# Art pipeline (PixelLab)

All game art is generated with the [PixelLab](https://pixellab.ai) API and packed into crisp,
game-ready sheets. Prompts live in one file, so changing the look of something is a text edit.

```
spec.py      every asset + its prompt (characters, tilesets, props, item icons, rhunes)
gen.py       calls the API for anything missing in out/ (idempotent; delete a file to regenerate it)
pack.py      out/ → public/art/ sheets + src/assets/art.generated.ts (frame grids, tile corners, sizes)
pixellab.py  tiny API client
out/         raw generations (kept so pack.py can be re-run without spending generations)
.cache/      PixelLab ids (characters/tilesets) — lets gen.py add new animations to EXISTING characters
```

```bash
export PIXELLAB_TOKEN=...        # not needed inside the Claude Code cloud session (proxy injects it)
python3 tools/art/gen.py         # everything missing (or: chars | tiles | props | icons | rhunes)
python3 tools/art/pack.py        # rebuild public/art + the generated manifest
```

Conventions: world tiles 32px ("high top-down"), characters on 64px canvases ("low top-down",
8 directions), item icons 32px per inventory cell (a 2x3 armor is 64x96). Notes:

- Sync endpoints time out at ~30s through some proxies; everything here uses the async
  job endpoints (map objects, characters, tilesets) and reads results as base64.
- Tileset corner labels sometimes come back inverted relative to the prompts; `pack.py`
  detects that from the pixels (the grass side must be the greener one).
- Characters export as a ZIP through `api.pixellab.ai` (the image CDN host may be blocked).
