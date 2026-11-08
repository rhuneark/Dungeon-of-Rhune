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
def map_object(name, w, h, prompt, out_path, view="high top-down"):
    if os.path.exists(out_path):
        return
    d = post_retry("/map-objects", {
        "description": prompt,
        "image_size": {"width": w, "height": h},
        "view": view,
        "outline": "single color outline",
        "shading": "medium shading",
        "detail": "medium detail",
    })
    job = pl.wait_job(d["background_job_id"], label=name)
    if job["status"] != "completed":
        raise RuntimeError(f"{name} failed: {str(job)[:300]}")
    pl.save_b64(job["last_response"]["image"], out_path)
    log("ok", name)


def gen_props():
    tasks = []
    for name, (w, h, prompt) in spec.PROPS.items():
        tasks.append((name, w, h, f"{prompt}, {spec.PROP_STYLE}", os.path.join(OUT, "props", f"{name}.png"), "high top-down"))
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
    }
    for side in ("lower", "upper"):
        ref = ts.get(f"{side}_base_from")
        if ref:
            base_id = STATE["tilesets"].get(ref[0], {}).get(f"{ref[1]}_base_tile_id")
            if base_id:
                body[f"{side}_base_tile_id"] = base_id
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
    which = set(sys.argv[1:]) or {"chars", "tiles", "props", "icons", "rhunes"}
    errors = []
    with ThreadPoolExecutor(max_workers=6) as ex:
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
