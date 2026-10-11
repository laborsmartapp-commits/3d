"""Container smoke test: renders the Three.js test scene to MP4 and checks the file with ffprobe.
   GPU machine:      python3 tests/smoke_test.py
   CPU-only CI box:  ALLOW_SOFTWARE_GL=1 python3 tests/smoke_test.py"""
import os
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))
from encoder import probe  # noqa: E402
from renderer import render_page  # noqa: E402

PAGE = (Path(__file__).resolve().parent / "smoke_scene.html").as_uri()

with tempfile.TemporaryDirectory() as tmp:
    out = os.path.join(tmp, "smoke.mp4")
    r = render_page(PAGE, {"seconds": 2}, 1920, 1080, 30, "standard", out, 1000, 60, 120,
                    allow_software=os.environ.get("ALLOW_SOFTWARE_GL") == "1")
    m = probe(out)
    print({"gl": r["gl"], "backend": r["gl_backend"], **m})
    assert (m["width"], m["height"], m["codec"]) == (1920, 1080, "h264"), m
    assert abs(m["fps"] - 30) < 0.01 and m["frames"] == 60, m
    assert abs(m["duration"] - 2) < 0.1, m
    print("SMOKE TEST PASSED")