"""Headless Chromium with GPU WebGL (Playwright async API). Tries several GL backends and keeps the first hardware one."""
import os

BASE_ARGS = ["--no-sandbox", "--ignore-gpu-blocklist", "--enable-gpu", "--enable-gpu-rasterization",
             "--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--hide-scrollbars", "--mute-audio"]
GL_BACKENDS = [
    ("angle-vulkan", ["--use-angle=vulkan", "--enable-features=Vulkan", "--disable-vulkan-surface"]),
    ("angle-egl", ["--use-gl=angle", "--use-angle=gl-egl"]),
    ("egl", ["--use-gl=egl"]),
]
SOFTWARE = ("swiftshader", "llvmpipe", "software", "basic render")

GL_PROBE = """() => { const c = document.createElement('canvas'); const gl = c.getContext('webgl2') || c.getContext('webgl');
  if (!gl) return null; const x = gl.getExtension('WEBGL_debug_renderer_info');
  return x ? gl.getParameter(x.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER); }"""


def is_software(renderer):
    return not renderer or any(s in renderer.lower() for s in SOFTWARE)


async def launch_gpu(p, allow_software=False):
    """Returns (browser, backend_name, gl_renderer_string)."""
    forced = os.environ.get("CHROME_GL_BACKEND")
    tried = []
    for name, args in GL_BACKENDS:
        if forced and name != forced:
            continue
        browser = await p.chromium.launch(headless=True, channel="chromium", args=BASE_ARGS + args)
        page = await browser.new_page()
        renderer = await page.evaluate(GL_PROBE)
        await page.close()
        tried.append(f"{name}: {renderer}")
        if not is_software(renderer):
            return browser, name, renderer
        if allow_software and renderer:
            return browser, name, renderer
        await browser.close()
    raise RuntimeError("No hardware WebGL available. Tried " + "; ".join(tried))