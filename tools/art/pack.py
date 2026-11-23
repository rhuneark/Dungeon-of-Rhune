"""
Pack tools/art/out/ into game-ready files:

  assets/art/chars/<name>.png   one sheet per character (rotations + animations)
  assets/art/tiles/<set>.png    4x4 Wang tile atlas per terrain pair
  assets/art/props/*.png        map objects (copied, despeckled, recoloured per spec)
  assets/art/glow/*.png         the light-emitting pixels of props (see glow_of)
  assets/art/icons/*.png        item icons (copied)
  assets/art/art_meta.json      metadata the game reads (frame grids, tile corners, sizes)

  python3 tools/art/pack.py
"""
import base64
import io
import json
import os
import shutil
import sys

from PIL import Image

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


def recolour(im, table):
    if not table:
        return im
    rgb = {k: tuple(int(k[j:j + 2], 16) for j in (1, 3, 5)) for k in table}
    to = {rgb[k]: tuple(int(v[j:j + 2], 16) for j in (1, 3, 5)) for k, v in table.items()}
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            c = px[x, y]
            n = to.get(c[:3])
            if n:
                px[x, y] = n + (c[3],)
    return im


def pack_tiles(name):
    d = json.load(open(os.path.join(OUT, "tiles", f"{name}.json")))
    tiles = d["tileset"]["tiles"]
    size = d["tileset"]["tile_size"]["width"]
    table = getattr(spec, "TILE_REMAP", {}).get(name, {})
    ims = []
    entries = []
    solid = {}
    for i, t in enumerate(tiles):
        im = recolour(Image.open(io.BytesIO(base64.b64decode(t["image"]["base64"]))).convert("RGBA"), table)
        ims.append(im)
        c = t["corners"]
        # 0 lower, 1 upper, 2 transition (cliff sets: the wall face under an upper edge)
        key = "".join({"upper": "1", "transition": "2"}.get(c[k], "0") for k in ("NW", "NE", "SW", "SE"))
        entries.append({"i": i, "key": key})
        if key in ("0000", "1111"):
            solid[key] = im
    # Plain ground repeats visibly when one tile covers a whole square, so
    # each plain tile also gets mirrored / rotated copies (they still tile:
    # the textures are top-down and noisy). Marked "v" (variant).
    for key, im in sorted(solid.items()):
        for op in (Image.Transpose.FLIP_LEFT_RIGHT, Image.Transpose.FLIP_TOP_BOTTOM, Image.Transpose.ROTATE_180):
            ims.append(im.transpose(op))
            entries.append({"i": len(ims) - 1, "key": key, "v": 1})
    atlas = Image.new("RGBA", (size * 4, size * ((len(ims) + 3) // 4)), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        atlas.paste(im, ((i % 4) * size, (i // 4) * size))
    # The API's lower/upper corner labels are not always consistent with the
    # prompts (some sets come back inverted). Decide from the pixels: the
    # terrain whose prompt mentions grass must be the greener solid tile.
    prompts = d.get("metadata", {}).get("terrain_prompts", {})
    grass_side = "upper" if "grass" in prompts.get("upper", "") and "grass" not in prompts.get("lower", "") else "lower" if "grass" in prompts.get("lower", "") else None
    if grass_side and "0000" in solid and "1111" in solid:
        def greenness(im):
            px = [p for p in im.get_flattened_data() if p[3] > 0]
            return sum(p[1] - (p[0] + p[2]) / 2 for p in px) / max(1, len(px))
        upper_is_greener = greenness(solid["1111"]) > greenness(solid["0000"])
        if (grass_side == "upper") != upper_is_greener:
            for e in entries:
                e["key"] = "".join("1" if ch == "0" else "0" for ch in e["key"])
            print("  (corner labels inverted for", name, "- fixed)")
    os.makedirs(os.path.join(PUB, "tiles"), exist_ok=True)
    atlas.save(os.path.join(PUB, "tiles", f"{name}.png"), optimize=True)
    return {"size": size, "tiles": entries}


def despeckle(im, min_px=6):
    """Drop tiny opaque islands (background-removal leftovers) from map objects."""
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    for y0 in range(h):
        for x0 in range(w):
            if seen[y0 * w + x0] or px[x0, y0][3] == 0:
                continue
            comp, stack = [], [(x0, y0)]
            seen[y0 * w + x0] = 1
            while stack:
                x, y = stack.pop()
                comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx] and px[nx, ny][3] > 0:
                        seen[ny * w + nx] = 1
                        stack.append((nx, ny))
            if len(comp) < min_px:
                for x, y in comp:
                    px[x, y] = (0, 0, 0, 0)
    return im


# ------------------------------------------------------------------- glow
# Pixels that emit light: lamplight/lit windows ("warm"), flames and coals
# ("fire"), cold magic ("rune"). The game redraws them unshaded over the dusk
# tint and puts a flickering light on each cluster (scripts/world/atmosphere.gd).
GLOW_CELL = 12
GLOW_MIN = 6
GLOW_MAX_LIGHTS = 4


def glow_kind(c):
    if c[3] < 128:
        return ""
    r, g, b = c[0] / 255, c[1] / 255, c[2] / 255
    mx, mn = max(r, g, b), min(r, g, b)
    if mx < 0.88 or (mx - mn) / max(mx, 0.001) < 0.40:
        return ""
    if r >= mx - 0.001:
        if g < 0.62 * r:
            return "fire"
        if b < 0.62 * r and g > 0.62 * r:
            return "warm"
        return ""
    if b >= 0.82 and g >= 0.70 and r < 0.6:
        return "rune"
    return ""


def glow_of(im):
    """(mask image, clusters [[x, y, n, kind]]) or (None, [])."""
    w, h = im.size
    px = im.load()
    mask = Image.new("RGBA", im.size, (0, 0, 0, 0))
    mp = mask.load()
    cells = {}
    for y in range(h):
        for x in range(w):
            k = glow_kind(px[x, y])
            if not k:
                continue
            mp[x, y] = px[x, y]
            e = cells.setdefault((x // GLOW_CELL, y // GLOW_CELL), {"sx": 0, "sy": 0, "n": 0, "warm": 0, "fire": 0, "rune": 0})
            e["sx"] += x
            e["sy"] += y
            e["n"] += 1
            e[k] += 1
    clusters, seen = [], set()
    for start in cells:
        if start in seen:
            continue
        acc = {"sx": 0, "sy": 0, "n": 0, "warm": 0, "fire": 0, "rune": 0}
        stack = [start]
        while stack:
            q = stack.pop()
            if q in seen or q not in cells:
                continue
            seen.add(q)
            for k in acc:
                acc[k] += cells[q][k]
            stack += [(q[0] + dx, q[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1) if dx or dy]
        if acc["n"] < GLOW_MIN:
            continue
        kind = max(("fire", "warm", "rune"), key=lambda k: (acc[k], k == "fire"))
        clusters.append([round(acc["sx"] / acc["n"]), round(acc["sy"] / acc["n"]), acc["n"], kind])
    if not clusters:
        return None, []
    clusters.sort(key=lambda c: -c[2])
    return mask, clusters[:GLOW_MAX_LIGHTS]


def copy_dir(kind):
    meta = {}
    src = os.path.join(OUT, kind)
    dst = os.path.join(PUB, kind)
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.endswith(".png"):
            continue
        im = Image.open(os.path.join(src, f)).convert("RGBA")
        if kind == "props":
            im = recolour(despeckle(im), getattr(spec, "PROP_REMAP", {}).get(f[:-4], {}))
        im.save(os.path.join(dst, f), optimize=True)
        bbox = im.getbbox() or (0, 0, im.width, im.height)
        meta[f[:-4]] = {"w": im.width, "h": im.height, "bbox": list(bbox)}
        if kind == "props":
            # The goose is drawn by the runtime, not as a Prop: it never glows.
            mask, clusters = glow_of(im) if f[:-4] not in ("goose",) else (None, [])
            glow_path = os.path.join(PUB, "glow", f)
            if mask is not None:
                os.makedirs(os.path.dirname(glow_path), exist_ok=True)
                mask.save(glow_path, optimize=True)
                meta[f[:-4]]["glow"] = clusters
            elif os.path.exists(glow_path):
                os.remove(glow_path)
    return meta


def main():
    chars = {}
    for name in sorted(os.listdir(os.path.join(OUT, "chars"))):
        if os.path.exists(os.path.join(OUT, "chars", name, "metadata.json")):
            chars[name] = pack_char(name)
    tiles = {}
    for f in sorted(os.listdir(os.path.join(OUT, "tiles"))):
        if f.endswith(".json"):
            tiles[f[:-5]] = pack_tiles(f[:-5])
    props = copy_dir("props")
    icons = copy_dir("icons")
    art = {"chars": chars, "tiles": tiles, "props": props, "icons": icons}
    with open(META_JSON, "w") as fh:
        json.dump(art, fh, indent=1, sort_keys=True)
    print("packed", len(chars), "chars,", len(tiles), "tilesets,", len(props), "props,", len(icons), "icons")


if __name__ == "__main__":
    main()
