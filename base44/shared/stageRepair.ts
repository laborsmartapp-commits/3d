// Deterministic blueprint repairs run before the final checks (no AI): solid elements standing in a doorway are
// moved clear of it, and production cameras inside a wall or solid element are pulled toward their look target.
// Every change is reported. Footprints match the engine's colliders (src/game/generated/elements.js).
const r2 = (v) => Math.round(v * 100) / 100;

// Axis-aligned collider footprints of one element: [{x, z, hw, hd}].
export function solidParts(e) {
  const ry = e.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry), ab = (w, d) => [(Math.abs(cs) * w + Math.abs(sn) * d) / 2, (Math.abs(sn) * w + Math.abs(cs) * d) / 2];
  const box = (x, z, w, d) => { const [hw, hd] = ab(w, d); return { x, z, hw, hd }; };
  if (e.type === 'column') { const r = (e.r || 0.3) + 0.05; return [{ x: e.x, z: e.z, hw: r, hd: r }]; }
  if (e.type === 'fountain') { const r = e.r || 2.2; return [{ x: e.x, z: e.z, hw: r, hd: r }]; }
  if (e.type === 'plinth') return [box(e.x, e.z, e.w || 2, e.d || e.w || 2)];
  if (e.type === 'planter_bed' || e.type === 'pool') return [box(e.x, e.z, e.w || 2, e.d || 2)];
  if (e.type === 'arch') { const a = (e.w || 2) / 2 + 0.3; return [1, -1].map((s) => box(e.x + s * a * cs, e.z - s * a * sn, 0.6, 0.6)); }
  return [];
}
const hit = (a, b, m = 0) => Math.abs(a.x - b.x) < a.hw + b.hw + m && Math.abs(a.z - b.z) < a.hd + b.hd + m;
const wallBox = (w) => ({ x: (w.x1 + w.x2) / 2, z: (w.z1 + w.z2) / 2, hw: Math.abs(w.x2 - w.x1) / 2 + w.t / 2, hd: Math.abs(w.z2 - w.z1) / 2 + w.t / 2 });
const segDist = (w, x, z) => { const L2 = (w.x2 - w.x1) ** 2 + (w.z2 - w.z1) ** 2 || 1, t = Math.max(0, Math.min(1, ((x - w.x1) * (w.x2 - w.x1) + (z - w.z1) * (w.z2 - w.z1)) / L2)); return Math.hypot(x - (w.x1 + t * (w.x2 - w.x1)), z - (w.z1 + t * (w.z2 - w.z1))); };

// Approach zone of every door / opening: its width plus 1 m each side of the wall.
function doorZones(walls) {
  const out = [];
  for (const w of walls) {
    const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L;
    for (const o of w.openings || []) {
      if (o.kind !== 'door' && o.kind !== 'opening') continue;
      const a = o.w / 2 + 0.3, p = w.t / 2 + 1.5;
      out.push({ wall: w.id, x: w.x1 + ux * o.at * L, z: w.z1 + uz * o.at * L, hw: Math.abs(ux) * a + Math.abs(uz) * p, hd: Math.abs(uz) * a + Math.abs(ux) * p });
    }
  }
  return out;
}

// Dining sets: a dining table (catalog top 2.0 x 1.0 m x scale) gets a full chair arrangement along its long sides
// (3 per side from 1.8 m, 2 from 1.2 m), matching the chairs already there (type, finish, colour, scale). Existing
// chairs never move; a slot is skipped when a wall or another floor piece is in the way. Idempotent.
function completeDining(spec, notes) {
  for (const t of spec.furnishings.filter((p) => p.type === 'dining_table')) {
    const s = t.scale || 1, ry = t.ry || 0, c = Math.cos(ry), sn = Math.sin(ry), len = 2 * s;
    const chairs = () => spec.furnishings.filter((p) => p.type === 'dining_chair');
    const had = chairs().filter((p) => Math.hypot(p.x - t.x, p.z - t.z) < 1.6 * s), ref = had[0] || {};
    const offs = len >= 1.8 ? [-0.7, 0, 0.7] : len >= 1.2 ? [-0.45, 0.45] : [0];
    let n = 0;
    for (const side of [1, -1]) for (const a of offs) {
      const lx = a * s, lz = side * s, x = r2(t.x + lx * c + lz * sn), z = r2(t.z - lx * sn + lz * c);
      if (chairs().some((p) => Math.hypot(p.x - x, p.z - z) < 0.35)) continue;
      if (spec.walls.some((w) => segDist(w, x, z) < w.t / 2 + 0.35)) continue;
      if (spec.furnishings.some((p) => p !== t && (p.y == null || p.y < 0.3) && !/^rug|dining_chair/.test(p.type) && Math.hypot(p.x - x, p.z - z) < 0.55)) continue;
      const o = { id: `${t.id}.c${n + 1}`, type: 'dining_chair', x, z, ry: r2(ry + (side > 0 ? 0 : Math.PI)), scale: ref.scale || 1 };
      if (ref.color) o.color = ref.color; if (ref.finish) o.finish = ref.finish;
      spec.furnishings.push(o); n++;
    }
    if (n) notes.push(`Dining table ${t.id} had ${had.length} chair(s): added ${n} for a full arrangement`);
  }
}

