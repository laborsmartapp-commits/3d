"""RunPod Serverless handler: one Krush Studio render job -> one stored H.264 MP4 master."""
import asyncio
import os
import re
import sys
import tempfile
from pathlib import Path
from urllib.parse import urlparse

import requests
import runpod

sys.path.insert(0, os.path.dirname(__file__))
import config as C  # noqa: E402
from app_api import AppApi  # noqa: E402
from encoder import probe  # noqa: E402
from renderer import render_page  # noqa: E402
from storage import upload  # noqa: E402

SMOKE_PAGE = Path(__file__).resolve().parent.parent / "tests" / "smoke_scene.html"


def validate(inp):
    if not re.fullmatch(r"[A-Za-z0-9]{8,40}", str(inp.get("job_id", ""))):
        raise ValueError("invalid job_id")
    if len(str(inp.get("token", ""))) < 40:
        raise ValueError("missing job token")
    w, h, fps = int(inp["width"]), int(inp["height"]), int(inp["fps"])
    if (w, h) not in C.SIZES or fps not in C.FPS or inp.get("preset") not in C.PRESETS:
        raise ValueError("unsupported resolution / fps / preset")
    app_url = str(inp.get("app_url") or C.APP_URL).rstrip("/")
    if urlparse(app_url).scheme != "https" or urlparse(app_url).hostname not in C.ALLOWED_APP_HOSTS:
        raise ValueError("app_url not allowed")
    return app_url, w, h, fps


async def smoke(job, inp):
    """Renders the bundled Three.js test scene. Proves GPU, browser, ffmpeg (and storage if configured)."""
    w, h, fps = int(inp.get("width", 1920)), int(inp.get("height", 1080)), int(inp.get("fps", 30))
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "smoke.mp4")
        r = await render_page(SMOKE_PAGE.as_uri(), {"seconds": float(inp.get("seconds", 3))}, w, h, fps, "standard", out,
                              C.MAX_FRAMES, C.FRAME_TIMEOUT_S, C.PAGE_LOAD_TIMEOUT_S, C.ALLOW_SOFTWARE_GL)
        meta = await asyncio.to_thread(probe, out)
        uri = await asyncio.to_thread(upload, out, "smoke", job["id"], C.STORAGE) if C.STORAGE["bucket"] else None
        return {"ok": True, "smoke_test": True, **meta, "video_uri": uri, "gpu": r["gl"], "gl_backend": r["gl_backend"]}


def download(url, path):
    with requests.get(url, stream=True, timeout=60) as r:
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)


# Async handler: RunPod awaits it on its own event loop, so no nested/conflicting loop is ever created.
async def handler(job):
    inp = job.get("input") or {}
    if inp.get("smoke_test"):
        try:
            return await smoke(job, inp)
        except Exception as e:
            return {"error": f"smoke test failed: {e}"}
    try:
        app_url, w, h, fps = validate(inp)
    except Exception as e:
        return {"error": f"invalid input: {e}"}
    api = AppApi(app_url, inp["job_id"], inp["token"], job["id"])
    try:
        await asyncio.to_thread(api.call, "claim")  # rejects duplicates / foreign runs before any GPU work
        report = lambda stage, pct, msg: (api.progress(stage, pct, msg), runpod.serverless.progress_update(job, msg))
        await asyncio.to_thread(report, "rendering", 1, "Loading stage")
        with tempfile.TemporaryDirectory() as tmp:
            audio = None
            if inp.get("audio_url"):
                audio = os.path.join(tmp, "audio")
                await asyncio.to_thread(download, inp["audio_url"], audio)
            out = os.path.join(tmp, "master.mp4")
            r = await render_page(f"{app_url}/render", {"job_id": inp["job_id"], "token": inp["token"]}, w, h, fps, inp["preset"], out,
                            C.MAX_FRAMES, C.FRAME_TIMEOUT_S, C.PAGE_LOAD_TIMEOUT_S, C.ALLOW_SOFTWARE_GL, report, audio)
            meta = await asyncio.to_thread(probe, out)
            if (meta["width"], meta["height"], meta["codec"]) != (w, h, "h264"):
                raise RuntimeError(f"Encoded file is {meta['width']}x{meta['height']} {meta['codec']}, expected {w}x{h} h264")
            await asyncio.to_thread(report, "uploading", 96, "Uploading master to storage")
            uri = await asyncio.to_thread(upload, out, inp["job_id"], job["id"], C.STORAGE)
        return {"ok": True, "video_uri": uri, "width": meta["width"], "height": meta["height"], "fps": meta["fps"],
                "duration": meta["duration"], "frames": r["frames"], "bytes": meta["bytes"], "codec": "h264",
                "gpu": r["gl"], "gl_backend": r["gl_backend"], "stage": r["stage"], "actors": r["actors"], "render_seconds": r["render_seconds"]}
    except Exception as e:
        print(f"render failed: {e}")
        await asyncio.to_thread(api.progress, "failed", 0, f"Failed: {str(e)[:150]}")
        return {"error": str(e)[:2000]}


if __name__ == "__main__":
    runpod.serverless.start({"handler": handler})