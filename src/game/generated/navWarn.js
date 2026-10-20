import { navGrid } from './navGrid';

// Set Edit placement warning: after a move, rooms and door approaches that were reachable from the spawn are
// re-checked on the live colliders. A newly blocked one raises a warning; the user's placement is never undone.
export class NavWarn {
  constructor(e, spec, L) { this.e = e; this.spec = spec; this.L = L; this.base = null; this.warning = null; this.timer = 0; }

  points() {
    const out = this.spec.zones.map((z) => ({ key: z.id, name: z.name, x: z.x, z: z.z, r: Math.min(z.w, z.d) / 2 - 0.3 }));
    for (const w of this.spec.walls) {
      const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L;
      for (const o of w.openings) {
        if (o.kind !== 'door' && o.kind !== 'opening') continue;
        const cx = w.x1 + ux * o.at * L, cz = w.z1 + uz * o.at * L, n = w.t / 2 + 0.6;
        for (const s of [1, -1]) out.push({ key: `${w.id}${s}`, name: `the ${o.kind} in wall ${w.id}`, x: cx - uz * n * s, z: cz + ux * n * s, r: 0.5 });
      }
    }
    return out;
  }
  status() {
    const G = navGrid(this.e, this.spec, this.L), sp = this.spec.spawn, seen = G.flood(G.nearest(sp.x, sp.z, 1.5));
    return new Map(this.points().map((p) => [p.key, { ...p, ok: G.nearest(p.x, p.z, p.r, seen) >= 0 }]));
  }
  baseline() { this.base = this.status(); }
  afterEdit(label) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (!this.base) this.baseline();
      const now = this.status(), lost = [...now.values()].filter((p) => !p.ok && this.base.get(p.key)?.ok);
      this.warning = lost.length ? { piece: label, lost: lost.map((p) => p.name) } : null;
      if (lost.length) this.e.notify?.(`Placement warning: ${label || 'this piece'} now blocks the way to ${[...new Set(lost.map((p) => p.name))].slice(0, 3).join(', ')}. It stays where you put it.`);
    }, 250);
  }
}