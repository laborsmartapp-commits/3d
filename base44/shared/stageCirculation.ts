import { FOOT } from './stageFootprints.ts';

// Circulation: a walkability grid with the SAME collision the engine uses (wall runs between door/opening gaps,
// element colliders, solid floor furniture with its measured or compound footprint), tested with the player's
// 0.35 m body at standing height (square dilation, like the engine's collider test). Shared by the furnishing
// guard (during generation), the navigation repair (after it) and the final checks.
export const RES = 0.25, BODY = 0.35;
// Moving pieces re-floods the grid per candidate: on very large outdoor stages only the check runs, not the search.
const searchable = (spec) => (spec.bounds.w * spec.bounds.d) / (RES * RES) <= 150000;
type Box = { x: number; z: number; hw: number; hd: number; c: number; s: number };
type Shape = { id: string; kind: string; type?: string; boxes: Box[]; circles: { x: number; z: number; r: number }[] };
const WALKABLE = ['platform', 'path', 'plaza', 'sidewalk', 'bridge', 'road', 'crosswalk', 'gazebo', 'pergola'];
const r2 = (v: number) => Math.round(v * 100) / 100;

export function footShape(p): Shape | null {
  const F = FOOT[p.type]; if (!F || !F[5] || F[6] !== 'floor' || (p.y != null && p.y >= 0.3)) return null;
  const k = p.scale || 1, ry = p.ry || 0, c = Math.cos(ry), s = Math.sin(ry);
  const parts = F[7] ? F[7].map(([cx, cz, bw, bd]) => [cx * k, cz * k, Math.max(0.05, bw * k - 0.04), Math.max(0.05, bd * k - 0.04)]) : [[F[0] * k, F[1] * k, F[2] * k * 0.9, F[3] * k * 0.9]];
  return { id: p.id, kind: 'furnishing', type: p.type, circles: [], boxes: parts.map(([lx, lz, hw, hd]) => ({ x: p.x + lx * c + lz * s, z: p.z - lx * s + lz * c, hw, hd, c, s })) };
}

export function archShapes(spec): Shape[] {
  const out: Shape[] = [], bx = (x, z, hw, hd, ry = 0) => ({ x, z, hw, hd, c: Math.cos(ry), s: Math.sin(ry) });
  for (const w of spec.walls) {
    const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1); if (L < 0.02) continue;
    const ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L, ry = Math.atan2(-uz, ux);
    const gaps = (w.openings || []).filter((o) => o.kind === 'door' || o.kind === 'opening').map((o) => [o.at * L - o.w / 2, o.at * L + o.w / 2]).sort((a, b) => a[0] - b[0]);
    const boxes: Box[] = []; let u = 0;
    for (const [a, b] of [...gaps, [L, L]]) { if (a - u > 0.02) boxes.push(bx(w.x1 + ux * (u + a) / 2, w.z1 + uz * (u + a) / 2, (a - u) / 2, w.t / 2 + 0.03, ry)); u = Math.max(u, b); }
    out.push({ id: w.id, kind: 'wall', boxes, circles: [] });
  }
  for (const b of spec.buildings) out.push({ id: b.id, kind: 'building', boxes: [bx(b.x, b.z, b.w / 2, b.d / 2, b.ry || 0)], circles: [] });
  for (const e of spec.elements) {
    const ry = e.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry), S: Shape = { id: e.id, kind: 'element', type: e.type, boxes: [], circles: [] };
    if (e.type === 'column') S.circles.push({ x: e.x, z: e.z, r: (e.r || 0.3) + 0.05 });
    else if (e.type === 'fountain') S.circles.push({ x: e.x, z: e.z, r: e.r || 2.2 });
    else if (e.type === 'arch') { const a = (e.w || 2) / 2 + 0.3; for (const s of [1, -1]) S.boxes.push(bx(e.x + s * a * cs, e.z - s * a * sn, 0.3, 0.3, ry)); }
    else if (e.type === 'plinth' && (e.h || 1) >= 0.5) S.boxes.push(bx(e.x, e.z, (e.w || 2) / 2, (e.d || e.w || 2) / 2, ry));
    else if (e.type === 'planter_bed' || e.type === 'pool') S.boxes.push(bx(e.x, e.z, (e.w || 2) / 2, (e.d || 2) / 2, ry));
    else if (['fence', 'railing', 'hedge'].includes(e.type) && e.x1 != null) { const L = Math.hypot(e.x2 - e.x1, e.z2 - e.z1); if (L > 0.05) S.boxes.push(bx((e.x1 + e.x2) / 2, (e.z1 + e.z2) / 2, L / 2, e.type === 'hedge' ? 0.4 : 0.1, Math.atan2(-(e.z2 - e.z1), e.x2 - e.x1))); }
    else if (e.type === 'pergola') { const w = e.w || 4, d = e.d || 3; for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const lx = sx * (w / 2 - 0.1), lz = sz * (d / 2 - 0.1); S.circles.push({ x: e.x + lx * cs + lz * sn, z: e.z - lx * sn + lz * cs, r: 0.14 }); } }
    else if (e.type === 'gazebo') { const r = e.r || 3; for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; S.circles.push({ x: e.x + Math.cos(a) * r * 0.85, z: e.z + Math.sin(a) * r * 0.85, r: 0.14 }); } }
    if (S.boxes.length || S.circles.length) out.push(S);
  }
  for (const r of spec.roofs) if (r.kind === 'canopy') out.push({ id: r.id, kind: 'roof', boxes: [], circles: [-1, 1].flatMap((sx) => [-1, 1].map((sz) => ({ x: r.x + sx * (r.w / 2 - 0.2), z: r.z + sz * (r.d / 2 - 0.2), r: 0.14 }))) });
  return out;
}

