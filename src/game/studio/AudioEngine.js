import { base44 } from '@/api/base44Client';

// Web Audio playback for timeline audio clips. The AudioContext clock is the master clock while playing:
// every clip is scheduled from the same timeline position, so overlapping clips mix and seek together.
const buffers = new Map(); // uri -> Promise<AudioBuffer> (decoded once, reused across passes and scenes)
export const AUDIO_TRACKS = [['music', 'Music'], ['dialogue', 'Dialogue'], ['sfx', 'Sound Effects'], ['ambient', 'Ambience']];
export const AUDIO_DEFAULTS = { in: 0, gain: 1, pan: 0, fadeIn: 0, fadeOut: 0, speed: 1, loop: false, solo: false, muted: false };

let ctx;
export const audioCtx = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

export function loadBuffer(uri) {
  if (!buffers.has(uri)) {
    const p = (/^https?:/.test(uri) ? Promise.resolve(uri) : base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => r.signed_url))
      .then((u) => fetch(u)).then((r) => r.arrayBuffer()).then((b) => audioCtx().decodeAudioData(b));
    p.catch(() => buffers.delete(uri));
    buffers.set(uri, p);
  }
  return buffers.get(uri);
}

// Compact peak data (stored on the clip) so the waveform never needs the file re-decoded to draw.
export function peaksOf(buf, n = 800) {
  const d = buf.getChannelData(0), step = Math.max(1, Math.floor(d.length / n)), out = [];
  for (let i = 0; i < n; i++) { let m = 0; for (let j = i * step, e = Math.min(d.length, j + step); j < e; j += 8) m = Math.max(m, Math.abs(d[j])); out.push(+m.toFixed(3)); }
  return out;
}

export class AudioEngine {
  constructor() { this.nodes = []; this.playing = false; }
  get ctx() { return audioCtx(); }
  unlock() { return this.ctx.resume(); } // must be called from a user gesture (autoplay rules)

  // Timeline time from the audio clock (does not slow down when frames drop).
  time() { return this.t0 + Math.max(0, this.ctx.currentTime - this.c0); }

  // Decode every referenced file up front so start() schedules synchronously from one clock reading.
  async preload(clips) {
    const m = new Map();
    await Promise.all([...new Set(clips.filter((c) => c.kind === 'audio' && c.uri).map((c) => c.uri))].map(async (u) => m.set(u, await loadBuffer(u).catch(() => null))));
    this.ready = m;
  }

  start(clips, master = 1, t) {
    this.stop();
    const ctx = this.ctx, list = clips.filter((c) => c.kind === 'audio' && c.uri), solo = list.some((c) => c.solo);
    this.out = ctx.createGain(); this.out.gain.value = master; this.out.connect(ctx.destination);
    this.t0 = t; this.c0 = ctx.currentTime + 0.05; this.playing = true;
    for (const c0 of list) {
      const c = { ...AUDIO_DEFAULTS, ...c0 };
      if (c.muted || (solo && !c.solo) || t >= c.end) continue;
      const buf = this.ready?.get(c.uri); if (!buf) continue;
      const from = Math.max(t, c.start), when = this.c0 + (from - t), span = c.end - from;
      let off = c.in + (from - c.start) * c.speed;
      const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = c.speed;
      if (c.loop) { src.loop = true; src.loopStart = c.in; src.loopEnd = buf.duration; const cyc = buf.duration - c.in; off = c.in + ((off - c.in) % cyc); }
      else if (off >= buf.duration) continue;
      const g = ctx.createGain(), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const env = (u) => c.gain * Math.max(0, Math.min(1, c.fadeIn > 0 ? (u - c.start) / c.fadeIn : 1, c.fadeOut > 0 ? (c.end - u) / c.fadeOut : 1));
      const at = (u) => this.c0 + (u - t);
      g.gain.setValueAtTime(env(from), when);
      const fiEnd = c.start + c.fadeIn, foStart = c.end - c.fadeOut;
      if (c.fadeIn > 0 && fiEnd > from) g.gain.linearRampToValueAtTime(env(fiEnd), at(fiEnd));
      if (c.fadeOut > 0) { if (foStart > from) g.gain.setValueAtTime(env(foStart), at(foStart)); g.gain.linearRampToValueAtTime(0, at(c.end)); }
      src.connect(g); if (pan) { pan.pan.value = c.pan; g.connect(pan); pan.connect(this.out); } else g.connect(this.out);
      src.start(when, off); src.stop(when + span);
      this.nodes.push(src);
    }
  }

  stop() {
    this.playing = false;
    for (const n of this.nodes) { try { n.stop(); } catch { /* already stopped */ } }
    this.nodes = []; this.out?.disconnect(); this.out = null;
  }
}