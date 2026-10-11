import { base44 } from '@/api/base44Client';

const r3 = (v) => +v.toFixed(3), r4 = (v) => +v.toFixed(4);
const MAX_HZ = 60, FLUSH_EVERY = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Monotonic wall clock (seconds). Never derived from the render loop's dt.
export const now = () => performance.now() / 1000;

// Network-tolerant, idempotent save: each chunk has a stable key, so a retry after a
// "failed" request that actually landed overwrites instead of duplicating.
async function saveChunk(data, n = 0) {
  try { return await base44.entities.PerformanceChunk.upsert([data], { key: 'chunk_key' }); }
  catch (err) { if (n >= 4) throw err; await sleep(800 * 2 ** n); return saveChunk(data, n + 1); }
}

// Captures the performance against real elapsed time. Samples are taken whenever a frame
// happens (capped at 60 Hz); each carries its true timestamp, so sparse frames stay sparse
// and the renderer interpolates between them at its own output rate.
export class PerformanceRecorder {
  constructor(e) { this.e = e; this.active = false; this.t = 0; }

  start() {
    Object.assign(this, { active: true, takeId: null, t0: now(), t: 0, last: -1, lastFlush: 0, buf: [], events: [], chunks: 0, count: 0, pending: [], unsent: [], lastW: null, lastM: null, maxGap: 0, failed: 0 });
  }

  tick() { if (this.active) this.t = now() - this.t0; }

  sample(cam, env, force = false) {
    if (!this.active) return;
    this.tick();
    if (!force && this.t - this.last < 1 / MAX_HZ - 1e-4) return;
    if (this.last >= 0) this.maxGap = Math.max(this.maxGap, this.t - this.last);
    this.last = this.t;
    const p = this.e.player, t = r4(this.t);
    if (env.w !== this.lastW) { this.events.push({ t, type: 'weather', value: env.w }); this.lastW = env.w; }
    if (p.anim.mode !== this.lastM) { this.events.push({ t, type: 'anim', actor: 'krush', from: this.lastM, to: p.anim.mode }); this.lastM = p.anim.mode; }
    this.buf.push({ t, a: { krush: { p: [r3(p.pos.x), r3(p.pos.y), r3(p.pos.z)], y: r4(p.yaw), m: p.anim.mode, ph: r4(p.anim.phase), sp: r3(p.anim.speed), at: r4(p.anim.t), sit: !!p.sitting, sw: !!p.swimming } }, c: cam, e: env });
    this.count++;
    if (this.t - this.lastFlush >= FLUSH_EVERY) this.flush();
  }

  event(type, data) { if (this.active) { this.tick(); this.events.push({ t: r4(this.t), type, ...data }); } }

  // Final sample at the exact moment Stop is pressed; freezes the clock.
  finish(cam, env) { this.sample(cam, env, true); this.active = false; }

  flush() {
    if (!this.takeId || !this.buf.length) return;
    const samples = this.buf, events = this.events;
    this.buf = []; this.events = []; this.lastFlush = this.t;
    const index = this.chunks++;
    this.pending.push(this.send({ take_id: this.takeId, index, chunk_key: `${this.takeId}:${index}`, start_t: samples[0].t, end_t: samples[samples.length - 1].t, samples, events }));
  }

  // Failed chunks stay buffered on this device until a retry succeeds or the take is discarded.
  async send(data) { try { await saveChunk(data); } catch { this.failed++; this.unsent.push(data); } }
  async retry() { const u = this.unsent; this.unsent = []; await Promise.all(u.map((d) => this.send(d))); return this.unsent.length; }

  async stop() {
    this.active = false;
    this.flush();
    await Promise.all(this.pending);
    this.pending = [];
    const d = r4(this.t);
    return {
      duration: d, chunk_count: this.chunks, sample_count: this.count,
      timing: { clock: 'performance.now (monotonic wall time)', sample_cap_hz: MAX_HZ, avg_sample_hz: d ? +(this.count / d).toFixed(1) : 0, max_gap_ms: Math.round(this.maxGap * 1000), failed_chunks: this.failed },
    };
  }
}