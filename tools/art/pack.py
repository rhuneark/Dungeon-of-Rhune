"""
Pack tools/art/out/ into game-ready files:

  assets/art/chars/<name>.png   one sheet per character (rotations + animations)
  assets/art/tiles/<set>.png    4x4 Wang tile atlas per terrain pair
  assets/art/props/*.png        map objects (copied)
  assets/art/icons/*.png        item icons (copied)
  assets/art/art_meta.json      metadata the game reads (frame grids, tile corners, sizes)

  python3 tools/art/pack.py
"""
import base64
import io
import json
import os
import shutil

from PIL import Image

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


def pack_tiles(name):
    d = json.load(open(os.path.join(OUT, "tiles", f"{name}.json")))
    tiles = d["tileset"]["tiles"]
    size = d["tileset"]["tile_size"]["width"]
    atlas = Image.new("RGBA", (size * 4, size * ((len(tiles) + 3) // 4)), (0, 0, 0, 0))
    entries = []
    solid = {}
    for i, t in enumerate(tiles):
        im = Image.open(io.BytesIO(base64.b64decode(t["image"]["base64"]))).convert("RGBA")
        atlas.paste(im, ((i % 4) * size, (i // 4) * size))
        c = t["corners"]
        key = "".join("1" if c[k] == "upper" else "0" for k in ("NW", "NE", "SW", "SE"))
        entries.append({"i": i, "key": key})
        if key in ("0000", "1111"):
            solid[key] = im
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


def copy_dir(kind):
    meta = {}
    src = os.path.join(OUT, kind)
    dst = os.path.join(PUB, kind)
    os.makedirs(dst, exist_ok=True)
    for f in sorted(os.listdir(src)):
        if not f.endswith(".png"):
            continue
        im = Image.open(os.path.join(src, f)).convert("RGBA")
        im.save(os.path.join(dst, f), optimize=True)
        bbox = im.getbbox() or (0, 0, im.width, im.height)
        meta[f[:-4]] = {"w": im.width, "h": im.height, "bbox": list(bbox)}
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
