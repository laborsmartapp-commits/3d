"""Container smoke test: renders the Three.js test scene to MP4 and checks the file with ffprobe.
   GPU machine:      python3 tests/smoke_test.py
   CPU-only CI box:  ALLOW_SOFTWARE_GL=1 python3 tests/smoke_test.py

   Part 2 is the regression test for "Playwright Sync API inside the asyncio loop": it calls the real RunPod
   handler's smoke path from INSIDE a running asyncio event loop, exactly as RunPod Serverless does."""
import asyncio
import inspect
import os
import sys
import tempfile
from pathlib import Path

SRC = Path(__file__).resolve().parent.parent / "src"
sys.path.insert(0, str(SRC))
from encoder import probe  # noqa: E402
from renderer import render_page  # noqa: E402
import handler as H  # noqa: E402

PAGE = (Path(__file__).resolve().parent / "smoke_scene.html").as_uri()
SOFT = os.environ.get("ALLOW_SOFTWARE_GL") == "1"

# 0: no module may use Playwright's sync API.
for f in SRC.glob("*.py"):
    assert "sync_api" not in f.read_text().replace("async_api", ""), f"{f.name} imports playwright.sync_api"
assert inspect.iscoroutinefunction(H.handler), "RunPod handler must be async"


async def direct():
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "smoke.mp4")
        r = await render_page(PAGE, {"seconds": 2}, 1920, 1080, 30, "standard", out, 1000, 60, 120, allow_software=SOFT)
        m = probe(out)
        print({"gl": r["gl"], "backend": r["gl_backend"], **m})
        assert (m["width"], m["height"], m["codec"]) == (1920, 1080, "h264"), m
        assert abs(m["fps"] - 30) < 0.01 and m["frames"] == 60, m
        assert abs(m["duration"] - 2) < 0.1, m


async def via_handler():
    assert asyncio.get_running_loop()  # an event loop is active, like inside RunPod
    res = await H.handler({"id": "ci-smoke", "input": {"smoke_test": True, "seconds": 1, "width": 1280, "height": 720, "fps": 30}})
    print(res)
    assert "error" not in res, res
    assert "Sync API" not in str(res), res
    assert res["ok"] and res["codec"] == "h264" and (res["width"], res["height"]) == (1280, 720), res


asyncio.run(direct())
print("SMOKE TEST PASSED")
asyncio.run(via_handler())
print("ASYNC LOOP REGRESSION TEST PASSED")
# Timeline audio mixing + AAC mux (runs in the CI image build, before the image is pushed).
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import test_audio_mix  # noqa: E402
test_audio_mix.run()