// Pure timeline model. Clips are never destroyed by recording: a new pass is appended on top,
// and the newest unmuted clip covering a time wins (punch-in retakes; delete the top clip to revert).
export const newTimeline = () => ({ version: 1, fps: 30, duration: 20, actors: [{ id: 'krush', char: 'krush', name: 'Krush', armed: true, locked: false, muted: false }], clips: [] });

export const clipEnd = (c) => (c.kind === 'perf' ? c.start + (c.out - c.in) : c.end);

export function coverAt(clips, actor, kind, t) {
  for (let i = clips.length - 1; i >= 0; i--) {
    const c = clips[i];
    if (c.actor === actor && c.kind === kind && !c.muted && t >= c.start && t <= clipEnd(c)) return c;
  }
  return null;
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

export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 8)}`;