import { groundAt } from './layout';
import { lerpAngle } from '../core/noise';

const AMBIG = 1.0; // metres: two different objects closer than this to each other's distance count as overlapping

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
    return out.concat(this.R.hoops.candidates());
  }
  // Steps the controlled actor toward g; true (standing at the mark, facing g.yaw) once arrived.
  walkTo(g, dt) {
    const p = this.e.player, dx = g.x - p.pos.x, dz = g.z - p.pos.z, d = Math.hypot(dx, dz), step = Math.min(d, 1.5 * dt);
    if (d < 0.04) { p.yaw = g.yaw; p.anim.mode = 'idle'; p.anim.speed = 0; p.finish(dt, false); return true; }
    p.sitting = null; p.pos.x += (dx / d) * step; p.pos.z += (dz / d) * step; p.pos.y = groundAt(p.pos.x, p.pos.z, p.pos.y);
    p.yaw = lerpAngle(p.yaw, d > 0.25 ? Math.atan2(dx, dz) : g.yaw, 1 - Math.exp(-dt * 10));
    Object.assign(p.anim, { mode: 'walk', speed: 1.5 }); p.anim.phase += ((1.5 * dt) / 1.3) * Math.PI * 2; p.anim.t += dt; p.vel.set(0, 0, 0);
    p.finish(dt, false);
    return false;
  }
  use(a) {
    const p = this.e.player;
    if (a.kind === 'sit') this.go = { x: a.x + Math.sin(a.yaw) * 0.5, z: a.z + Math.cos(a.yaw) * 0.5, yaw: a.yaw, done: () => p.sitAt({ x: a.x, y: a.y, z: a.z, rot: a.yaw }) };
    else this.go = { x: a.x, z: a.z, yaw: a.yaw, done: () => {} };
  }
  stand() { const p = this.e.player; if (!p.sitting) return; p.sitting = null; p.pos.x += Math.sin(p.yaw) * 0.55; p.pos.z += Math.cos(p.yaw) * 0.55; p.pos.y = groundAt(p.pos.x, p.pos.z, p.pos.y + 0.3); }
  update(dt, inp) {
    const p = this.e.player, h = this.R.hoops;
    h.tickBall(dt);
    if (h.active) {
      if ((inp.move.x || inp.move.y) && (h.phase === 'fetch' || h.phase === 'carry')) { h.cancel(); return { move: false }; }
      this.emit(null); h.update(dt, (g, s) => this.walkTo(g, s));
      return { move: true };
    }
    if (this.go) {
      if (inp.move.x || inp.move.y) { this.go = null; return { move: false }; }
      if (this.walkTo(this.go, dt)) { const g = this.go; this.go = null; g.done(); this.emit(null); }
      return { move: true };
    }
    if (this.choice) {
      // Choice open: 1/2/3 (or a click on the prompt) picks; moving, Esc or E again cancels. Nothing is auto-selected.
      const n = this.choice.options.findIndex((_, i) => inp.pressed?.has(`Digit${i + 1}`));
      if (n >= 0) this.pick(n);
      else if (inp.move.x || inp.move.y || inp.interact || inp.pressed?.has('Escape')) { this.choice = null; this.t = 0; this.last = null; }
      return { move: false };
    }
    if ((this.t -= dt) <= 0) {
      this.t = 0.15; let best = null;
      if (p.sitting) best = { verb: 'Stand Up', label: 'Seat', act: () => this.stand() };
      else {
        // Nearest anchor per object; a second object almost as close (within AMBIG) makes it a contextual choice.
        const near = new Map();
        for (const c of this.candidates()) {
          if (Math.abs(c.y - p.pos.y - 0.5) > 1.4) continue; const d = Math.hypot(c.x - p.pos.x, c.z - p.pos.z);
          if (d < c.r && (!near.has(c.label) || d < near.get(c.label).d)) near.set(c.label, { ...c, d });
        }
        const opts = [...near.values()].sort((a, b) => a.d - b.d), alts = opts.filter((c) => c.d - (opts[0]?.d ?? 0) < AMBIG).slice(0, 3);
        best = alts.length > 1 ? { verb: 'Choose', label: alts.map((c) => c.label).join(' or '), options: alts, act: () => { this.choice = { options: alts }; this.emit(this.choice); } } : opts[0] || null;
      }
      this.cur = best; if (!this.choice) this.emit(best);
    }
    if (inp.interact && this.cur) { const c = this.cur; this.cur = null; this.t = 0; c.act(); }
    return { move: false };
  }
  pick(i) { const c = this.choice?.options[i]; this.choice = null; this.cur = null; this.t = 0; this.emit(null); c?.act(); }
  emit(c) {
    const open = c && !c.verb, k = open ? `choice|${c.options.map((o) => o.label).join('|')}` : c ? `${c.verb}|${c.label}` : '';
    if (k === this.last) return; this.last = k;
    this.e.emit({ prompt: open ? { verb: 'Choose an action', label: `Press 1–${c.options.length} or tap · move to cancel`, choices: c.options.map((o) => ({ verb: o.verb, label: o.label })) } : c ? { verb: c.verb, label: c.label } : null });
  }
}