export function repairSpec(spec) {
  const notes = [], dropped = [], doors = doorZones(spec.walls), walls = spec.walls.map(wallBox);
  completeDining(spec, notes);
  const floorPieces = spec.furnishings.filter((p) => p.y == null || p.y < 0.3);
  const onFloor = (x, z) => !spec.floors.length || spec.floors.some((f) => Math.abs(x - f.x) <= f.w / 2 && Math.abs(z - f.z) <= f.d / 2);
  for (const e of [...spec.elements]) {
    const parts = solidParts(e), door = doors.find((d) => parts.some((p) => hit(p, d)));
    if (!door || e.type === 'arch' || e.type === 'fountain') continue;
    const others = spec.elements.filter((x) => x !== e).flatMap(solidParts), p0 = parts[0];
    const clear = (x, z) => {
      const b = { x, z, hw: p0.hw, hd: p0.hd };
      return onFloor(x, z) && Math.abs(x) < spec.bounds.w / 2 - b.hw && Math.abs(z) < spec.bounds.d / 2 - b.hd && !doors.some((d) => hit(b, d)) && !walls.some((w) => hit(b, w)) && !others.some((o) => hit(b, o, 0.3)) && !floorPieces.some((f) => Math.abs(f.x - x) < b.hw + 0.5 && Math.abs(f.z - z) < b.hd + 0.5);
    };
    let spot = null;
    for (let r = 0.25; r <= 3 && !spot; r += 0.25) for (let k = 0; k < 16 && !spot; k++) { const x = e.x + Math.cos((k * Math.PI) / 8) * r, z = e.z + Math.sin((k * Math.PI) / 8) * r; if (clear(x, z)) spot = [r2(x), r2(z)]; }
    if (spot) { notes.push(`${e.type} ${e.id} blocked the doorway in wall ${door.wall}: moved from ${r2(e.x)},${r2(e.z)} to ${spot[0]},${spot[1]}`); e.x = spot[0]; e.z = spot[1]; }
    else { dropped.push(`${e.type} ${e.id} blocked the doorway in wall ${door.wall} and no clear spot was found nearby: removed`); spec.elements = spec.elements.filter((x) => x !== e); }
  }
  const solids = spec.elements.flatMap(solidParts), top = Math.max(0, ...spec.walls.map((w) => w.y + w.h));
  const inside = (x, z, y) => (y < top && spec.walls.some((w) => y < w.y + w.h && segDist(w, x, z) < w.t / 2 + 0.3)) || solids.some((s) => hit(s, { x, z, hw: 0.3, hd: 0.3 }));
  for (const c of spec.cameras) {
    if (!inside(c.x, c.z, c.y)) continue;
    const dx = c.look_x - c.x, dz = c.look_z - c.z, L = Math.hypot(dx, dz) || 1;
    let k = 0.25; while (k <= Math.min(3, L - 0.5) && inside(c.x + (dx / L) * k, c.z + (dz / L) * k, c.y)) k += 0.25;
    if (k > Math.min(3, L - 0.5)) {
      // A camera behind the wall of its target (e.g. outside the room behind a fireplace) is mirrored through the
      // target so it frames the same subject from inside the room.
      const mx = r2(2 * c.look_x - c.x), mz = r2(2 * c.look_z - c.z);
      if (onFloor(mx, mz) && !inside(mx, mz, c.y)) { notes.push(`Camera ${c.name} stood behind a wall from its target: moved to the room side at ${mx},${mz}, still aimed at the same point`); c.x = mx; c.z = mz; }
      else notes.push(`Camera ${c.name} is inside a wall or solid feature and could not be moved clear`);
      continue;
    }
    const x = r2(c.x + (dx / L) * k), z = r2(c.z + (dz / L) * k);
    notes.push(`Camera ${c.name} was inside a wall or solid feature: moved ${r2(k)} m toward its target to ${x},${z}`); c.x = x; c.z = z;
  }
  return { notes, dropped };
}