export function makeGrid(spec, shapes: Shape[], rad = BODY) {
  const W = spec.bounds.w, D = spec.bounds.d, nx = Math.ceil(W / RES), nz = Math.ceil(D / RES), N = nx * nz;
  const px = (i) => -W / 2 + ((i % nx) + 0.5) * RES, pz = (i) => -D / 2 + (Math.floor(i / nx) + 0.5) * RES;
  const cell = (x, z) => { const i = Math.floor((x + W / 2) / RES), k = Math.floor((z + D / 2) / RES); return i < 0 || k < 0 || i >= nx || k >= nz ? -1 : k * nx + i; };
  const inR = (f, x, z) => Math.abs(x - f.x) <= f.w / 2 && Math.abs(z - f.z) <= f.d / 2;
  const floorAt = (x, z) => spec.environment === 'outdoor' || !spec.floors.length || spec.floors.some((f) => inR(f, x, z)) || spec.stairs.some((s) => Math.hypot(x - s.x, z - s.z) < Math.max(s.w, s.run) / 2) || spec.elements.some((e) => WALKABLE.includes(e.type) && e.w && e.d && inR(e, x, z));
  const floor = new Uint8Array(N), own: (string[] | undefined)[] = new Array(N), extra = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (floorAt(px(i), pz(i))) floor[i] = 1;
  const raster = (S: Shape, r = rad) => {
    const out: number[] = [];
    for (const b of S.boxes) { const R = Math.hypot(b.hw, b.hd) + r; for (let z = b.z - R; z <= b.z + R + 1e-6; z += RES) for (let x = b.x - R; x <= b.x + R + 1e-6; x += RES) { const i = cell(x, z); if (i < 0) continue; const dx = px(i) - b.x, dz = pz(i) - b.z; if (Math.abs(dx * b.c - dz * b.s) < b.hw + r && Math.abs(dx * b.s + dz * b.c) < b.hd + r) out.push(i); } }
    for (const c of S.circles) { const R = c.r + r; for (let z = c.z - R; z <= c.z + R + 1e-6; z += RES) for (let x = c.x - R; x <= c.x + R + 1e-6; x += RES) { const i = cell(x, z); if (i >= 0 && Math.hypot(px(i) - c.x, pz(i) - c.z) < R) out.push(i); } }
    return [...new Set(out)];
  };
  const add = (S: Shape) => { for (const i of raster(S)) (own[i] ||= []).push(S.id); };
  const drop = (id: string) => { for (let i = 0; i < N; i++) if (own[i]?.includes(id)) { own[i] = own[i]!.filter((x) => x !== id); if (!own[i]!.length) own[i] = undefined; } };
  shapes.forEach(add);
  const open = (i, off?: Set<string>) => floor[i] === 1 && !extra[i] && (!own[i] || (!!off && own[i]!.every((id) => off.has(id))));
  const flood = (start, off?: Set<string>) => {
    const seen = new Uint8Array(N); if (start < 0 || !open(start, off)) return seen;
    const q = [start]; seen[start] = 1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % nx;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if ((dx > 0 && x === nx - 1) || (dx < 0 && x === 0)) continue;
        const j = i + dx + dz * nx; if (j < 0 || j >= N || seen[j] || !open(j, off)) continue;
        if (dx && dz && (!open(i + dx, off) || !open(i + dz * nx, off))) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return seen;
  };
  const nearest = (x, z, r, seen?: Uint8Array, off?: Set<string>) => {
    let best = -1, bd = 1e9;
    for (let zz = z - r; zz <= z + r + 1e-6; zz += RES) for (let xx = x - r; xx <= x + r + 1e-6; xx += RES) { const i = cell(xx, zz); if (i < 0 || !open(i, off) || (seen && !seen[i])) continue; const d = Math.hypot(px(i) - x, pz(i) - z); if (d <= r && d < bd) { bd = d; best = i; } }
    return best;
  };
  // Temporarily block cells (a candidate placement) while testing.
  const withExtra = <T>(cells: number[], fn: () => T): T => { for (const i of cells) extra[i]++; try { return fn(); } finally { for (const i of cells) extra[i]--; } };
  return { nx, nz, N, floor, own, px, pz, cell, floorAt, raster, add, drop, open, flood, nearest, withExtra };
}
type Grid = ReturnType<typeof makeGrid>;

