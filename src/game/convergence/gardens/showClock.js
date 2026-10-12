// The Water Theatre's authoritative show clock. Every visitor derives the same phase from
// wall-clock time + shared settings, so a late joiner lands mid-show instead of restarting it.
// OFF → STARTING → SHOW → STOPPING → OFF (with a low AMBIENT flow between shows).
export const GROUPS = ['columns', 'crown', 'arcs', 'fans', 'chase', 'bubblers', 'curtain'];
export const GROUP_LABELS = { columns: 'Tall columns', crown: 'Crown ring', arcs: 'Crossing arcs', fans: 'Fan jets', chase: 'Canal chasers', bubblers: 'Bubblers', curtain: 'Water curtain' };
export const DEFAULTS = { master: true, schedule: true, interval_s: 360, duration_s: 90, intensity: 1, groups: Object.fromEntries(GROUPS.map((g) => [g, true])), manual_start_at: null, manual_stop_at: null };

export const RAMP = 10, SETTLE = 12;
// Three compositions then a crescendo. Values are group targets 0..1 while that cue plays.
export const COMPOSITIONS = [
  { name: 'Celestial Columns', levels: { columns: 1, crown: 0.8, bubblers: 0.6, curtain: 0.5 } },
  { name: 'Crossing Arcs', levels: { arcs: 1, chase: 1, crown: 0.4, bubblers: 0.8, columns: 0.3 } },
  { name: 'Fans & Curtains', levels: { fans: 1, curtain: 1, arcs: 0.5, bubblers: 1, chase: 0.6 } },
];
const CRESCENDO = { name: 'Crescendo', levels: Object.fromEntries(GROUPS.map((g) => [g, 1])) };
const AMBIENT = { bubblers: 0.5, curtain: 0.35, chase: 0.25 };

export function cueAt(u, dur) {
  const body = dur - RAMP - SETTLE, cres = Math.min(12, body * 0.18), seg = (body - cres) / 3, v = u - RAMP;
  if (v < 0) return { ...COMPOSITIONS[0], index: 0 };
  if (v >= body - cres) return { ...CRESCENDO, index: 3 };
  const i = Math.min(2, Math.floor(v / seg));
  return { ...COMPOSITIONS[i], index: i };
}

// Returns { phase, u, cue, nextAt, levels } for the given ms timestamp.
export function showState(cfg, now) {
  const c = { ...DEFAULTS, ...cfg, groups: { ...DEFAULTS.groups, ...(cfg?.groups || {}) } };
  const dur = Math.max(40, c.duration_s), iv = (c.gap_s != null ? dur + c.gap_s : Math.max(dur + 30, c.interval_s)) * 1000;
  let start = null;
  if (c.manual_start_at && now - c.manual_start_at < dur * 1000) start = c.manual_start_at;
  else if (c.schedule) start = Math.floor(now / iv) * iv;
  const nextAt = c.schedule ? Math.ceil(now / iv) * iv : null;
  const stopped = c.manual_stop_at && start !== null && c.manual_stop_at >= start;
  const pick = (lv) => Object.fromEntries(GROUPS.map((g) => [g, c.groups[g] ? (lv[g] || 0) * c.intensity : 0]));
  if (!c.master) return { phase: 'OFF', u: 0, cue: null, nextAt: null, levels: pick({}) };
  const u = start === null ? Infinity : (now - start) / 1000;
  if (stopped || u >= dur) return { phase: 'OFF', u, cue: null, nextAt, levels: pick(AMBIENT), ambient: true };
  const cue = cueAt(u, dur);
  const phase = u < RAMP ? 'STARTING' : u > dur - SETTLE ? 'STOPPING' : 'SHOW';
  // Starting: small jets first, larger groups join progressively. Stopping: everything eases down.
  const ORDER = { bubblers: 0, curtain: 0.15, chase: 0.3, crown: 0.45, arcs: 0.55, fans: 0.65, columns: 0.8 };
  const levels = pick(cue.levels);
  for (const g of GROUPS) {
    if (phase === 'STARTING') levels[g] *= Math.min(1, Math.max(0, (u / RAMP - ORDER[g]) / 0.35 + 0.15));
    if (phase === 'STOPPING') levels[g] *= Math.max(0, (dur - u) / SETTLE);
  }
  return { phase, u, cue, nextAt, levels };
}