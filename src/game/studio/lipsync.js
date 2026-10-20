// Mouth curves for dialogue clips. With provider timing (character alignment) each spoken letter sets the mouth
// shape and the audio loudness scales it; preset voices (no timing data) use the loudness envelope alone.
const OPEN = { a: 1, o: 0.9, e: 0.7, i: 0.55, u: 0.5, y: 0.5, h: 0.4, r: 0.35, l: 0.35, w: 0.3, m: 0, b: 0, p: 0, f: 0.15, v: 0.15 };
const visOf = (ch) => { const c = (ch || '').toLowerCase(); return c in OPEN ? OPEN[c] : /\p{L}/u.test(c) ? 0.3 : 0; };

export function lipCurve(buf, al, fps = 30) {
  const n = Math.ceil(buf.duration * fps), d = buf.getChannelData(0), sr = buf.sampleRate, env = [];
  for (let i = 0; i < n; i++) {
    let s = 0, c = 0;
    for (let j = Math.floor((i / fps) * sr), e = Math.min(d.length, Math.floor(((i + 1) / fps) * sr)); j < e; j += 4) { s += d[j] * d[j]; c++; }
    env.push(Math.sqrt(s / (c || 1)));
  }
  const ref = [...env].sort((x, y) => x - y)[Math.floor(n * 0.9)] || 1;
  let vis = null;
  if (al?.characters?.length) {
    vis = new Array(n).fill(0);
    al.characters.forEach((ch, k) => {
      const v = visOf(ch); if (!v) return;
      for (let i = Math.floor(al.character_start_times_seconds[k] * fps), e = Math.min(n - 1, Math.ceil(al.character_end_times_seconds[k] * fps)); i <= e; i++) vis[i] = Math.max(vis[i], v);
    });
  }
  return { fps, timed: !!vis, v: env.map((x, i) => { const a = Math.min(1, x / ref), m = vis ? vis[i] * (0.35 + 0.65 * a) : Math.max(0, (a - 0.12) / 0.88); return Math.round(m * 100) / 100; }) };
}

// Word timings for dialogue sync / subtitles: [{w, s, e}] in clip-local seconds.
export function wordsOf(al) {
  if (!al?.characters?.length) return [];
  const out = []; let w = '', s = 0;
  al.characters.forEach((ch, k) => {
    if (/\s/.test(ch)) { if (w) out.push({ w, s, e: +al.character_end_times_seconds[k - 1].toFixed(3) }); w = ''; return; }
    if (!w) s = +al.character_start_times_seconds[k].toFixed(3);
    w += ch;
  });
  if (w) out.push({ w, s, e: +al.character_end_times_seconds.at(-1).toFixed(3) });
  return out;
}

// Mouth opening + emotion for one actor at timeline time t, from its dialogue clips.
export function mouthAt(clips, actor, t) {
  for (const c of clips) {
    if (c.kind !== 'audio' || c.actor !== actor || !c.lips || c.muted || t < c.start || t >= c.end) continue;
    const f = (c.in + (t - c.start) * (c.speed || 1)) * c.lips.fps, i = Math.floor(f), v = c.lips.v;
    if (i >= v.length) continue;
    return { mouth: v[i] + ((v[i + 1] ?? v[i]) - v[i]) * (f - i), emotion: c.emotion || null };
  }
  return { mouth: 0, emotion: null };
}