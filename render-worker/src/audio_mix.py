"""Rebuilds a take's audio timeline offline with FFmpeg (never from speakers) and muxes it under the video.

Each clip mirrors the browser's Web Audio playback: trim-in, loop region [in, end of file], playbackRate
(speed + pitch, like AudioBufferSourceNode), gain, pan, linear fades, placed at its timeline start.
"""
import json
import math
import os
import shutil
import subprocess
import time

import requests

SR = 48000


def _download(clip, path, refresh):
    """3 attempts with backoff; an expired/denied link (401/403) is re-signed via `refresh`."""
    url, err = clip["url"], None
    for attempt in range(3):
        try:
            return _fetch(url, path)
        except requests.HTTPError as e:
            err = e
            if e.response is not None and e.response.status_code in (401, 403) and refresh:
                url = next((c["url"] for c in refresh().get("clips", []) if c["id"] == clip["id"]), url)
        except requests.RequestException as e:
            err = e
        time.sleep(2 ** attempt)
    raise RuntimeError(f"Audio clip {clip['id']} could not be downloaded: {err}")


def _fetch(url, path):
    if os.path.exists(url):  # local file (worker tests)
        shutil.copyfile(url, path)
        return
    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(path, "wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)


def _chain(i, c, duration):
    start = max(0.0, c["start"])
    span = min(c["end"], duration) - start
    if span <= 0.01:
        return None
    f = [f"[{i}:a]aresample={SR},aformat=sample_fmts=fltp:channel_layouts=stereo",
         f"atrim=start={c['in']:.6f}", "asetpts=PTS-STARTPTS"]
    if c["loop"] and c["len"] > c["in"]:
        f.append(f"aloop=loop=-1:size={int((c['len'] - c['in']) * SR)}")
    if abs(c["speed"] - 1) > 1e-4:  # playbackRate changes speed and pitch together, as in the browser
        f += [f"asetrate={SR * c['speed']:.3f}", f"aresample={SR}"]
    f += [f"atrim=duration={span:.6f}", "asetpts=PTS-STARTPTS", f"volume={max(0.0, c['gain']):.4f}"]
    if c["fade_in"] > 0:
        f.append(f"afade=t=in:st=0:d={min(c['fade_in'], span):.4f}:curve=tri")
    if c["fade_out"] > 0:
        d = min(c["fade_out"], span)
        f.append(f"afade=t=out:st={span - d:.4f}:d={d:.4f}:curve=tri")
    p = max(-1.0, min(1.0, c["pan"]))
    if p < 0:  # Web Audio StereoPannerNode on stereo input (equal-power), so cloud matches the studio
        x = (p + 1) * math.pi / 2
        f.append(f"pan=stereo|c0=c0+{math.cos(x):.5f}*c1|c1={math.sin(x):.5f}*c1")
    elif p > 0:
        x = p * math.pi / 2
        f.append(f"pan=stereo|c0={math.cos(x):.5f}*c0|c1=c1+{math.sin(x):.5f}*c0")
    ms = int(round(start * 1000))
    f.append(f"adelay={ms}|{ms}")
    return ",".join(f) + f"[a{i}]"


def build_mix(arr, duration, tmp, refresh=None):
    """Returns a 48 kHz stereo WAV exactly `duration` seconds long, or None when the take has no audio."""
    clips = [c for c in arr.get("clips", []) if c.get("url")]
    if not clips:
        return None
    files, inputs = {}, []
    for c in clips:
        if c["url"] not in files:
            files[c["url"]] = os.path.join(tmp, f"src{len(files)}")
            _download(c, files[c["url"]], refresh)
    chains = []
    for c in clips:
        ch = _chain(len(inputs), c, duration)
        if ch:
            chains.append((len(inputs), ch))
            inputs += ["-i", files[c["url"]]]
    if not chains:
        return None
    labels = "".join(f"[a{i}]" for i, _ in chains)
    graph = ";".join(ch for _, ch in chains) + f";{labels}amix=inputs={len(chains)}:normalize=0:dropout_transition=0," \
        f"volume={float(arr.get('master_gain', 1)):.4f},apad,atrim=duration={duration:.6f}[out]"
    out = os.path.join(tmp, "mix.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", graph, "-map", "[out]",
                    "-ar", str(SR), "-ac", "2", "-c:a", "pcm_s16le", out], check=True, capture_output=True)
    return out


def mux(video, wav, out, duration):
    """Copies the H.264 stream untouched and adds AAC 48 kHz stereo. MP4 edit lists cancel AAC priming delay."""
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", video, "-i", wav, "-map", "0:v:0", "-map", "1:a:0",
                    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", str(SR), "-ac", "2", "-t", f"{duration:.6f}",
                    "-movflags", "+faststart", out], check=True, capture_output=True)


def probe_audio(path):
    """Audio stream facts plus its start offset vs. the video stream (alignment check)."""
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,sample_rate,channels,start_time,duration",
                        "-of", "json", path], capture_output=True, text=True, check=True)
    s = json.loads(r.stdout)["streams"]
    v = next((x for x in s if x["codec_type"] == "video"), {})
    a = next((x for x in s if x["codec_type"] == "audio"), None)
    if not a:
        return {"audio": False}
    off = float(a.get("start_time") or 0) - float(v.get("start_time") or 0)
    return {"audio": True, "audio_codec": a["codec_name"], "audio_sample_rate": int(a["sample_rate"]), "audio_channels": int(a["channels"]),
            "audio_duration": round(float(a.get("duration") or 0), 3), "av_offset_ms": round(off * 1000, 1)}