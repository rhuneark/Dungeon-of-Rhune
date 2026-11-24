#!/usr/bin/env python3
"""Draws the Sealed Stair's wall tiles: assets/art/tiles/dungeon_walls.png.

Top-down oblique, like a 16-bit ARPG (Chronicon, Zelda): the floor is seen from
straight above, walls are blocks seen from above and a little from the south.
North walls show a two-tile brick face under a dark cap; side and south walls
show only their cap, with a lit rim where it drops to the room. Walls cast a
soft shadow onto the floor. Every pixel is a spec.PALETTE colour; the floor is
the generated flagstone from dungeon.png.

Bricks that cross a tile edge get the same shade in every variant, so any
variants side by side join without seams.

Atlas, 8 tiles per row, 32px (scripts/world/arena_builder.gd reads it):
  0-7    floor: 4 flagstone variants, then the same 4 mirrored
  8-39   cap: 8 + mask*2 + variant; mask bits 1 N, 2 E, 4 S, 8 W = lit rim on that side
  40-55  face: 40 + part*8 + ends*2 + variant; part 0 upper, 1 lower; ends 1 left, 2 right
  56-71  floor shade overlay: 56 + mask; mask bits 1 N, 2 E, 4 S, 8 W = wall on that side

Run: python3 tools/art/dungeon_walls.py
"""
import json
import os
import random

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
TILES = os.path.join(ROOT, "assets", "art", "tiles")
T = 32

# Cold stone ramp from spec.PALETTE, dark -> light.
R = ["#0d0c10", "#17161c", "#22212a", "#2e2e38", "#3c3d48", "#4c4f5a", "#5f636d", "#767b83", "#92969b", "#b1b3b2"]
MOSS = ["#212c22", "#2c3a2b", "#384833"]


def rgb(hx, a=255):
    return tuple(int(hx[i:i + 2], 16) for i in (1, 3, 5)) + (a,)


def shade(i, d):
    return R[max(0, min(len(R) - 1, i + d))]


# ------------------------------------------------------------------ bricks
def brick_strip(width_tiles, height, course_h, brick_w, tones, seed, mortar=1, wear=0.05, moss=0.0, rows_from=0):
    """A strip of running-bond bricks `width_tiles` tiles wide, as a list of
    per-tile 32 x height images (one per variant column). Bricks crossing a
    tile edge use a per-course fixed shade so variants join seamlessly."""
    rng = random.Random(seed)
    out = []
    fixed = {}
    for v in range(width_tiles):
        im = Image.new("RGBA", (T, height), (0, 0, 0, 0))
        px = im.load()
        courses = (height + course_h - 1) // course_h
        for c in range(courses):
            y0 = c * course_h
            off = 0 if (c + rows_from) % 2 == 0 else brick_w // 2
            x = -off
            while x < T:
                bx0, bx1 = x, x + brick_w
                crossing = bx0 < 0 or bx1 > T
                if crossing:
                    key = (c, bx0 % T)
                    if key not in fixed:
                        fixed[key] = rng.choice(tones)
                    base = fixed[key]
                    local = random.Random(hash(key) & 0xFFFF)
                else:
                    base = rng.choice(tones)
                    local = rng
                for yy in range(y0, min(height, y0 + course_h)):
                    for xx in range(max(0, bx0), min(T, bx1)):
                        if yy == y0 and mortar:
                            col = R[1]
                        elif xx == bx0 and mortar:
                            col = R[1]
                        elif yy == y0 + mortar:
                            col = shade(base, 1)
                        elif yy == y0 + course_h - 1 or xx == bx1 - 1:
                            col = shade(base, -1)
                        else:
                            col = R[base]
                            if not crossing and local.random() < wear:
                                col = shade(base, local.choice((-1, 1)))
                        if moss and not crossing and yy >= y0 + course_h - 2 and local.random() < moss:
                            col = local.choice(MOSS)
                        px[xx, yy] = rgb(col)
                # A rare crack across a brick.
                if not crossing and rng.random() < 0.08 and course_h >= 6:
                    cx, cy = rng.randint(bx0 + 3, bx1 - 4), y0 + 2
                    for k in range(course_h - 3):
                        if 0 <= cx < T and cy + k < height:
                            px[cx, cy + k] = rgb(R[1])
                        cx += rng.choice((-1, 0, 1))
                x += brick_w
        out.append(im)
    return out


