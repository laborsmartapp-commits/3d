import { base44 } from '@/api/base44Client';

const r3 = (v) => +v.toFixed(3), r4 = (v) => +v.toFixed(4);
const SAMPLE_DT = 1 / 60, FLUSH_EVERY = 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Network-tolerant save: chunks retry with backoff so a blip doesn't lose performance data.
async function saveChunk(data, n = 0) {
  try { return await base44.entities.PerformanceChunk.create(data); }
  catch (err) { if (n >= 5) throw err; await sleep(800 * 2 ** n); return saveChunk(data, n + 1); }
}

// Captures the performance on a scene clock (sum of frame dt from Record), independent of render FPS.
export class PerformanceRecorder {
  constructor(e) { this.e = e; this.active = false; }

  start() {
    Object.assign(this, { active: true, takeId: null, t: 0, last: -1, lastFlush: 0, buf: [], events: [], chunks: 0, count: 0, pending: [], lastW: null, lastM: null });
  }

  sample(dt, cam, env) {
    if (!this.active) return;
    this.t += dt;
    if (this.t - this.last < SAMPLE_DT - 1e-6) return;
    this.last = this.t;
    const p = this.e.player, t = r4(this.t);
    if (env.w !== this.lastW) { this.events.push({ t, type: 'weather', value: env.w }); this.lastW = env.w; }
    if (p.anim.mode !== this.lastM) { this.events.push({ t, type: 'anim', actor: 'krush', from: this.lastM, to: p.anim.mode }); this.lastM = p.anim.mode; }
    this.buf.push({ t, a: { krush: { p: [r3(p.pos.x), r3(p.pos.y), r3(p.pos.z)], y: r4(p.yaw), m: p.anim.mode, ph: r4(p.anim.phase), sp: r3(p.anim.speed), at: r4(p.anim.t), sit: !!p.sitting, sw: !!p.swimming } }, c: cam, e: env });
    this.count++;
    if (this.t - this.lastFlush >= FLUSH_EVERY) this.flush();
  }

  event(type, data) { if (this.active) this.events.push({ t: r4(this.t), type, ...data }); }

  flush() {
    if (!this.takeId || !this.buf.length) return;
    const samples = this.buf, events = this.events;
    this.buf = []; this.events = []; this.lastFlush = this.t;
    this.pending.push(saveChunk({ take_id: this.takeId, index: this.chunks++, start_t: samples[0].t, end_t: samples[samples.length - 1].t, samples, events }));
  }

  async stop() {
    this.active = false;
    this.flush();
    await Promise.all(this.pending);
    return { duration: r4(this.t), chunk_count: this.chunks, sample_count: this.count };
  }
}