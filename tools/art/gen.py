"""
Generate every asset in spec.py through the PixelLab v2 API.

  python3 tools/art/gen.py            # everything missing
  python3 tools/art/gen.py props      # one category: chars|tiles|props|icons|rhunes

Idempotent: anything already in tools/art/out/ is skipped, so delete a file to
regenerate it. Raw API state (character/tileset ids) lives in
tools/art/.cache/state.json so animations can be added to existing characters.
"""
import io
import json
import os
import sys
import threading
import time
import zipfile
from concurrent.futures import ThreadPoolExecutor, as_completed

sys.path.insert(0, os.path.dirname(__file__))
import pixellab as pl  # noqa: E402
import spec  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
CACHE = os.path.join(HERE, ".cache")
STATE_PATH = os.path.join(CACHE, "state.json")
_lock = threading.Lock()


def log(*a):
    with _lock:
        print(time.strftime("%H:%M:%S"), *a, flush=True)


def load_state():
    try:
        with open(STATE_PATH) as f:
            return json.load(f)
    except Exception:
        return {"characters": {}, "tilesets": {}}


STATE = load_state()


def save_state():
    os.makedirs(CACHE, exist_ok=True)
    with _lock:
        with open(STATE_PATH, "w") as f:
            json.dump(STATE, f, indent=2)


def post_retry(path, body, tries=8):
    for i in range(tries):
        code, d = pl.post(path, body)
        if code in (200, 201, 202):
            return d
        if code in (429, 500, 502, 503, 504):
            log(f"  {path} -> {code}, retry {i + 1}", str(d)[:160])
            time.sleep(10 + i * 10)
            continue
        raise RuntimeError(f"{path} -> {code}: {str(d)[:400]}")
    raise RuntimeError(f"{path} gave up")


# ---------------------------------------------------------------- map objects
def strip_flat_background(path, tol=22):
    """Large map objects come back on a flat colour instead of transparent.
    Flood-fill that colour from the borders (outlines stop the fill)."""
    from PIL import Image

    im = Image.open(path).convert("RGBA")
    w, h = im.size
    px = im.load()
    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    if any(c[3] < 255 for c in corners):
        return  # already transparent
    bg = corners[0]
    close = lambda c: c[3] > 0 and sum(abs(c[i] - bg[i]) for i in range(3)) <= tol
    stack = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
    seen = set()
    while stack:
        x, y = stack.pop()
        if (x, y) in seen or not (0 <= x < w and 0 <= y < h):
            continue
        seen.add((x, y))
        if not close(px[x, y]):
            continue
        px[x, y] = (0, 0, 0, 0)
        stack.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    im.save(path)


def map_object(name, w, h, prompt, out_path, view="high top-down"):
    if os.path.exists(out_path):
        return
    body = {
        "description": prompt,
        "image_size": {"width": w, "height": h},
        "view": view,
        "outline": "single color outline",
        "shading": "medium shading",
        "detail": "high detail" if name in spec.ISO_BUILDINGS else "medium detail",
    }
    d = post_retry("/map-objects", body)
    job = pl.wait_job(d["background_job_id"], label=name)
    if job["status"] != "completed":
        raise RuntimeError(f"{name} failed: {str(job)[:300]}")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    pl.save_b64(job["last_response"]["image"], out_path)
    strip_flat_background(out_path)
    log("ok", name)


def gen_props():
    tasks = []
    for name, (w, h, prompt) in spec.PROPS.items():
        out = os.path.join(OUT, "props", f"{name}.png")
        if name in spec.ISO_BUILDINGS:
            tasks.append((name, w, h, f"{prompt}, {spec.ISO_STYLE}", out, "low top-down"))
        elif name in spec.ISO_PROPS:
            tasks.append((name, w, h, f"{prompt}, {spec.ISO_PROP_STYLE}", out, "low top-down"))
        else:
            tasks.append((name, w, h, f"{prompt}, {spec.PROP_STYLE}", out, "high top-down"))
    return tasks


def gen_icons():
    tasks = []
    for name, (cw, ch, prompt) in spec.ICONS.items():
        tasks.append((name, cw * 32, ch * 32, f"{prompt}, {spec.ICON_STYLE}", os.path.join(OUT, "icons", f"{name}.png"), "side"))
    return tasks


def gen_rhunes():
    tasks = []
    for name, color, glyph in spec.RHUNES:
        prompt = f"small flat dark stone carved with {glyph} glowing {color}, magic rune stone, {spec.ICON_STYLE}"
        tasks.append((f"rhune_{name}", 32, 32, prompt, os.path.join(OUT, "icons", f"rhune_{name}.png"), "side"))
    return tasks


