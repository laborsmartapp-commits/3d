"""Drives a render page frame by frame. Contract with the page:
   window.__krushRender = {frames, fps, width, height, gl, frame(i)}  or  window.__krushRenderError = "msg".
   frame(i) poses the whole scene at exactly t = i / fps on a virtual clock and draws it synchronously,
   so output timing never depends on how long the GPU takes.

   Uses Playwright's ASYNC API: RunPod runs handlers inside an asyncio event loop, where the sync API refuses to start."""
import asyncio
import json
import time

from playwright.async_api import async_playwright

from browser import launch_gpu
from encoder import Encoder


async def render_page(url, init, width, height, fps, preset, out_path, max_frames, frame_timeout_s, load_timeout_s,
                      allow_software=False, on_progress=None, audio_path=None):
    async def progress(*a):
        if on_progress:
            await asyncio.to_thread(on_progress, *a)  # blocking HTTP progress calls stay off the event loop

    async with async_playwright() as p:
        browser, backend, gl = await launch_gpu(p, allow_software)
        try:
            page = await browser.new_page(viewport={"width": width, "height": height}, device_scale_factor=1)
            page.on("console", lambda m: m.type == "error" and print(f"[page] {m.text}"))
            await page.add_init_script(f"window.__KRUSH_RENDER = {json.dumps(init)};")
            await page.goto(url, wait_until="load", timeout=load_timeout_s * 1000)
            await page.wait_for_function("() => window.__krushRender || window.__krushRenderError", timeout=load_timeout_s * 1000)
            err = await page.evaluate("() => window.__krushRenderError || null")
            if err:
                raise RuntimeError(f"Render page failed: {err}")
            info = await page.evaluate("() => { const r = window.__krushRender; return {frames: r.frames, fps: r.fps, width: r.width, height: r.height, gl: r.gl, stage: r.stage, actors: r.actors}; }")
            if (info["width"], info["height"], info["fps"]) != (width, height, fps):
                raise RuntimeError(f"Page configured {info['width']}x{info['height']}@{info['fps']}, expected {width}x{height}@{fps}")
            frames = int(info["frames"])
            if frames < 1 or frames > max_frames:
                raise RuntimeError(f"Frame count {frames} outside 1..{max_frames}")
            enc = Encoder(out_path, fps, preset, audio_path)
            page.set_default_timeout(frame_timeout_s * 1000)
            t0, last = time.time(), 0
            try:
                for i in range(frames):
                    await page.evaluate("i => window.__krushRender.frame(i)", i)
                    png = await page.screenshot(type="png", clip={"x": 0, "y": 0, "width": width, "height": height}, animations="allow")
                    await asyncio.to_thread(enc.write, png)
                    if on_progress and time.time() - last > 5:
                        last = time.time()
                        rate = (i + 1) / max(1e-6, last - t0)
                        await progress("rendering", 90 * (i + 1) / frames, f"Rendering frame {i + 1}/{frames} ({rate:.1f} fps on {gl[:60]})")
                await progress("encoding", 92, "Encoding H.264 master")
                await asyncio.to_thread(enc.close)
            except BaseException:
                enc.abort()
                raise
            return {"frames": frames, "gl": gl, "gl_backend": backend, "stage": info.get("stage"), "actors": info.get("actors"),
                    "render_seconds": round(time.time() - t0, 1)}
        finally:
            await browser.close()