"""FFmpeg H.264 MP4 encoding from a PNG frame pipe, plus ffprobe verification."""
import json
import subprocess

CRF = {"standard": 20, "high": 18, "ultra": 16, "maximum": 14}
SPEED = {"standard": "medium", "high": "slow", "ultra": "slow", "maximum": "slower"}


class Encoder:
    def __init__(self, out_path, fps, preset, audio_path=None):
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(fps), "-c:v", "png", "-i", "-"]
        if audio_path:
            cmd += ["-i", audio_path]
        cmd += ["-c:v", "libx264", "-preset", SPEED[preset], "-crf", str(CRF[preset]), "-pix_fmt", "yuv420p",
                "-r", str(fps), "-movflags", "+faststart"]
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"] if audio_path else ["-an"]
        cmd.append(out_path)
        self.proc = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
        self.frames = 0

    def write(self, png_bytes):
        self.proc.stdin.write(png_bytes)
        self.frames += 1

    def close(self):
        self.proc.stdin.close()
        err = self.proc.stderr.read().decode(errors="replace")
        if self.proc.wait() != 0:
            raise RuntimeError(f"ffmpeg failed: {err[-800:]}")

    def abort(self):
        try:
            self.proc.kill()
        except Exception:
            pass


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                          "stream=codec_name,width,height,r_frame_rate,nb_frames:format=duration,size",
                          "-of", "json", path], capture_output=True, text=True, check=True)
    j = json.loads(out.stdout)
    s, f = j["streams"][0], j["format"]
    num, den = s["r_frame_rate"].split("/")
    return {"codec": s["codec_name"], "width": int(s["width"]), "height": int(s["height"]),
            "fps": round(int(num) / int(den), 3), "frames": int(s.get("nb_frames") or 0),
            "duration": round(float(f["duration"]), 3), "bytes": int(f["size"])}