// What must stay reachable on foot: every room interior, both sides of every door / opening that lie on a floor,
// and every floor mark (performance position).
export function navTargets(spec, G: Grid) {
  const T = spec.zones.map((z) => ({ key: `zone:${z.id}`, kind: 'room', name: z.name, x: z.x, z: z.z, r: Math.max(0.5, Math.min(z.w, z.d) / 2 - 0.3) }));
  for (const w of spec.walls) {
    const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1) || 1, ux = (w.x2 - w.x1) / L, uz = (w.z2 - w.z1) / L;
    for (const o of w.openings || []) {
      if (o.kind !== 'door' && o.kind !== 'opening') continue;
      const cx = w.x1 + ux * o.at * L, cz = w.z1 + uz * o.at * L, n = w.t / 2 + 0.6;
      for (const s of [1, -1]) { const x = cx - uz * n * s, z = cz + ux * n * s; if (G.floorAt(x, z)) T.push({ key: `door:${w.id}${s > 0 ? 'a' : 'b'}`, kind: 'door', name: `${o.kind} in ${w.id}`, x, z, r: 0.5 }); }
    }
  }
  for (const m of spec.marks) T.push({ key: `mark:${m.id}`, kind: 'mark', name: m.name, x: m.x, z: m.z, r: 0.9 });
  return T;
}
const startCell = (spec, G: Grid, off?: Set<string>) => G.nearest(spec.spawn?.x || 0, spec.spawn?.z || 0, 1.5, undefined, off);
function reachable(spec, G: Grid, T, off?: Set<string>) {
  const start = startCell(spec, G, off), seen = G.flood(start, off), ok = new Set<string>();
  for (const t of T) if (G.nearest(t.x, t.z, t.r, seen, off) >= 0) ok.add(t.key);
  return { start, seen, ok };
}

export function circulation(spec, { skip = new Set<string>() } = {}) {
  const furn = spec.furnishings.filter((p) => !skip.has(p.id)).map(footShape).filter(Boolean) as Shape[];
  const G = makeGrid(spec, [...archShapes(spec), ...furn]), T = navTargets(spec, G), R = reachable(spec, G, T);
  return { G, T, ...R, bad: T.filter((t) => !R.ok.has(t.key)) };
}

