import { studioSettings } from '@/lib/studioSettings';
// Pure timeline model with track-specific evaluation.
// - Movement ('perf') track: owns the world transform. One active take at a time: highest priority wins,
//   ties go to the newest pass (punch-in retakes); disable or delete it to fall back to the take below.
// - Body animation ('anim') track: never touches the root transform (root motion = 'ignore'). Every active clip
//   becomes a weighted pose layer, ordered by priority then position, with blend-in/out, speed, trim and loops.
export const newTimeline = () => ({ version: 2, fps: studioSettings().default_fps, duration: 20, actors: [{ id: 'krush', char: 'krush', name: 'Krush', armed: true, locked: false, muted: false }], clips: [] });

export const ANIM_DEFAULTS = { speed: 1, in: 0, loops: 0, weight: 1, blendIn: 0.25, blendOut: 0.25, priority: 0, rootMotion: 'ignore' };
export const animClip = (c) => ({ ...ANIM_DEFAULTS, ...c });

// loops: 0 = repeat until the clip ends; N = play the (trimmed) cycle N times, then hold the last frame.
export const clipEnd = (c) => (c.kind === 'perf' ? c.start + (c.out - c.in) : c.end);

export function coverAt(clips, actor, kind, t) {
  let best = null, bi = -1;
  clips.forEach((c, i) => {
    if (c.actor !== actor || c.kind !== kind || c.muted || t < c.start || t > clipEnd(c)) return;
    if (!best || (c.priority || 0) > (best.priority || 0) || ((c.priority || 0) === (best.priority || 0) && i > bi)) { best = c; bi = i; }
  });
  return best;
}

// When no performance covers t, hold the pose from the nearest clip (end of the last earlier one, else start of the first).
export function holdAt(clips, actor, t) {
  let best = null, first = null;
  for (const c of clips) {
    if (c.actor !== actor || c.kind !== 'perf' || c.muted) continue;
    if (clipEnd(c) < t && (!best || clipEnd(c) > clipEnd(best))) best = c;
    if (!first || c.start < first.start) first = c;
  }
  if (best) return { c: best, local: best.out };
  return first ? { c: first, local: first.in } : null;
}

// Local animation time and blend weight of one body clip at master time t (null when inactive).
export function animSample(c0, t) {
  const c = animClip(c0);
  if (c.muted || t < c.start || t > c.end) return null;
  const el = (t - c.start) * c.speed, cycle = c.len ? Math.max(0.05, c.len - c.in) : Infinity;
  const local = c.in + (c.loops > 0 ? Math.min(el, cycle * c.loops - 1e-3) % cycle : el % cycle);
  const fi = c.blendIn > 0 ? (t - c.start) / c.blendIn : 1, fo = c.blendOut > 0 ? (c.end - t) / c.blendOut : 1;
  const w = Math.max(0, Math.min(1, fi, fo)) * c.weight;
  return w > 0 ? { mode: c.anim, t: local, w, priority: c.priority } : null;
}

export function animLayers(clips, actor, t) {
  const out = [];
  clips.forEach((c, i) => { if (c.actor === actor && c.kind === 'anim') { const s = animSample(c, t); if (s) out.push({ ...s, i }); } });
  return out.sort((a, b) => a.priority - b.priority || a.i - b.i);
}

export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;