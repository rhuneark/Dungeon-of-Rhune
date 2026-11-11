"""
Pack tools/art/out/ into game-ready files:

  assets/art/chars/<name>.png   one sheet per character (rotations + animations)
  assets/art/tiles/<set>.png    4x4 isometric corner-tile atlas per terrain pair (64x32 tiles)
  assets/art/props/*.png        map objects (copied)
  assets/art/icons/*.png        item icons (copied)
  assets/art/art_meta.json      metadata the game reads (frame grids, tile corners, sizes)

  python3 tools/art/pack.py
"""
import json
import os
import shutil

from PIL import Image

import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import spec  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(HERE, "out")
PUB = os.path.join(ROOT, "assets", "art")
META_JSON = os.path.join(PUB, "art_meta.json")
DIRS = ["south", "south-east", "east", "north-east", "north", "north-west", "west", "south-west"]


def pack_char(name):
    src = os.path.join(OUT, "chars", name)
    meta = json.load(open(os.path.join(src, "metadata.json")))
    state = meta["states"][0]
    folder = os.path.join(src, state["folder"]) if os.path.isdir(os.path.join(src, state["folder"])) else src
    frames = state["frames"]

    def load(rel):
        p = os.path.join(src, rel)
        if not os.path.exists(p):
            p = os.path.join(folder, rel.split("/", 1)[1]) if "/" in rel else p
        return Image.open(p).convert("RGBA")

    rows = []  # (key, dir, [images])
    rot = [load(frames["rotations"][d]) for d in DIRS if d in frames["rotations"]]
    rows.append(("rot", "all", rot))
    for anim, by_dir in frames.get("animations", {}).items():
        for d in DIRS:
            if d in by_dir:
                rows.append((anim, d, [load(f) for f in by_dir[d]]))
    cw = max(im.width for _, _, ims in rows for im in ims)
    ch = max(im.height for _, _, ims in rows for im in ims)
    cols = max(len(ims) for _, _, ims in rows)
    sheet = Image.new("RGBA", (cw * cols, ch * len(rows)), (0, 0, 0, 0))
    out_meta = {"cell": [cw, ch], "rotations": {}, "anims": {}}
    for r, (key, d, ims) in enumerate(rows):
        for c, im in enumerate(ims):
            # centre each frame in its cell (PixelLab centres the subject)
            sheet.paste(im, (c * cw + (cw - im.width) // 2, r * ch + (ch - im.height) // 2), im)
        if key == "rot":
            for i, dd in enumerate([d for d in DIRS if d in frames["rotations"]]):
                out_meta["rotations"][dd] = [i, r]
        else:
            out_meta["anims"].setdefault(key, {})[d] = {"row": r, "frames": len(ims)}
    # feet line: lowest opaque pixel of the south rotation, in cell coords
    south = rot[0]
    bbox = south.getbbox() or (0, 0, south.width, south.height)
    out_meta["footY"] = bbox[3] + (ch - south.height) // 2
    out_meta["bodyTop"] = bbox[1] + (ch - south.height) // 2
    os.makedirs(os.path.join(PUB, "chars"), exist_ok=True)
    sheet.save(os.path.join(PUB, "chars", f"{name}.png"), optimize=True)
    return out_meta


# Isometric 64x32 corner sets (see spec.ISO_TILESETS). Tile i of the 4x4 grid
# has corner mask i = NW<<3|NE<<2|SW<<1|SE, bit 1 = the set's first terrain.
TW, TH = 64, 32
# Canonical look of each terrain: (set, solid mask). Other sets are colour-
# matched to these so e.g. grass is the same green in every transition set.
CANON = {"grass": ("grass_dirt", 15), "dirt": ("grass_dirt", 0), "cobble": ("grass_cobble", 0), "water": ("grass_water", 0)}


def _tiles_of(name):
    grid = Image.open(os.path.join(OUT, "tiles", f"{name}.png")).convert("RGBA")
    return [grid.crop(((i % 4) * TW, (i // 4) * TH, (i % 4 + 1) * TW, (i // 4 + 1) * TH)) for i in range(16)]


def _stats(im):
    px = [p[:3] for p in im.get_flattened_data() if p[3] > 0]
    n = max(1, len(px))
    mu = [sum(p[c] for p in px) / n for c in range(3)]
    sd = [max(1.0, (sum((p[c] - mu[c]) ** 2 for p in px) / n) ** 0.5) for c in range(3)]
    return mu, sd


def _match(tiles, terrains, raw):
    """Recolour each terrain's pixels toward its canonical set (mean/std per channel)."""
    own = {terrains[0]: _stats(tiles[15]), terrains[1]: _stats(tiles[0])}
    target = {}
    for t in terrains:
        cs, ci = CANON.get(t, (None, None))
        if cs and cs in raw:
            target[t] = _stats(raw[cs][ci])
    if not target:
        return tiles
    out = []
    for im in tiles:
        im = im.copy()
        px = im.load()
        for y in range(TH):
            for x in range(TW):
                p = px[x, y]
                if p[3] == 0:
                    continue
                t = min(terrains, key=lambda k: sum((p[c] - own[k][0][c]) ** 2 for c in range(3)))
                if t not in target:
                    continue
                mu_s, sd_s = own[t]
                mu_t, sd_t = target[t]
                px[x, y] = tuple(max(0, min(255, round((p[c] - mu_s[c]) / sd_s[c] * sd_t[c] + mu_t[c]))) for c in range(3)) + (p[3],)
        out.append(im)
    return out


def _grow(im):
    """Bleed edge pixels 1px outward so neighbouring diamonds leave no gaps."""
    src = im.load()
    out = im.copy()
    dst = out.load()
    for y in range(TH):
        for x in range(TW):
            if src[x, y][3] > 0:
                continue
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < TW and 0 <= ny < TH and src[nx, ny][3] > 0:
                    dst[x, y] = src[nx, ny]
                    break
    return out


def pack_tiles(name, raw):
    terrains = name.split("_")
    tiles = raw[name]
    tiles = _match(tiles, terrains, raw)  # identity for the canonical sets themselves
    atlas = Image.new("RGBA", (TW * 4, TH * 4), (0, 0, 0, 0))
    for i, im in enumerate(tiles):
        atlas.paste(_grow(im), ((i % 4) * TW, (i // 4) * TH))
    os.makedirs(os.path.join(PUB, "tiles"), exist_ok=True)
    atlas.save(os.path.join(PUB, "tiles", f"{name}.png"), optimize=True)
    return {"tile": [TW, TH], "terrains": terrains, "mask": "NW<<3|NE<<2|SW<<1|SE, bit 1 = terrains[0]"}


def iso_fit(im):
    """Fit an isometric base to a building's lower silhouette.

    A building's bottom edges run down to its bottom corner at about slope
    1/2; at its left and right corners the silhouette jumps straight up (the
    wall's vertical edge). Find those two corner points, meet slope-1/2 lines
    from them to get the bottom corner, and measure the footprint in cells:
    w along the lower-left edge, h along the lower-right edge."""
    w, h = im.size
    a = im.split()[3].load()
    low = []
    for x in range(w):
        ys = [y for y in range(h - 1, -1, -1) if a[x, y] > 128]
        low.append(ys[0] if ys else -1)
    by = max(low)
    cols = [x for x in range(w) if low[x] >= by - 1]
    bx = int(sum(cols) / len(cols))

    def corner(sign):
        x = bx
        while 0 <= x + sign < w:
            nxt = low[x + sign]
            if nxt < 0 or nxt < low[x] - 12:  # transparent, or the wall edge goes straight up
                break
            x += sign
        return x

    left, right = corner(-1), corner(1)
    cx = (left + right) / 2 + low[right] - low[left]
    cy = low[left] + (cx - left) / 2 + 1  # +1: the corner is the far edge of that pixel row
    cw = max(1, round((cx - left) / 32))
    ch = max(1, round((right - cx) / 32))
    return [round(cx), round(cy)], [cw, ch]


def copy_dir(kind):
    meta = {}
    src = os.path.join(OUT, kind)
    dst = os.path.join(PUB, kind)
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.endswith(".png"):
            continue
        im = Image.open(os.path.join(src, f)).convert("RGBA")
        if kind == "props" and f[:-4] in spec.MIRROR:
            im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)  # front to the lower left
        im.save(os.path.join(dst, f), optimize=True)
        bbox = im.getbbox() or (0, 0, im.width, im.height)
        meta[f[:-4]] = {"w": im.width, "h": im.height, "bbox": list(bbox)}
        if kind == "props" and f[:-4] in spec.ISO_BUILDINGS:
            # Isometric building: base corner + footprint measured from the art.
            base, block = iso_fit(im)
            meta[f[:-4]].update({"iso": True, "base": base, "block": block})
        elif kind == "props" and f[:-4] in spec.ISO_PROPS:
            meta[f[:-4]]["iso"] = True  # small isometric prop: footprint from the layout
    return meta


def main():
    chars = {}
    for name in sorted(os.listdir(os.path.join(OUT, "chars"))):
        if os.path.exists(os.path.join(OUT, "chars", name, "metadata.json")):
            chars[name] = pack_char(name)
    names = [f[:-4] for f in sorted(os.listdir(os.path.join(OUT, "tiles"))) if f.endswith(".png")]
    raw = {n: _tiles_of(n) for n in names}
    for f in os.listdir(os.path.join(PUB, "tiles")) if os.path.isdir(os.path.join(PUB, "tiles")) else []:
        if f.split(".")[0] not in names:  # drop atlases of sets that no longer exist
            os.remove(os.path.join(PUB, "tiles", f))
    tiles = {n: pack_tiles(n, raw) for n in names}
    props = copy_dir("props")
    icons = copy_dir("icons")
    art = {"chars": chars, "tiles": tiles, "props": props, "icons": icons}
    with open(META_JSON, "w") as fh:
        json.dump(art, fh, indent=1, sort_keys=True)
    print("packed", len(chars), "chars,", len(tiles), "tilesets,", len(props), "props,", len(icons), "icons")


if __name__ == "__main__":
    main()
