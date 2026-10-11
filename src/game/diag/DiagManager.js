import { metrics } from './metrics';
import { TESTS } from './tests';
import { net } from '../studio/net';

export { MAX_STEPS } from '../core/step';
const RES_KEY = 'diag.results';

// Admin-only diagnostics. Every hook is a single boolean check while disabled.
export class DiagManager {
  constructor(e) {
    this.e = e; this.enabled = false; this.throttle = false; this.target = 15; this.script = null; this.running = null;
    this.results = JSON.parse(localStorage.getItem(RES_KEY) || '{}');
    this.reset();
  }

  reset() { Object.assign(this, { ft: [], dropped: 0, lastDropped: 0, steps: 0, simT: 0, wallT0: performance.now(), dist: 0, last: null, lastR: 0, behindAt: 0 }); }

  setEnabled(on) {
    if (on && !this.e.isAdmin) return false;
    if (!on && this.running) return false;
    this.enabled = on; this.throttle = false; this.script = null; this.reset();
    this.e.emit({ diag: on });
    return true;
  }

  setThrottle(on, fps = 15) { this.throttle = on && this.enabled; this.target = fps; this.reset(); }

  skipFrame() {
    if (!this.enabled || !this.throttle) return false;
    const t = performance.now();
    if (t - this.lastR < 1000 / this.target - 4) return true;
    this.lastR = t; return false;
  }

  // Scripted input for repeatable tests (identical timings across runs).
  input(inp) {
    if (!this.enabled || !this.script) return inp;
    const m = this.script(performance.now() / 1000);
    return { ...inp, move: m.move || { x: 0, y: 0 }, sprint: !!m.sprint, walk: !!m.walk, jump: !!m.jump, interact: false };
  }

  frame(delta, raw, steps) {
    this.ft.push(delta * 1000); if (this.ft.length > 300) this.ft.shift();
    this.steps = steps; this.simT += raw; this.lastDropped = delta - raw; this.dropped += delta - raw;
    if (delta > raw) this.behindAt = performance.now();
    const p = this.e.player.pos;
    if (this.last) this.dist += Math.hypot(p.x - this.last.x, p.z - this.last.z); else this.last = p.clone();
    this.last.copy(p);
  }

  metrics() { return metrics(this); }

  setResult(id, r) { this.results[id] = { ...r, at: new Date().toISOString() }; localStorage.setItem(RES_KEY, JSON.stringify(this.results)); }
  clearResults() { this.results = {}; localStorage.removeItem(RES_KEY); }

  async run(id) {
    const S = this.e.studio, test = TESTS.find((t) => t.id === id);
    if (!this.enabled || this.running || !test?.run) return;
    if (S.busy) return this.setResult(id, { status: 'INCONCLUSIVE', note: 'Studio is busy (recording or playing). Stop it and run again.' });
    if (this.e.mode !== 'play') this.e.setMode('play');
    this.running = id; this.setResult(id, { status: 'RUNNING' });
    const p = this.e.player, home = { x: p.pos.x, z: p.pos.z, yaw: p.yaw }, prevScene = S.scene;
    try { this.setResult(id, await test.run(this.e)); }
    catch (err) { this.setResult(id, { status: 'FAIL', note: `Error: ${err.message}` }); }
    finally {
      this.script = null; this.throttle = false; net.failUploads = false;
      if (S.status === 'review' || S.status === 'pending') await S.discardTake();
      if (S.status === 'playing') S.stopPlayback();
      p.teleport(home.x, home.z); p.yaw = home.yaw;
      if (prevScene && S.scene?.id !== prevScene.id) S.openScene(prevScene);
      this.running = null;
    }
  }
}