// ---- walkways reserved before furnishing: entrance -> room hub routes on the architecture-only grid
function bfsPath(G: Grid, a: number, b: number) {
  const prev = new Int32Array(G.N).fill(-2); prev[a] = -1; const q = [a];
  for (let h = 0; h < q.length && prev[b] === -2; h++) { const i = q[h], x = i % G.nx; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if ((dx > 0 && x === G.nx - 1) || (dx < 0 && x === 0)) continue; const j = i + dx + dz * G.nx; if (j >= 0 && j < G.N && prev[j] === -2 && G.open(j)) { prev[j] = i; q.push(j); } } }
  if (prev[b] === -2) return [];
  const out: number[] = []; for (let i = b; i >= 0; i = prev[i]) out.push(i); return out.reverse();
}
export function walkways(spec, zoneIds?: string[]) {
  const G = makeGrid(spec, archShapes(spec)), T = navTargets(spec, G), routes: { zone: string; from: string; pts: number[] }[] = [];
  for (const z of spec.zones) {
    if (zoneIds && !zoneIds.includes('*') && !zoneIds.includes(z.id)) continue;
    const hub = G.nearest(z.x, z.z, Math.max(0.5, Math.min(z.w, z.d) / 2 - 0.3)); if (hub < 0) continue;
    for (const t of T.filter((t) => t.kind === 'door' && Math.abs(t.x - z.x) <= z.w / 2 && Math.abs(t.z - z.z) <= z.d / 2)) {
      const a = G.nearest(t.x, t.z, t.r); if (a < 0) continue; const pts = bfsPath(G, a, hub); if (pts.length > 1) routes.push({ zone: z.name, from: t.name, pts });
    }
  }
  const lane = new Set<number>();
  for (const r of routes) for (const i of r.pts) for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (Math.hypot(dx, dz) * RES <= 0.45) { const j = i + dx + dz * G.nx; if (j >= 0 && j < G.N) lane.add(j); }
  // Text form for the furnishing prompts: corners of each route (direction changes only).
  const text = routes.map((r) => { const c = r.pts.filter((i, k, a) => k === 0 || k === a.length - 1 || (a[k - 1] - i) !== (i - a[k + 1])); return `${r.zone}: ${r.from} -> room centre: ${c.map((i) => `(${r2(G.px(i))},${r2(G.pz(i))})`).join(' -> ')}`; });
  return { lane, text: text.slice(0, 24) };
}

// ---- candidate positions for moving one floor piece
function rings(max: number, step = 0.25, dirs = 16) { const out: [number, number, number][] = []; for (let d = step; d <= max + 1e-6; d += step) for (let k = 0; k < dirs; k++) { const a = (k / dirs) * Math.PI * 2; out.push([Math.cos(a) * d, Math.sin(a) * d, d]); } return out; }
const zoneOf = (spec, x, z) => spec.zones.find((q) => Math.abs(x - q.x) <= q.w / 2 && Math.abs(z - q.z) <= q.d / 2);
function fits(spec, G: Grid, shape: Shape, raw: Uint8Array, zone) {
  for (const i of G.raster(shape, 0)) { if (!G.floor[i] || raw[i]) return false; if (zone && (Math.abs(G.px(i) - zone.x) > zone.w / 2 || Math.abs(G.pz(i) - zone.z) > zone.d / 2)) return false; }
  return true;
}
function rawMap(G: Grid, shapes: Shape[]) { const m = new Uint8Array(G.N); for (const s of shapes) for (const i of G.raster(s, 0)) m[i] = 1; return m; }

