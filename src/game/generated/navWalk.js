import { navGrid, obstruction, RAD } from './navGrid';

const owner = (o) => (o ? (o.owner ? `${o.label ? `${o.label} ` : ''}${o.owner}` : o.tag || 'collider') : null);

// String-pulled waypoints: skip grid cells while the straight segment between them stays on open cells.
function smooth(G, pts) {
  const clear = (a, b) => { const L = Math.hypot(b.x - a.x, b.z - a.z); for (let u = 0; u <= L; u += 0.1) { const i = G.cell(a.x + ((b.x - a.x) * u) / L, a.z + ((b.z - a.z) * u) / L); if (i < 0 || !G.open(i)) return false; } return true; };
  const out = [pts[0]]; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !clear(pts[i], pts[j])) j--; out.push(pts[j]); i = j; }
  return out;
}

// Fixed-step walk driven through the player's real movement code (Player.update: acceleration, floor steps and
// collider resolution with its 0.35 m radius), steering toward each waypoint like a stick held in that direction.
// Nothing is teleported: the largest single-step displacement is reported.
export function walkPath(e, pts, { dt = 1 / 30, maxT = 90 } = {}) {
  const P = e.player, C = e.colliders, inp = { move: { x: 0, y: 0 }, jump: false, sprint: false, walk: false };
  P.sitting = null;
  let t = 0, k = 1, maxStep = 0, dist = 0, best = 1e9, still = 0, blocker = null;
  while (k < pts.length && t < maxT) {
    const w = pts[k], dx = w.x - P.pos.x, dz = w.z - P.pos.z, d = Math.hypot(dx, dz);
    if (d < (k === pts.length - 1 ? 0.3 : 0.45)) { k++; best = 1e9; still = 0; continue; }
    inp.move.x = dx / d; inp.move.y = -dz / d;
    const x0 = P.pos.x, z0 = P.pos.z;
    P.update(dt, inp, 0, false, false); t += dt;
    const step = Math.hypot(P.pos.x - x0, P.pos.z - z0); maxStep = Math.max(maxStep, step); dist += step;
    if (d < best - 0.02) { best = d; still = 0; }
    else if ((still += dt) > 2) { blocker = owner(C.blocked(P.pos.x + (dx / d) * 0.2, P.pos.z + (dz / d) * 0.2, RAD + 0.05, P.pos.y + 0.5)) || 'no collider (floor edge or step)'; break; }
  }
  inp.move.x = inp.move.y = 0; for (let i = 0; i < 15; i++) P.update(dt, inp, 0, false, false);
  return { ok: k >= pts.length, sim_s: Math.round(t * 10) / 10, metres: Math.round(dist * 10) / 10, max_step_m: Math.round(maxStep * 1000) / 1000, end: { x: +P.pos.x.toFixed(2), z: +P.pos.z.toFixed(2) }, blocker };
}

// Navigation targets of a generated stage: room interiors, floor marks, seat anchors and the piano bench.
export function navTargets(R, spec) {
  const out = spec.zones.map((z) => ({ kind: 'room', name: z.name, x: z.x, z: z.z, r: Math.min(z.w, z.d) / 2 - 0.3 }));
  for (const m of spec.marks) out.push({ kind: 'mark', name: m.name, x: m.x, z: m.z, r: 0.9 });
  for (const o of R.set.list) {
    if (o.hidden) continue;
    for (const a of R.set.anchors(o)) if (a.kind === 'sit') out.push({ kind: 'seat', name: `${a.label} · ${R.set.def(o).name} ${o.id}`, x: a.x, z: a.z, r: 1.7 });
    if (o.type === 'grand_piano') { const c = Math.cos(o.ry), s = Math.sin(o.ry), lz = 1.55 * o.sz; out.push({ kind: 'piano', name: `Piano bench ${o.id}`, x: o.x + lz * s, z: o.z + lz * c, r: 1.0 }); }
  }
  return out;
}

// Reachability of every target from the spawn on the live colliders, with the smallest blocking set for failures.
export function navReport(e, R, spec, L) {
  const G = navGrid(e, spec, L), sp = spec.spawn, start = G.nearest(sp.x, sp.z, 1.5), seen = G.flood(start);
  const regions = []; // unreachable regions already analysed (targets in the same region share the answer)
  const res = navTargets(R, spec).map((t) => {
    const hit = G.nearest(t.x, t.z, t.r, seen);
    if (hit >= 0) return { ...t, ok: true, cell: hit };
    const any = G.nearest(t.x, t.z, t.r);
    if (any < 0) return { ...t, ok: false, blocked_by: ['no open floor near this point'] };
    let reg = regions.find((r) => r.seen[any] !== -2);
    if (!reg) { reg = { seen: G.flood(any), owners: obstruction(G, start, any).owners }; regions.push(reg); }
    return { ...t, ok: false, region: regions.indexOf(reg), blocked_by: reg.owners };
  });
  return { G, start, seen, res };
}

// Continuous fixed-step tour from the spawn through each room in order (one walk, no teleport between rooms).
export function navTour(e, R, spec, L, rooms) {
  const P = e.player, sp = spec.spawn, rep = navReport(e, R, spec, L), G = rep.G;
  P.pos.set(G.px(rep.start), L.baseGroundAt(sp.x, sp.z, 0), G.pz(rep.start)); P.vel.set(0, 0, 0);
  const legs = [];
  for (const name of rooms) {
    const t = rep.res.find((r) => r.name === name);
    const from = G.nearest(P.pos.x, P.pos.z, 1), seen = G.flood(from), to = t ? G.nearest(t.x, t.z, t.r, seen) : -1;
    if (to < 0) { legs.push({ to: name, ok: false, reason: 'no route on the live colliders', blocked_by: t?.blocked_by }); continue; }
    const pts = smooth(G, G.pathTo(seen, to));
    legs.push({ to: name, waypoints: pts.length, ...walkPath(e, pts) });
  }
  return { legs, targets: rep.res.map(({ cell, ...r }) => r) };
}