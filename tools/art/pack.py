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
GRASS_STATS = None  # canonical grass colour stats, for recolouring sunk yards
# Canonical look of each terrain: (set, solid mask). Other sets are colour-
# matched to these so e.g. grass is the same green in every transition set.
CANON = {"grass": ("grass_dirt", 15), "dirt": ("grass_dirt", 0), "cobble": ("grass_cobble", 0), "water": ("grass_water", 0)}


def _tiles_of(name):
    grid = Image.open(os.path.join(OUT, "tiles", f"{name}.png")).convert("RGBA")
    return [grid.crop(((i % 4) * TW, (i // 4) * TH, (i % 4 + 1) * TW, (i // 4 + 1) * TH)) for i in range(16)]


def _stats(im):
    return _stats_px(im.get_flattened_data())


def _stats_px(pixels):
    """Per-channel mean and standard deviation of the opaque pixels."""
    px = [p[:3] for p in pixels if p[3] > 0]
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
    # Every terrain should look the same in every tile (transition tiles'
    # water/grass drift from the solid tiles'), so each tile's region of a
    # terrain is matched on its own stats when it is big enough to have any.
    for t in terrains:
        target.setdefault(t, own[t])
    out = []
    for im in tiles:
        im = im.copy()
        px = im.load()
        regions = {t: [] for t in terrains}
        for y in range(TH):
            for x in range(TW):
                p = px[x, y]
                if p[3] == 0:
                    continue
                regions[min(terrains, key=lambda k: sum((p[c] - own[k][0][c]) ** 2 for c in range(3)))].append((x, y))
        for t, pts in regions.items():
            src = _stats_px([px[x, y] for x, y in pts]) if len(pts) >= 120 else own[t]
            mu_s, sd_s = src
            mu_t, sd_t = target[t]
            for x, y in pts:
                p = px[x, y]
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

    Take the lower convex hull of the silhouette (it bridges doorways, gaps
    and hanging details), then follow its edges outward from the bottom while
    they keep roughly the isometric slope of 1/2: where they turn steep is a
    side corner. Meet slope-1/2 lines from the two side corners to get the
    bottom corner, and measure the footprint in cells: w along the lower-left
    edge, h along the lower-right edge."""
    w, h = im.size
    a = im.split()[3].load()
    pts = []
    for x in range(w):
        ys = [y for y in range(h - 1, -1, -1) if a[x, y] > 128]
        if ys:
            pts.append((x, ys[0]))
    # Lower hull in image coords (y down): keep the "lowest" chain.
    hull = []
    for p in pts:
        while len(hull) >= 2:
            (x1, y1), (x2, y2) = hull[-2], hull[-1]
            if (x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1) >= 0:
                hull.pop()  # (y points down: this keeps the chain along the bottom)
            else:
                break
        hull.append(p)
    bi = max(range(len(hull)), key=lambda i: (hull[i][1], -abs(hull[i][0] - w / 2)))

    def walk(step):
        i = bi
        while 0 <= i + step < len(hull):
            (x1, y1), (x2, y2) = hull[i], hull[i + step]
            run = abs(x2 - x1)
            slope = (y1 - y2) / max(1, run)  # rise per px going outward
            short = run <= 12 and slope < 1.0  # pixel steps and flat bits at the corner
            if not (short or 0.3 <= slope <= 0.75):
                break
            i += step
        return hull[i]

    (lx, ly), (rx, ry) = walk(-1), walk(1)
    cx = (lx + rx) / 2 + ry - ly
    cy = ly + (cx - lx) / 2 + 1  # +1: the corner is the far edge of that pixel row
    cw = max(1, round((cx - lx) / 32))
    ch = max(1, round((rx - cx) / 32))
    return [round(cx), round(cy)], [cw, ch]


def deslab(im, mode, depth=0, grass_target=None):
    """Cut a ground slab off the bottom of a sprite (see spec.SLABS).

    Reading each column upward from its lowest pixel: the slab's outline and
    side face (the "band"), then its top surface (yard colours), then whatever
    stands on it. The yard palette is learned from just above the band. "sink"
    removes the band; "remove" removes band + top surface. Small fragments
    left floating afterwards are dropped."""
    from collections import Counter

    im = im.copy()
    w, h = im.size
    px = im.load()
    low = []
    for x in range(w):
        ys = [y for y in range(h - 1, -1, -1) if px[x, y][3] > 128]
        low.append(ys[0] if ys else -1)

    # Yard palette: the most common colours 6-14 px above each column's bottom.
    samples = Counter()
    for x in range(w):
        for k in range(6, 15):
            y = low[x] - k
            if low[x] >= 0 and y >= 0 and px[x, y][3] > 128:
                samples[px[x, y][:3]] += 1
    total = sum(samples.values())
    palette, acc = [], 0
    for c, n in samples.most_common():
        palette.append(c)
        acc += n
        if acc >= total * 0.9:
            break

    def yard(p):
        return p[3] > 128 and min(sum((p[i] - c[i]) ** 2 for i in range(3)) for c in palette) < 30 ** 2

    greens = []

    for x in range(w):
        if low[x] < 0:
            continue
        y = low[x]
        band_end = None
        for k in range(10):  # outline + side face: up to the first yard pixel
            if y - k < 0 or px[x, y - k][3] <= 128:
                break
            if yard(px[x, y - k]):
                band_end = y - k
                break
        if band_end is None:
            continue  # nothing slab-like in this column
        cut_to = band_end  # rows below cut_to are cut
        if mode == "remove":
            # Walk up through the yard (at most `depth` px): yard pixels and
            # short non-yard details (pebbles, flowers, path edges: <= 5 px with
            # yard above them again) go; a longer non-yard run is whatever
            # stands on the yard (a wall, a trunk) and stops the cut.
            yy, top = band_end, max(-1, band_end - depth)
            while yy > top and px[x, yy][3] > 128:
                if yard(px[x, yy]):
                    cut_to = yy - 1
                    yy -= 1
                    continue
                run = 0
                while yy - run > top and px[x, yy - run][3] > 128 and not yard(px[x, yy - run]):
                    run += 1
                if run > 5 or yy - run <= top or px[x, yy - run][3] <= 128:
                    break
                cut_to = yy - run  # a short detail inside the yard: cut it too
                yy -= run
        if mode == "sink_grass":
            # Flush yard: recolour its greens (walking up like "remove") to our grass.
            yy, top = band_end, max(-1, band_end - depth)
            while yy > top and px[x, yy][3] > 128:
                p = px[x, yy]
                if yard(p):
                    if p[1] > p[0] and p[1] > p[2]:
                        greens.append((x, yy))
                    yy -= 1
                    continue
                run = 0
                while yy - run > top and px[x, yy - run][3] > 128 and not yard(px[x, yy - run]):
                    run += 1
                if run > 5 or yy - run <= top or px[x, yy - run][3] <= 128:
                    break
                yy -= run
        for yy in range(cut_to + 1, low[x] + 1):
            px[x, yy] = (0, 0, 0, 0)
    if greens and grass_target:
        mu_s, sd_s = _stats_px([px[x, y] for x, y in greens])
        mu_t, sd_t = grass_target
        for x, y in greens:
            p = px[x, y]
            px[x, y] = tuple(max(0, min(255, round((p[c] - mu_s[c]) / sd_s[c] * sd_t[c] + mu_t[c]))) for c in range(3)) + (p[3],)
        # The flush yard's own outline (its back edges) would still trace the
        # old slab: drop dark pixels that touch both the outside and the yard.
        yard_px = set(greens)
        for _ in range(2):
            strip = []
            for x, y in yard_px:
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1), (x + 1, y - 1), (x - 1, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h:
                        q = px[nx, ny]
                        if q[3] > 128 and max(q[:3]) < 56 and (nx, ny) not in yard_px:
                            outside = any(
                                not (0 <= mx < w and 0 <= my < h) or px[mx, my][3] <= 128
                                for mx, my in ((nx + 1, ny), (nx - 1, ny), (nx, ny + 1), (nx, ny - 1))
                            )
                            if outside:
                                strip.append((nx, ny))
            for x, y in strip:
                px[x, y] = (0, 0, 0, 0)

    # Drop leftover fragments (bits of the slab's back edge, stray outline).
    seen = set()
    comps = []
    for y0 in range(h):
        for x0 in range(w):
            if px[x0, y0][3] <= 128 or (x0, y0) in seen:
                continue
            stack, comp = [(x0, y0)], []
            seen.add((x0, y0))
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in seen and px[nx, ny][3] > 128:
                        seen.add((nx, ny))
                        stack.append((nx, ny))
            comps.append(comp)
    if comps:
        biggest = max(len(c) for c in comps)
        for c in comps:
            if len(c) < max(24, biggest * 0.02):
                for x, y in c:
                    px[x, y] = (0, 0, 0, 0)
    return im


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
        if kind == "props" and f[:-4] in spec.SLABS:
            im = deslab(im, *spec.SLABS[f[:-4]], grass_target=GRASS_STATS)
        im.save(os.path.join(dst, f), optimize=True)
        bbox = im.getbbox() or (0, 0, im.width, im.height)
        meta[f[:-4]] = {"w": im.width, "h": im.height, "bbox": list(bbox)}
        if kind == "props" and f[:-4] in spec.ISO_BUILDINGS:
            # Isometric building: base corner + footprint measured from the art.
            base, block = iso_fit(im)
            fix = spec.ISO_FIT.get(f[:-4], {})  # hand-measured where the silhouette misleads
            meta[f[:-4]].update({"iso": True, "base": fix.get("base", base), "block": fix.get("block", block)})
        elif kind == "props" and f[:-4] in spec.ISO_PROPS:
            meta[f[:-4]]["iso"] = True  # small isometric prop: footprint from the layout
    return meta


def main():
    chars = {}
    for name in sorted(os.listdir(os.path.join(OUT, "chars"))):
        if os.path.exists(os.path.join(OUT, "chars", name, "metadata.json")):
            chars[name] = pack_char(name)
    global GRASS_STATS
    names = [f[:-4] for f in sorted(os.listdir(os.path.join(OUT, "tiles"))) if f.endswith(".png")]
    raw = {n: _tiles_of(n) for n in names}
    cs, ci = CANON["grass"]
    GRASS_STATS = _stats(raw[cs][ci]) if cs in raw else None
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
