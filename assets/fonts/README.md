# Fonts

All three are SIL OFL 1.1 (licence texts alongside). Two are modified:

| File | Font | Change | Pixel grid |
| --- | --- | --- | --- |
| `jersey10.woff2` | Jersey 10 (Soft Type) | `unitsPerEm` 1400 → 1500 | 20 px/em: size 10 = ½ UI px per font pixel, size 20 = 1 |
| `jacquarda9.woff2` | Jacquarda Bastarda 9 (Soft Type) | `unitsPerEm` 1040 → 960 | 12 px/em: size 18 = 1.5 UI px, size 36 = 3 |
| `silkscreen.woff2` | Silkscreen | unchanged | 8 px/em: size 8 = 1 UI px |

Only `head.unitsPerEm` changed (fontTools), so outlines scale uniformly and
each font pixel lands on whole device pixels at UI scale 2 (and 4, 6...).
`main.gd` sets `Viewport.oversampling_override` to the UI scale so glyphs are
rasterized at device resolution; imports use grayscale AA, which only shows
at 1.5x/3x where a perfect grid is impossible.

Use only these sizes: body 10/20, titles 18/36 (9 is soft), small 8.
