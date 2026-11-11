# Fonts

Both are SIL OFL 1.1 (licence texts alongside) and modified:

| File | Font | Used for | Change | Pixel grid |
| --- | --- | --- | --- | --- |
| `jersey10.woff2` | Jersey 10 (Soft Type) | all UI text, window titles, world labels | `unitsPerEm` 1400 → 1500 | 20 px/em: size 10 = ½ UI px per font pixel, size 20 = 1 |
| `jacquarda9.woff2` | Jacquarda Bastarda 9 (Soft Type) | the "Dungeon of Rhune" logo only | `unitsPerEm` 1040 → 960 | 12 px/em: size 36 = 3 UI px |

Only `head.unitsPerEm` changed (fontTools), so outlines scale uniformly and
each font pixel lands on whole device pixels at UI scale 2 (and 4, 6...).
`main.gd` sets `Viewport.oversampling_override` to the UI scale so glyphs are
rasterized at device resolution; imports use grayscale AA, which only shows
at 1.5x/3x where a perfect grid is impossible.

Sizes in use (`UiKit.STYLES`): body/captions 10, titles 20, logo 36.
The gothic face is kept to the logo on purpose: it's hard to read as text.
