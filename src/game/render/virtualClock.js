// Deterministic time for offline rendering. After takeover(), performance.now/Date.now return a
// virtual clock and requestAnimationFrame callbacks only run when flush() is called, so every frame is
// simulated at exactly t = i / fps no matter how long the GPU takes to draw it.
export function installVirtualClock(seed = 'krush') {
  const realNow = performance.now.bind(performance), realDate = Date.now, realRaf = window.requestAnimationFrame.bind(window), realCancel = window.cancelAnimationFrame.bind(window);
  let manual = false, vt = 0, base = 0, queue = [], nextId = 1e9;
  performance.now = () => (manual ? vt : realNow());
  Date.now = () => (manual ? Math.round(base + vt) : realDate());
  window.requestAnimationFrame = (cb) => { if (!manual) return realRaf(cb); const id = nextId++; queue.push({ id, cb }); return id; };
  window.cancelAnimationFrame = (id) => { queue = queue.filter((q) => q.id !== id); realCancel(id); };
  let h = 1779033703;
  for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 3432918353);
  Math.random = () => { h = (h + 0x6d2b79f5) | 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return {
    takeover() { vt = realNow(); base = realDate() - vt; manual = true; },
    get now() { return vt; },
    set(ms) { vt = ms; },
    flush() { const q = queue; queue = []; for (const { cb } of q) cb(vt); return q.length; },
  };
}