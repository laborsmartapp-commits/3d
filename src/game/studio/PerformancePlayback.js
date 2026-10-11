import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { now } from './PerformanceRecorder';

const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
const lerp = (a, b, k) => a + (b - a) * k;
const lerpAng = (a, b, k) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * k; };

// Reproduces a take from its stored samples. Same interpolation rules the cloud worker must use.
export class PerformancePlayback {
  constructor(e) { this.e = e; this.cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 3000); this.samples = []; }

  async load(take) {
    const page = await base44.entities.PerformanceChunk.filter({ take_id: take.source_take_id || take.id }, { sort: 'index', limit: 1000 });
    const byIndex = new Map(page.items.map((c) => [c.index, c])); // tolerate legacy duplicate rows
    this.samples = [...byIndex.values()].sort((a, b) => a.index - b.index).flatMap((c) => c.samples || []);
    this.t = 0; this.i = 0;
    this.duration = this.samples.length ? this.samples[this.samples.length - 1].t : 0;
    return this.samples.length;
  }

  at(t) {
    const S = this.samples;
    if (t < S[this.i].t) this.i = 0;
    while (this.i < S.length - 2 && S[this.i + 1].t <= t) this.i++;
    const a = S[this.i], b = S[Math.min(this.i + 1, S.length - 1)];
    const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    const A = a.a.krush, B = b.a.krush;
    qa.fromArray(a.c, 3); qb.fromArray(b.c, 3); qa.slerp(qb, k);
    return {
      krush: { p: A.p.map((v, j) => lerp(v, B.p[j], k)), y: lerpAng(A.y, B.y, k), m: A.m, ph: lerp(A.ph, B.ph, k), sp: lerp(A.sp, B.sp, k), at: lerp(A.at, B.at, k) },
      c: { p: [0, 1, 2].map((j) => lerp(a.c[j], b.c[j], k)), q: qa.clone(), fov: a.c[7] },
      e: a.e,
    };
  }

  begin() { this.t0 = now(); this.t = 0; this.i = 0; }

  // Pose the world at real elapsed time since begin() (frame-rate independent). False at the end.
  step(dt) {
    this.t = now() - this.t0;
    if (!this.samples.length || this.t > this.duration) return false;
    const s = this.at(this.t), p = this.e.player, k = s.krush;
    p.pos.set(k.p[0], k.p[1], k.p[2]); p.yaw = k.y; p.vel.set(0, 0, 0);
    Object.assign(p.anim, { mode: k.m, phase: k.ph, speed: k.sp, t: k.at });
    p.finish(dt, false);
    this.cam.position.fromArray(s.c.p); this.cam.quaternion.copy(s.c.q);
    if (this.cam.fov !== s.c.fov) { this.cam.fov = s.c.fov; this.cam.updateProjectionMatrix(); }
    if (s.e) { this.e.env.hour = s.e.h; if (this.e.env.weather !== s.e.w) this.e.env.setWeather(s.e.w); }
    return true;
  }
}