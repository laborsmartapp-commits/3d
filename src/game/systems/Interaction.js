export class Interaction {
  constructor() { this.items = []; this.current = null; }
  add(it) { this.items.push(it); return it; }
  remove(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); }
  update(p) {
    let best = null, bd = 1e9;
    for (const it of this.items) {
      if (it.enabled && !it.enabled()) continue;
      const q = it.getPos ? it.getPos() : it.pos;
      if (Math.abs((q.y ?? p.y) - p.y) > 4) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < it.radius && d < bd) { bd = d; best = it; }
    }
    this.current = best;
    return best;
  }
}