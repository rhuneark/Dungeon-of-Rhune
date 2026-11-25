#!/usr/bin/env python3
"""Draws composition guides (tools/art/ref/<name>.png) for small props that
must face the camera the way a 16-bit top-down ARPG draws them: front face
toward the viewer, a sliver of top above it, never an isometric corner view.
gen.py passes a guide as PixelLab's init_image; the prompt and palette set
the look. Light grey = top faces, mid = fronts, dark = outlines and shadow.

Run: python3 tools/art/guides.py   (then gen.py props --only <name> --variants 3)
"""
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, "ref")
BG = (130, 130, 133, 255)
TOP = (205, 205, 200, 255)
FRONT = (150, 140, 128, 255)
WOOD = (120, 92, 66, 255)
DARK = (40, 38, 44, 255)
IRON = (70, 72, 80, 255)
GOLD = (230, 190, 70, 255)
CLOTH = (96, 70, 110, 255)
SACK = (176, 168, 150, 255)


def canvas(w, h):
    im = Image.new("RGBA", (w, h), BG)
    return im, ImageDraw.Draw(im)


def box(d, x0, y0, x1, y1, fill, top=None, top_h=0):
    """A block seen from the front: optional lighter top band, dark outline."""
    if top and top_h:
        d.rectangle((x0, y0, x1, y0 + top_h), fill=top, outline=DARK)
        d.rectangle((x0, y0 + top_h, x1, y1), fill=fill, outline=DARK)
    else:
        d.rectangle((x0, y0, x1, y1), fill=fill, outline=DARK)


def pillar():
    im, d = canvas(48, 96)
    box(d, 8, 4, 39, 14, FRONT, TOP, 4)        # capital
    box(d, 13, 14, 34, 82, FRONT)              # shaft
    for y in (30, 50, 66):
        d.line((15, y, 32, y), fill=DARK)
    d.line((23, 20, 23, 76), fill=(120, 112, 104, 255))
    box(d, 8, 82, 39, 93, FRONT, TOP, 3)       # plinth
    return im


def chest(open_=False, flat=False):
    im, d = canvas(48, 48)
    box(d, 6, 26, 41, 44, WOOD)                # body
    for x in (12, 35):
        d.rectangle((x - 1, 26, x + 1, 44), fill=IRON)
    if open_:
        box(d, 6, 6, 41, 20, (70, 50, 40, 255))  # lid standing open (inside)
        d.rectangle((9, 20, 38, 27), fill=GOLD, outline=DARK)
        for x in range(10, 38, 5):
            d.ellipse((x, 18, x + 4, 22), fill=GOLD, outline=DARK)
    elif flat:
        box(d, 5, 16, 42, 27, WOOD, TOP, 4)      # flat lid with a sliver of top
        d.rectangle((21, 22, 26, 32), fill=IRON, outline=DARK)
    else:
        d.pieslice((6, 10, 41, 42), 180, 360, fill=WOOD, outline=DARK)  # arched lid
        d.line((6, 26, 41, 26), fill=DARK)
        for x in (12, 35):
            d.line((x, 14, x, 26), fill=IRON, width=3)
        d.rectangle((21, 22, 26, 31), fill=GOLD, outline=DARK)
    return im


def crates():
    im, d = canvas(48, 48)
    box(d, 4, 22, 33, 45, WOOD, (160, 128, 92, 255), 5)
    box(d, 24, 10, 44, 45, WOOD, (160, 128, 92, 255), 4)
    for (x0, y0, x1, y1) in ((4, 27, 33, 45), (24, 14, 44, 45)):
        d.line((x0, y0, x1, y1), fill=DARK)
        d.line((x0, y1, x1, y0), fill=DARK)
    return im


def hay():
    im, d = canvas(48, 40)
    box(d, 5, 10, 42, 36, (176, 150, 96, 255), (206, 184, 128, 255), 7)
    for y in (20, 28):
        d.line((5, y, 42, y), fill=(130, 108, 70, 255))
    for x in (16, 31):
        d.line((x, 10, x, 36), fill=(110, 84, 50, 255))
    return im


def cart():
    im, d = canvas(80, 64)
    d.rectangle((6, 26, 62, 40), fill=WOOD, outline=DARK)          # bed, side view
    for x in range(10, 60, 9):
        d.line((x, 26, x, 40), fill=DARK)
    for x0 in (10, 26, 40):
        d.ellipse((x0, 14, x0 + 16, 30), fill=SACK, outline=DARK)  # sacks
    d.line((62, 34, 78, 40), fill=WOOD, width=3)                    # handles
    d.ellipse((22, 32, 46, 56), fill=WOOD, outline=DARK)            # wheel
    d.ellipse((31, 41, 37, 47), fill=IRON)
    for a, b in (((34, 33), (34, 55)), ((23, 44), (45, 44))):
        d.line((*a, *b), fill=DARK)
    return im


