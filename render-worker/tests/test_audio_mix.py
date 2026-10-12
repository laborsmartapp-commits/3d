"""Offline audio-mix tests with generated tones (needs ffmpeg, no network, no GPU)."""
import os
import subprocess
import sys
import tempfile

import math
from array import array

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))
from audio_mix import SR, build_mix, mux, probe_audio  # noqa: E402


def tone(path, freq, secs):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", f"sine=frequency={freq}:sample_rate=44100:duration={secs}",
                    "-ac", "2", path], check=True)


def pcm(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    a = array("f")
    a.frombytes(raw)
    return list(zip(a[0::2], a[1::2]))


def rms(x, a, b, ch=None):
    s = x[int(a * SR):int(b * SR)]
    v = [q for f in s for q in f] if ch is None else [f[ch] for f in s]
    return math.sqrt(sum(q * q for q in v) / len(v)) if v else 0.0


def clip(i, url, **kw):
    base = dict(id=f"c{i}", url=url, track="music", start=0, end=1, in_=0, len=2, speed=1, loop=False, gain=1, pan=0, fade_in=0, fade_out=0)
    base.update(kw)
    base["in"] = base.pop("in_")
    return base


def run():
    with tempfile.TemporaryDirectory() as tmp:
        a, b = os.path.join(tmp, "a.wav"), os.path.join(tmp, "b.wav")
        tone(a, 440, 2)
        tone(b, 880, 0.5)
        D = 4.0
        arr = {"master_gain": 1, "clips": [
            clip(0, a, start=0.5, end=2.5),                         # placement
            clip(1, b, start=1.0, end=3.0, loop=True, len=0.5),       # loops 4x, overlaps clip 0
            clip(2, a, start=3.0, end=3.8, fade_in=0.4, gain=0.5, pan=-1),  # fade + gain + hard-left pan
        ]}
        wav = build_mix(arr, D, tmp)
        x = pcm(wav)
        assert abs(len(x) / SR - D) < 0.002, f"mix duration {len(x) / SR}"
        assert rms(x, 0, 0.45) < 1e-4, "silence before first clip"
        assert rms(x, 0.6, 0.9) > 0.3, "clip 0 placed at 0.5s"
        assert rms(x, 1.1, 2.4) > rms(x, 0.6, 0.9) * 1.2, "overlap mixes (louder than one clip)"
        assert rms(x, 2.6, 2.9) > 0.3, "looped clip continues past its 0.5s source"
        assert rms(x, 3.0, 3.1) < rms(x, 3.5, 3.7) * 0.5, "fade-in ramps up"
        assert rms(x, 3.5, 3.7, 1) < 1e-3 < rms(x, 3.5, 3.7, 0), "pan -1 is left only"
        assert rms(x, 3.85, 4.0) < 1e-4, "silence after last clip"
        # Speed 2: a 2 s file trimmed in by 1 s lasts 0.5 s on the timeline.
        w2 = build_mix({"clips": [clip(0, a, start=0, end=2, in_=1, speed=2)]}, 2.0, tmp)
        y = pcm(w2)
        assert rms(y, 0.05, 0.45) > 0.3 and rms(y, 0.55, 1.5) < 1e-4, "trim + speed"
        # AAC mux: exact duration, 48 kHz stereo, aligned with video.
        v = os.path.join(tmp, "v.mp4")
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=black:s=320x240:r=30:d=4",
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", v], check=True)
        out = os.path.join(tmp, "o.mp4")
        mux(v, wav, out, 3.5)
        m = probe_audio(out)
        assert m["audio"] and m["audio_codec"] == "aac" and m["audio_sample_rate"] == SR and m["audio_channels"] == 2, m
        assert abs(m["audio_duration"] - 3.5) < 0.05 and abs(m["av_offset_ms"]) <= 25, m
        # Silent legacy take: nothing to mix.
        assert build_mix({"clips": []}, 2.0, tmp) is None
        assert probe_audio(v) == {"audio": False}
    print("AUDIO MIX TESTS PASSED")


if __name__ == "__main__":
    run()