# ----------------------------------------------------------------- characters
def character(name, prompt, anims):
    out_dir = os.path.join(OUT, "chars", name)
    done_flag = os.path.join(out_dir, ".done")
    if os.path.exists(done_flag):
        return
    cs = STATE["characters"].setdefault(name, {})
    if not cs.get("id"):
        d = post_retry("/create-character-v3", {
            "description": prompt,
            "image_size": {"width": 64, "height": 64},
            "view": "low top-down",
            "outline": "single color black outline",
            "detail": "medium detail",
            "name": name,
        })
        cs["id"] = d["character_id"]
        save_state()
        job = pl.wait_job(d["background_job_id"], label=name)
        if job["status"] != "completed":
            raise RuntimeError(f"{name} failed: {str(job)[:300]}")
        log("char ok", name)
    cid = cs["id"]
    for template, dirs in anims:
        key = f"anim:{template}"
        if cs.get(key) == "done":
            continue
        d = post_retry("/characters/animations", {
            "character_id": cid,
            "template_animation_id": template,
            "mode": "template",
            "directions": dirs,
        })
        job_ids = d.get("background_job_ids") or ([d["background_job_id"]] if d.get("background_job_id") else [])
        for jid in job_ids:
            job = pl.wait_job(jid, label=f"{name}:{template}")
            if job["status"] != "completed":
                raise RuntimeError(f"{name}:{template} failed: {str(job)[:300]}")
        cs[key] = "done"
        save_state()
        log("anim ok", name, template)
    # Export everything in one zip (served from api.pixellab.ai).
    import urllib.request
    req = urllib.request.Request(f"{pl.BASE}/characters/{cid}/zip", headers=pl._headers())
    with urllib.request.urlopen(req, timeout=120) as r:
        blob = r.read()
    os.makedirs(out_dir, exist_ok=True)
    zipfile.ZipFile(io.BytesIO(blob)).extractall(out_dir)
    open(done_flag, "w").write("ok")
    log("export ok", name)


# ------------------------------------------------------------------- tilesets
def tileset(ts):
    """Isometric 64x32 corner set: saves out/tiles/<name>.png (4x4 grid, tile i
    has corner mask i = NW<<3|NE<<2|SW<<1|SE, bit 1 = first terrain) and
    out/tiles/<name>.json (rules, colours)."""
    import base64

    name = ts["name"]
    out_png = os.path.join(OUT, "tiles", f"{name}.png")
    out_json = os.path.join(OUT, "tiles", f"{name}.json")
    if os.path.exists(out_png) and os.path.exists(out_json):
        return
    d = post_retry("/create-tiles-pro", {
        "description": ts["description"],
        "tile_type": "isometric",
        "tile_size": 64,
        "tile_view_angle": 30,
        "tile_depth_ratio": 0.0,
        "tile_feature": "tileset",
        "outline_mode": "segmentation",
        "boundary_amplitude": ts.get("boundary_amplitude", 0.12),
    })
    job = pl.wait_job(d["background_job_id"], label=name)
    if job["status"] != "completed":
        raise RuntimeError(f"tileset {name} failed: {str(job)[:300]}")
    lr = job["last_response"]
    os.makedirs(os.path.dirname(out_png), exist_ok=True)
    with open(out_png, "wb") as f:
        f.write(base64.b64decode(lr["tileset_grid_png"]))
    with open(out_json, "w") as f:
        json.dump({k: v for k, v in lr.items() if k != "tileset_grid_png"}, f, indent=1)
    log("tileset ok", name, lr.get("tile_rules", {}).get("terrains"))


# ------------------------------------------------------------------------ run
def main():
    which = set(sys.argv[1:]) or {"chars", "tiles", "props", "icons", "rhunes"}
    errors = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        futs = {}
        if "tiles" in which:
            for ts in spec.ISO_TILESETS:
                futs[ex.submit(tileset, ts)] = f"tileset {ts['name']}"
        if "chars" in which:
            for name, (prompt, anims) in spec.CHARACTERS.items():
                futs[ex.submit(character, name, prompt, anims)] = f"char {name}"
        tasks = []
        if "props" in which:
            tasks += gen_props()
        if "icons" in which:
            tasks += gen_icons()
        if "rhunes" in which:
            tasks += gen_rhunes()
        for t in tasks:
            futs[ex.submit(map_object, *t)] = t[0]
        for f in as_completed(futs):
            try:
                f.result()
            except Exception as e:
                errors.append(f"{futs[f]}: {e}")
                log("ERR", futs[f], e)
    log("DONE", len(errors), "errors")
    for e in errors:
        log("  ", e)


if __name__ == "__main__":
    main()