// ---- during furnishing: each new floor piece of operation `key` may not cut a route that was open before it
export function guardPlacement(spec, key: string) {
  const mine = spec.furnishings.filter((p) => String(p.id).startsWith(`${key}.`) && footShape(p));
  if (!mine.length || !searchable(spec)) return { moved: [], rejected: [], notes: [] };
  const arch = archShapes(spec), others = spec.furnishings.filter((p) => !mine.includes(p)).map(footShape).filter(Boolean) as Shape[];
  const G = makeGrid(spec, [...arch, ...others]), T = navTargets(spec, G), base = reachable(spec, G, T).ok, { lane } = walkways(spec);
  const raw = rawMap(G, [...arch, ...others]), moved: string[] = [], rejected: string[] = [], notes: string[] = [];
  const keeps = (S: Shape) => G.withExtra(G.raster(S), () => { const r = reachable(spec, G, T).ok; return [...base].filter((k) => !r.has(k)); });
  const onLane = (S: Shape) => G.raster(S, 0).some((i) => lane.has(i));
  for (const p of mine) {
    const S0 = footShape(p)!, zone = zoneOf(spec, p.x, p.z), lost0 = keeps(S0), lane0 = onLane(S0);
    let pick: { x: number; z: number; d: number } | null = null;
    if (lost0.length || lane0) {
      for (const [dx, dz, d] of rings(lost0.length ? 1.5 : 0.6)) {
        const q = { ...p, x: r2(p.x + dx), z: r2(p.z + dz) }, S = footShape(q)!;
        if (!fits(spec, G, S, raw, zone) || onLane(S) || keeps(S).length) continue;
        pick = { x: q.x, z: q.z, d }; break;
      }
      if (!pick && lost0.length) for (const [dx, dz, d] of rings(1.5)) { const q = { ...p, x: r2(p.x + dx), z: r2(p.z + dz) }, S = footShape(q)!; if (fits(spec, G, S, raw, zone) && !keeps(S).length) { pick = { x: q.x, z: q.z, d }; break; } }
    }
    if (pick) { notes.push(`${p.type} (${p.id}) moved ${pick.d.toFixed(2)} m to keep the walkway ${lost0.length ? `to ${lost0.slice(0, 3).map((k) => T.find((t) => t.key === k)?.name).join(', ')}` : 'clear'} open`); Object.assign(p, { x: pick.x, z: pick.z }); moved.push(p.id); }
    else if (lost0.length) { notes.push(`${p.type} (${p.id}) rejected: it would block the way to ${lost0.slice(0, 3).map((k) => T.find((t) => t.key === k)?.name).join(', ')} and no nearby spot keeps it open`); spec.furnishings.splice(spec.furnishings.indexOf(p), 1); rejected.push(p.id); continue; }
    const S = footShape(p)!; G.add(S); for (const i of G.raster(S, 0)) raw[i] = 1;
  }
  return { moved, rejected, notes };
}

// ---- after furnishing: smallest set of movable pieces that reconnects every unreachable target
const RANK = (S: Shape) => S.kind === 'element' ? (['planter_bed', 'plinth'].includes(S.type!) ? 2 : 9) : S.kind !== 'furnishing' ? 9
  : /^(plant|floor_lamp|side_table|ottoman|stool|bar_stool|planter|vase|sculpture|statue|crate|pot)/.test(S.type!) ? 0
  : /chair|bench|console|nightstand|stand/.test(S.type!) ? 1 : /table|desk|shelf|cabinet|sideboard/.test(S.type!) ? 3
  : /^(sectional|grand_piano|fireplace|bed_|island)/.test(S.type!) ? 6 : 4;