def face_tiles():
    """Upper and lower halves of a 64px brick face, 2 variants, 4 end masks."""
    tiles = {}
    for v in range(2):
        bricks = brick_strip(1, 56, 8, 16, [3, 4, 4, 5], seed=100 + v, wear=0.06, moss=0.04)[0]
        face = Image.new("RGBA", (T, 64), (0, 0, 0, 0))
        fp = face.load()
        # Stone trim along the top (the lip under the cap).
        trim = [R[6], R[5], R[5], R[2]]
        for y, col in enumerate(trim):
            for x in range(T):
                fp[x, y] = rgb(col)
        for x in (0, 16):
            for y in (1, 2):
                fp[x, y] = rgb(R[3])
        face.alpha_composite(bricks, (0, 4))
        # Plinth and contact shadow along the bottom.
        for y, col in zip(range(60, 64), [R[4], R[3], R[2], R[1]]):
            for x in range(T):
                fp[x, y] = rgb(col)
        for ends in range(4):
            f = face.copy()
            p = f.load()
            for y in range(64):
                if ends & 1:
                    p[0, y] = rgb(R[1])
                    p[1, y] = _darker(p[1, y], 2)
                    p[2, y] = _darker(p[2, y], 1)
                if ends & 2:
                    p[T - 1, y] = rgb(R[1])
                    p[T - 2, y] = _darker(p[T - 2, y], 2)
                    p[T - 3, y] = _darker(p[T - 3, y], 1)
            tiles[(0, ends, v)] = f.crop((0, 0, T, T))
            tiles[(1, ends, v)] = f.crop((0, T, T, 64))
    return tiles


def _darker(c, steps):
    hx = "#%02x%02x%02x" % c[:3]
    if hx in R:
        return rgb(shade(R.index(hx), -steps))
    return c


def cap_tiles():
    """The wall's top: dark low-contrast slabs; a lit rim on the sides that drop to the room."""
    tiles = {}
    for v in range(2):
        slabs = brick_strip(1, T, 16, 16, [3, 3, 4], seed=300 + v, wear=0.05)[0]
        for mask in range(16):
            im = slabs.copy()
            px = im.load()
            for i in range(T):
                for side, (x, y, x2, y2) in ((1, (i, 0, i, 1)), (2, (T - 1, i, T - 2, i)), (4, (i, T - 1, i, T - 2)), (8, (0, i, 1, i))):
                    if mask & side:
                        px[x, y] = rgb(R[7])
                        px[x2, y2] = rgb(R[5])
            tiles[(mask, v)] = im
    return tiles


def shade_tiles():
    """Soft shadow the walls throw onto the floor (black, alpha)."""
    north = [0.62, 0.5, 0.4, 0.31, 0.23, 0.16, 0.1, 0.05]
    side = [0.45, 0.32, 0.2, 0.1, 0.04]
    south = [0.3, 0.12]
    tiles = {}
    for mask in range(16):
        im = Image.new("RGBA", (T, T), (0, 0, 0, 0))
        px = im.load()
        for y in range(T):
            for x in range(T):
                a = 0.0
                if mask & 1 and y < len(north):
                    a = max(a, north[y])
                if mask & 4 and T - 1 - y < len(south):
                    a = max(a, south[T - 1 - y])
                if mask & 2 and T - 1 - x < len(side):
                    a = max(a, side[T - 1 - x])
                if mask & 8 and x < len(side):
                    a = max(a, side[x])
                if a > 0:
                    px[x, y] = (13, 12, 16, int(round(a * 255)))
        tiles[mask] = im
    return tiles


def floor_tiles():
    """The generated flagstones (dungeon.png tiles whose corners are all floor)."""
    meta = json.load(open(os.path.join(ROOT, "assets", "art", "art_meta.json")))
    src = Image.open(os.path.join(TILES, "dungeon.png")).convert("RGBA")
    cols = src.width // T
    out = []
    for e in meta["tiles"]["dungeon"]["tiles"]:
        if e["key"] == "0000":
            i = int(e["i"])
            out.append(src.crop(((i % cols) * T, (i // cols) * T, (i % cols + 1) * T, (i // cols + 1) * T)))
    out = (out * 4)[:4]
    return out + [t.transpose(Image.FLIP_LEFT_RIGHT) for t in out]


def main():
    atlas = Image.new("RGBA", (8 * T, 9 * T), (0, 0, 0, 0))

    def put(i, im):
        atlas.alpha_composite(im, ((i % 8) * T, (i // 8) * T))

    for i, t in enumerate(floor_tiles()):
        put(i, t)
    caps = cap_tiles()
    for (mask, v), t in caps.items():
        put(8 + mask * 2 + v, t)
    for (part, ends, v), t in face_tiles().items():
        put(40 + part * 8 + ends * 2 + v, t)
    for mask, t in shade_tiles().items():
        put(56 + mask, t)
    path = os.path.join(TILES, "dungeon_walls.png")
    atlas.save(path)
    print("wrote", os.path.relpath(path, ROOT), atlas.size)


if __name__ == "__main__":
    main()
