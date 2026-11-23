"""
Generate every asset in spec.py through the PixelLab v2 API.

  python3 tools/art/gen.py            # everything missing
  python3 tools/art/gen.py props      # one category: chars|tiles|props|icons|rhunes
  python3 tools/art/gen.py props --only tavern,smithy --variants 3
                                      # candidates -> out/candidates/<name>_<i>.png;
                                      # copy the best to out/props/<name>.png

Idempotent: anything already in tools/art/out/ is skipped, so delete a file to
regenerate it. Raw API state (character/tileset ids) lives in
tools/art/.cache/state.json so animations can be added to existing characters.
World art (props, tiles, reference-drawn characters) is forced onto
spec.PALETTE.
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
REF_DIR = os.path.join(HERE, "ref")
REF_BG = (130, 130, 133, 255)


def _b64png(im):
    import base64

    buf = io.BytesIO()
    im.save(buf, "PNG")
    return base64.b64encode(buf.getvalue()).decode()


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


_palette_b64 = None


def palette_image():
    """spec.PALETTE as a swatch PNG (PixelLab's forced-palette `color_image`)."""
    global _palette_b64
    if _palette_b64 is None:
        from PIL import Image

        cols, s = 8, 16
        rows = (len(spec.PALETTE) + cols - 1) // cols
        im = Image.new("RGBA", (cols * s, rows * s), (0, 0, 0, 0))
        for i, hx in enumerate(spec.PALETTE):
            c = tuple(int(hx[j:j + 2], 16) for j in (1, 3, 5)) + (255,)
            im.paste(c, ((i % cols) * s, (i // cols) * s, (i % cols + 1) * s, (i // cols + 1) * s))
        _palette_b64 = _b64png(im)
    return {"type": "base64", "base64": _palette_b64}


def guide_image(name, w, h):
    """The composition guide in ref/, desaturated so the prompt + palette set the colours."""
    from PIL import Image, ImageEnhance

    canvas = Image.new("RGBA", (w, h), REF_BG)
    canvas.alpha_composite(Image.open(os.path.join(REF_DIR, f"{name}.png")).convert("RGBA").resize((w, h), Image.BILINEAR))
    return ImageEnhance.Color(canvas.convert("RGB")).enhance(0.3)


def map_object(name, w, h, prompt, out_path, view="high top-down", icon=False):
    if os.path.exists(out_path):
        return
    big = name in getattr(spec, "PROP_REFS", ()) or name in getattr(spec, "FRONT_FACING", ())
    body = {
        "description": prompt,
        "image_size": {"width": w, "height": h},
        "view": view,
        "outline": "single color outline",
        "shading": "medium shading" if icon else "detailed shading",
        "detail": "high detail" if big else "medium detail",
    }
    if not icon:
        body["color_image"] = palette_image()
    if name in getattr(spec, "PROP_REFS", ()) and os.path.exists(os.path.join(REF_DIR, f"{name}.png")):
        body["init_image"] = {"type": "base64", "base64": _b64png(guide_image(name, w, h))}
        body["init_image_strength"] = getattr(spec, "REF_STRENGTH_OVERRIDES", {}).get(name, spec.REF_STRENGTH)
    d = post_retry("/map-objects", body)
    job = pl.wait_job(d["background_job_id"], label=name)
    if job["status"] != "completed":
        raise RuntimeError(f"{name} failed: {str(job)[:300]}")
    pl.save_b64(job["last_response"]["image"], out_path)
    strip_flat_background(out_path)
    log("ok", os.path.relpath(out_path, OUT))


def prop_view(name):
    if name in spec.FRONT_FACING:
        return "low top-down"
    return "low top-down" if name in getattr(spec, "LOW_VIEW", ()) else "high top-down"


def gen_props(only=None, variants=0):
    tasks = []
    for name, (w, h, prompt) in spec.PROPS.items():
        if only and name not in only:
            continue
        full = f"{prompt}, {spec.FRONT_STYLE}" if name in spec.FRONT_FACING else f"{prompt}, {spec.PROP_STYLE}"
        if variants:
            for i in range(variants):
                tasks.append((name, w, h, full, os.path.join(OUT, "candidates", f"{name}_{i}.png"), prop_view(name)))
        else:
            tasks.append((name, w, h, full, os.path.join(OUT, "props", f"{name}.png"), prop_view(name)))
    return tasks


def gen_icons():
    tasks = []
    for name, (cw, ch, prompt) in spec.ICONS.items():
        tasks.append((name, cw * 32, ch * 32, f"{prompt}, {spec.ICON_STYLE}", os.path.join(OUT, "icons", f"{name}.png"), "side", True))
    return tasks


def gen_rhunes():
    tasks = []
    for name, color, glyph in spec.RHUNES:
        prompt = f"small flat dark stone carved with {glyph} glowing {color}, magic rune stone, {spec.ICON_STYLE}"
        tasks.append((f"rhune_{name}", 32, 32, prompt, os.path.join(OUT, "icons", f"rhune_{name}.png"), "side", True))
    return tasks


# ----------------------------------------------------------------- characters
def character(name, prompt, anims):
    out_dir = os.path.join(OUT, "chars", name)
    done_flag = os.path.join(out_dir, ".done")
    if os.path.exists(done_flag):
        return
    cs = STATE["characters"].setdefault(name, {})
    if not cs.get("id"):
        size = getattr(spec, "CHAR_SIZE", {}).get(name, 64)
        body = {
            "description": prompt,
            "image_size": {"width": size, "height": size},
            "view": "low top-down",
            "outline": "single color black outline",
            "detail": "medium detail",
            "name": name,
        }
        if name in getattr(spec, "CHAR_FROM_REF", ()):
            # Draw the south-facing sprite on the world palette first; v3 rotates it.
            ref = os.path.join(OUT, "chars", f"{name}_ref.png")
            map_object(f"{name}_ref", size, size, prompt, ref, "low top-down")
            with open(ref, "rb") as fh:
                import base64

                body["reference_image"] = {"type": "base64", "base64": base64.b64encode(fh.read()).decode()}
            for k in ("outline", "detail"):
                body.pop(k)
        d = post_retry("/create-character-v3", body)
        cs["id"] = d["character_id"]
        save_state()
        job = pl.wait_job(d["background_job_id"], label=name)
        if job["status"] != "completed":
            raise RuntimeError(f"{name} failed: {str(job)[:300]}")
        log("char ok", name)
    cid = cs["id"]
    for anim in anims:
        template, dirs = anim[0], anim[1]
        key = f"anim:{template}"
        if cs.get(key) == "done":
            continue
        if len(anim) > 2:
            # Custom motion (v3): one job per direction; extend the group if a
            # previous run already made some directions.
            body = {
                "character_id": cid, "mode": "v3", "animation_name": template,
                "action_description": anim[2]["action"], "frame_count": anim[2].get("frames", 6),
                "directions": [d for d in dirs if d not in cs.get(f"{key}:dirs", [])],
            }
            if cs.get(f"{key}:group"):
                body["animation_group_id"] = cs[f"{key}:group"]
        else:
            body = {"character_id": cid, "template_animation_id": template, "mode": "template", "directions": dirs}
        d = post_retry("/characters/animations", body)
        if d.get("animation_group_id"):
            cs[f"{key}:group"] = d["animation_group_id"]
            save_state()
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
def solid_tile(set_name, side):
    """base64 PNG of a generated set's plain (all-corners-one-terrain) tile.
    To re-roll a set but keep a terrain other sets share, move its json to
    out/tiles/prev/ instead of deleting it: it is read from there."""
    for path in (os.path.join(OUT, "tiles", f"{set_name}.json"), os.path.join(OUT, "tiles", "prev", f"{set_name}.json")):
        try:
            with open(path) as f:
                d = json.load(f)
            break
        except OSError:
            continue
    else:
        return None
    for t in d["tileset"]["tiles"]:
        if all(v == side for v in t["corners"].values()):
            return t["image"]["base64"]
    return None


def tileset(ts):
    name = ts["name"]
    out_json = os.path.join(OUT, "tiles", f"{name}.json")
    if os.path.exists(out_json):
        return
    body = {
        "lower_description": ts["lower"],
        "upper_description": ts["upper"],
        "transition_description": ts.get("transition", ""),
        "tile_size": {"width": 32, "height": 32},
        "transition_size": ts.get("transition_size", 0.0),
        "view": "high top-down",
        "shading": "medium shading",
        "detail": "medium detail",
        "mode": "pro",
        "target_palette": {"colors": spec.PALETTE, "name": "Dungeon of Rhune"},
    }
    for k in ("raggedness", "roundness", "boundary_amplitude", "boundary_seed"):
        if k in ts:
            body[k] = ts[k]
    for side in ("lower", "upper"):
        ref = ts.get(f"{side}_base_from")
        if ref:
            base_id = STATE["tilesets"].get(ref[0], {}).get(f"{ref[1]}_base_tile_id")
            if base_id:
                body[f"{side}_base_tile_id"] = base_id
            solid = solid_tile(ref[0], ref[1])
            if solid:
                body[f"{side}_reference_image"] = {"type": "base64", "base64": solid}
    d = post_retry("/create-tileset", body)
    tid = d["tileset_id"]
    STATE["tilesets"].setdefault(name, {})["id"] = tid
    save_state()
    if d.get("background_job_id"):
        pl.wait_job(d["background_job_id"], label=name)
    for _ in range(120):
        code, res = pl.get(f"/tilesets/{tid}")
        if code == 200 and res and res.get("tileset", {}).get("tiles"):
            break
        time.sleep(6)
    else:
        raise RuntimeError(f"tileset {name} never finished")
    os.makedirs(os.path.dirname(out_json), exist_ok=True)
    meta = res.get("metadata") or {}
    ids = meta.get("terrain_ids") or {}
    STATE["tilesets"][name]["lower_base_tile_id"] = ids.get("lower")
    STATE["tilesets"][name]["upper_base_tile_id"] = ids.get("upper")
    save_state()
    with open(out_json, "w") as f:
        json.dump(res, f)
    log("tileset ok", name, "terrain_ids", ids)


# ------------------------------------------------------------------------ run
def main():
    args = sys.argv[1:]
    only, variants = None, 0
    if "--only" in args:
        i = args.index("--only")
        only = set(args[i + 1].split(","))
        del args[i:i + 2]
    if "--variants" in args:
        i = args.index("--variants")
        variants = int(args[i + 1])
        del args[i:i + 2]
    which = set(args) or {"chars", "tiles", "props", "icons", "rhunes"}
    errors = []
    with ThreadPoolExecutor(max_workers=8) as ex:
        futs = {}
        if "tiles" in which:
            def all_tiles():
                for ts in spec.TILESETS:
                    try:
                        tileset(ts)
                    except Exception as e:  # keep going with the rest
                        errors.append(f"tileset {ts['name']}: {e}")
                        log("ERR tileset", ts["name"], e)
            futs[ex.submit(all_tiles)] = "tiles"
        if "chars" in which:
            # One character at a time: an 8-direction animation needs 8 of the
            # plan's 10 concurrent job slots, so parallel characters starve.
            def all_chars():
                for name, (prompt, anims) in spec.CHARACTERS.items():
                    if only and name not in only:
                        continue
                    try:
                        character(name, prompt, anims)
                    except Exception as e:  # keep going with the rest
                        errors.append(f"char {name}: {e}")
                        log("ERR char", name, e)
            futs[ex.submit(all_chars)] = "chars"
        tasks = []
        if "props" in which:
            tasks += gen_props(only, variants)
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