export function navRepair(spec) {
  const notes: string[] = [], moved: string[] = [], unresolved: string[] = [], skip = new Set<string>();
  if (!searchable(spec)) return { notes, moved, unresolved };
  for (let iter = 0; iter < 12; iter++) {
    const arch = archShapes(spec), furn = spec.furnishings.map(footShape).filter(Boolean) as Shape[], all = [...arch, ...furn];
    const byId = new Map(all.map((s) => [s.id, s])), G = makeGrid(spec, all), T = navTargets(spec, G), R = reachable(spec, G, T);
    const bad = T.filter((t) => !R.ok.has(t.key)); if (!bad.length) break;
    // A performance mark inside furniture follows the furniture: it moves to the nearest reachable floor.
    const lostMark = bad.find((t) => t.kind === 'mark' && G.nearest(t.x, t.z, t.r) < 0);
    if (lostMark) {
      const i = G.nearest(lostMark.x, lostMark.z, 2.5, R.seen), m = spec.marks.find((q) => `mark:${q.id}` === lostMark.key);
      if (i >= 0 && m) { notes.push(`Mark "${m.name}" (${m.id}) stood inside furniture: moved ${Math.hypot(G.px(i) - m.x, G.pz(i) - m.z).toFixed(2)} m to open floor`); m.moved_from ||= { x: m.x, z: m.z }; m.x = r2(G.px(i)); m.z = r2(G.pz(i)); continue; }
    }
    const t = bad.find((b) => !skip.has(b.key) && G.nearest(b.x, b.z, b.r) >= 0);
    if (!t) { unresolved.push(...bad.filter((b) => !skip.has(b.key)).map((b) => `${b.name} (no open floor)`)); break; }
    const tc = G.nearest(t.x, t.z, t.r), tSeen = G.flood(tc), owners = new Map<string, number>();
    for (let i = 0; i < G.N; i++) {
      if (!G.own[i] || !G.floor[i]) continue;
      const x = i % G.nx, near = (s) => [-1, 1, -G.nx, G.nx, -2, 2, -2 * G.nx, 2 * G.nx].some((d) => { const j = i + d; return j >= 0 && j < G.N && Math.abs((j % G.nx) - x) <= 2 && s[j]; });
      const a = near(R.seen), b = near(tSeen); if (a || b) for (const id of G.own[i]!) owners.set(id, (owners.get(id) || 0) | (a ? 1 : 0) | (b ? 2 : 0));
    }
    const cands = [...owners.keys()].filter((id) => RANK(byId.get(id)!) < 9).sort((p, q) => RANK(byId.get(p)!) - RANK(byId.get(q)!) || (owners.get(q)! === 3 ? 1 : 0) - (owners.get(p)! === 3 ? 1 : 0));
    const fixes = (id: string) => { const off = new Set([id]), r = reachable(spec, G, T, off); return r.ok.has(t.key); };
    let done = false;
    for (const id of cands.filter(fixes)) {
      const S0 = byId.get(id)!, isEl = S0.kind === 'element', obj = isEl ? spec.elements.find((e) => e.id === id) : spec.furnishings.find((p) => p.id === id);
      const raw = rawMap(G, all.filter((s) => s.id !== id)), zone = zoneOf(spec, obj.x, obj.z);
      G.drop(id);
      let pick: { x: number; z: number; d: number; gain: number } | null = null;
      for (const [dx, dz, d] of rings(2.5, 0.25, 24)) {
        const q = { ...obj, x: r2(obj.x + dx), z: r2(obj.z + dz) }, S = isEl ? archShapes({ ...spec, walls: [], buildings: [], roofs: [], elements: [q] })[0] : footShape(q)!;
        if (!S || !fits(spec, G, S, raw, zone)) continue;
        const r = G.withExtra(G.raster(S), () => reachable(spec, G, T).ok);
        if (!r.has(t.key) || [...R.ok].some((k) => !r.has(k))) continue;
        pick = { x: q.x, z: q.z, d, gain: r.size - R.ok.size }; break;
      }
      G.add(S0);
      if (!pick) continue;
      obj.moved_from ||= { x: obj.x, z: obj.z };
      notes.push(`${isEl ? `${obj.type} element` : obj.type} (${id}) blocked the way to ${t.name}: moved ${pick.d.toFixed(2)} m to (${pick.x}, ${pick.z}); ${pick.gain} more room/door/mark target(s) reachable`);
      Object.assign(obj, { x: pick.x, z: pick.z }); moved.push(id); done = true; break;
    }
    if (!done) {
      // Leave this region to the report and carry on with the others.
      unresolved.push(`${t.name} (blocked by ${cands.slice(0, 4).join(', ') || [...owners.keys()].slice(0, 4).join(', ')})`);
      for (const b of bad) if (G.nearest(b.x, b.z, b.r, tSeen) >= 0) skip.add(b.key);
      skip.add(t.key);
    }
  }
  if (unresolved.length) notes.push(`Still unreachable after repairs: ${[...new Set(unresolved)].slice(0, 6).join('; ')}`);
  return { notes, moved, unresolved };
}