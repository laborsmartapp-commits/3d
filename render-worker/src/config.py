import os

def env(name, default=None):
    v = os.environ.get(name)
    return v if v not in (None, "") else default

APP_URL = env("APP_URL", "https://celestia-grotto-world.base44.app").rstrip("/")
ALLOWED_APP_HOSTS = [h.strip() for h in env("ALLOWED_APP_HOSTS", "celestia-grotto-world.base44.app").split(",") if h.strip()]
STORAGE = {
    "endpoint": env("STORAGE_ENDPOINT"),
    "bucket": env("STORAGE_BUCKET"),
    "region": env("STORAGE_REGION", "auto"),
    "key_id": env("STORAGE_ACCESS_KEY_ID"),
    "secret": env("STORAGE_SECRET_ACCESS_KEY"),
    "prefix": env("STORAGE_PREFIX", "renders"),
}
MAX_FRAMES = int(env("MAX_FRAMES", "36000"))
FRAME_TIMEOUT_S = int(env("FRAME_TIMEOUT_S", "90"))
PAGE_LOAD_TIMEOUT_S = int(env("PAGE_LOAD_TIMEOUT_S", "300"))
ALLOW_SOFTWARE_GL = env("ALLOW_SOFTWARE_GL", "0") == "1"

SIZES = {(1920, 1080), (2560, 1440), (3840, 2160)}
FPS = {24, 30, 60}
PRESETS = {"standard", "high", "ultra", "maximum"}