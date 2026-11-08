"""
Minimal PixelLab v2 client used by the art pipeline (tools/art/*.py).

Auth: set PIXELLAB_TOKEN in your shell. (In the Claude Code cloud session the
egress proxy injects the token, so the header is optional there.)
"""
import base64
import json
import os
import time
import urllib.error
import urllib.request

BASE = "https://api.pixellab.ai/v2"


def _headers():
    h = {"Content-Type": "application/json"}
    tok = os.environ.get("PIXELLAB_TOKEN")
    if tok:
        h["Authorization"] = f"Bearer {tok}"
    return h


def request(method, path, body=None, timeout=60):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=_headers())
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        try:
            return e.code, json.loads(raw)
        except Exception:
            return e.code, {"raw": raw[:500].decode(errors="replace")}


def post(path, body, timeout=60):
    return request("POST", path, body, timeout)


def get(path, timeout=60):
    return request("GET", path, None, timeout)


def wait_job(job_id, every=6, limit=900, label=""):
    """Poll /background-jobs/{id} until completed/failed. Returns the job JSON."""
    t0 = time.time()
    while True:
        code, d = get(f"/background-jobs/{job_id}")
        st = (d or {}).get("status")
        if st in ("completed", "failed"):
            return d
        if time.time() - t0 > limit:
            raise TimeoutError(f"job {job_id} {label} still {st}")
        time.sleep(every)


def save_b64(b64, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(base64.b64decode(b64))