def wagon():
    im, d = canvas(128, 96)
    d.rectangle((10, 52, 112, 70), fill=WOOD, outline=DARK)        # bed, side view
    d.chord((14, 10, 108, 96), 180, 360, fill=CLOTH, outline=DARK)  # canvas hood
    for x in (36, 61, 86):
        d.line((x, 14, x, 52), fill=(70, 50, 80, 255), width=2)
    d.rectangle((96, 38, 102, 46), fill=GOLD, outline=DARK)         # lantern
    for cx in (34, 90):
        d.ellipse((cx - 14, 60, cx + 14, 88), fill=WOOD, outline=DARK)
        d.ellipse((cx - 3, 71, cx + 3, 77), fill=IRON)
    d.line((112, 64, 126, 70), fill=WOOD, width=3)
    return im


def statue():
    im, d = canvas(64, 112)
    box(d, 8, 82, 55, 108, FRONT, TOP, 6)       # square plinth, front-on
    d.line((8, 98, 55, 98), fill=DARK)
    d.rectangle((23, 26, 40, 82), fill=(176, 176, 176, 255), outline=DARK)  # figure
    d.ellipse((24, 12, 39, 28), fill=(176, 176, 176, 255), outline=DARK)
    d.rectangle((42, 10, 46, 48), fill=(120, 110, 100, 255), outline=DARK)  # raised lantern
    d.rectangle((41, 3, 47, 11), fill=GOLD, outline=DARK)
    return im


def table(w, h, legs=True, cloth=None):
    im, d = canvas(w, h)
    box(d, 4, h // 3, w - 5, h // 3 + 10, WOOD, (186, 160, 120, 255), 4)   # top + front edge
    if cloth:
        d.rectangle((10, h // 3, w - 11, h // 3 + 4), fill=cloth)
    if legs:
        for x in (7, w - 11):
            d.rectangle((x, h // 3 + 10, x + 3, h - 4), fill=WOOD, outline=DARK)
    return im


def slab(w, h, top_h, fill=FRONT):
    im, d = canvas(w, h)
    box(d, 6, h - top_h - 18, w - 7, h - 4, fill, TOP, 5)
    return im, d


def weapon_rack():
    im, d = canvas(48, 48)
    d.rectangle((6, 14, 41, 18), fill=WOOD, outline=DARK)
    d.rectangle((6, 38, 41, 44), fill=WOOD, outline=DARK)
    for x in (10, 18, 26, 34):
        d.rectangle((x, 4, x + 2, 40), fill=IRON, outline=DARK)
    return im


def gold_pile():
    im, d = canvas(48, 32)
    d.chord((4, 6, 43, 50), 180, 360, fill=GOLD, outline=DARK)
    return im


def altar():
    im, d = slab(64, 48, 14)
    for x in (14, 48):
        d.rectangle((x, 12, x + 3, 22), fill=(220, 210, 180, 255), outline=DARK)
    d.rectangle((26, 18, 39, 23), fill=(200, 190, 160, 255), outline=DARK)
    return im


def reliquary():
    im, d = canvas(48, 64)
    d.rectangle((8, 8, 39, 60), fill=WOOD, outline=DARK)
    d.polygon([(8, 8), (24, 1), (39, 8)], fill=WOOD, outline=DARK)
    d.rectangle((14, 16, 33, 44), fill=(150, 200, 220, 255), outline=DARK)
    return im


def rune_stone():
    im, d = canvas(48, 64)
    d.polygon([(14, 60), (12, 12), (24, 3), (36, 12), (34, 60)], fill=FRONT, outline=DARK)
    for y in (20, 32, 44):
        d.line((20, y, 28, y + 5), fill=(120, 200, 230, 255), width=2)
    return im


def holy_basin():
    im, d = canvas(48, 48)
    d.rectangle((18, 24, 29, 44), fill=FRONT, outline=DARK)
    d.rectangle((8, 14, 39, 24), fill=FRONT, outline=DARK)
    d.rectangle((11, 14, 36, 17), fill=(190, 220, 230, 255))
    return im


GUIDES = {
    "weapon_rack": weapon_rack,
    "gold_pile": gold_pile,
    "altar": altar,
    "reliquary": reliquary,
    "map_table": lambda: table(64, 48, cloth=(210, 196, 160, 255)),
    "rune_stone": rune_stone,
    "holy_basin": holy_basin,
    "statue": statue,
    "pillar": pillar,
    "dungeon_chest": lambda: chest(),
    "dungeon_chest_open": lambda: chest(open_=True),
    "strongbox": lambda: chest(flat=True),
    "crates": crates,
    "hay": hay,
    "cart": cart,
    "gambler_wagon": wagon,
}


def main():
    os.makedirs(REF, exist_ok=True)
    for name, fn in GUIDES.items():
        fn().save(os.path.join(REF, f"{name}.png"))
        print("guide", name)


if __name__ == "__main__":
    main()
