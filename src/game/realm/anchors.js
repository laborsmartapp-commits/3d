import { groundAt } from './layout';
import { lerpAngle } from '../core/noise';

// Interaction anchors: doors, seats, mics and decks. The controlled actor walks to the mark, then sits/stands.
export class Anchors {
  constructor(R) { this.R = R; this.e = R.e; this.cur = null; this.t = 0; this.go = null; this.last = null; }
  candidates() {
    const out = [];
    for (const d of this.R.doors) out.push({ verb: d.verb, label: d.label, x: d.cx, y: d.cy, z: d.cz, r: 1.6, act: () => d.toggle() });
    for (const o of this.R.set.list) {
      if (o.hidden || !o.node.visible) continue;
      for (const a of this.R.set.anchors(o)) out.push({ verb: a.label, label: o.name || this.R.set.def(o).name, x: a.x, y: a.y, z: a.z, r: 1.7, act: () => this.use(a) });
    }
    return out;
  }
  use(a) {
    const p = this.e.player;
    if (a.kind === 'sit') this.go = { x: a.x + Math.sin(a.yaw) * 0.5, z: a.z + Math.cos(a.yaw) * 0.5, yaw: a.yaw, done: () => p.sitAt({ x: a.x, y: a.y, z: a.z, rot: a.yaw }) };
    else this.go = { x: a.x, z: a.z, yaw: a.yaw, done: () => {} };
  }
  stand() { const p = this.e.player; if (!p.sitting) return; p.sitting = null; p.pos.x += Math.sin(p.yaw) * 0.55; p.pos.z += Math.cos(p.yaw) * 0.55; p.pos.y = groundAt(p.pos.x, p.pos.z, p.pos.y + 0.3); }
  update(dt, inp) {
    const p = this.e.player;
    if (this.go) {
      const g = this.go, dx = g.x - p.pos.x, dz = g.z - p.pos.z, d = Math.hypot(dx, dz), step = Math.min(d, 1.5 * dt);
      if (inp.move.x || inp.move.y) { this.go = null; return { move: false }; }
      if (d < 0.04) { p.yaw = g.yaw; p.anim.mode = 'idle'; p.anim.speed = 0; this.go = null; g.done(); p.finish(dt, false); this.emit(null); return { move: true }; }
      p.sitting = null; p.pos.x += (dx / d) * step; p.pos.z += (dz / d) * step; p.pos.y = groundAt(p.pos.x, p.pos.z, p.pos.y);
      p.yaw = lerpAngle(p.yaw, d > 0.25 ? Math.atan2(dx, dz) : g.yaw, 1 - Math.exp(-dt * 10));
      Object.assign(p.anim, { mode: 'walk', speed: 1.5 }); p.anim.phase += ((1.5 * dt) / 1.3) * Math.PI * 2; p.anim.t += dt; p.vel.set(0, 0, 0);
      p.finish(dt, false);
      return { move: true };
    }
    if ((this.t -= dt) <= 0) {
      this.t = 0.15; let best = null;
      if (p.sitting) best = { verb: 'Stand Up', label: 'Seat', act: () => this.stand() };
      else for (const c of this.candidates()) { if (Math.abs(c.y - p.pos.y - 0.5) > 1.4) continue; const d = Math.hypot(c.x - p.pos.x, c.z - p.pos.z); if (d < c.r && (!best || d < best.d)) best = { ...c, d }; }
      this.cur = best; this.emit(best);
    }
    if (inp.interact && this.cur) { const c = this.cur; this.cur = null; this.t = 0; c.act(); }
    return { move: false };
  }
  emit(c) { const k = c ? `${c.verb}|${c.label}` : ''; if (k === this.last) return; this.last = k; this.e.emit({ prompt: c ? { verb: c.verb, label: c.label } : null }); }
}