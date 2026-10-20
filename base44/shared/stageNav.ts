import { MATERIALS, CATALOG_SET } from './stageCapabilities.ts';
import { solidParts } from './stageRepair.ts';
import { circulation, BODY as NAV_BODY } from './stageCirculation.ts';

// Final blueprint checks: a 2D walkability grid (floors + stairs + walkable elements minus walls, buildings and
// solid elements, door/opening gaps kept open), flood-filled from the spawn. Furniture footprints are not in the grid.
const RES = 0.25, BODY = 0.25;
const WALKABLE = ['platform', 'path', 'plaza', 'sidewalk', 'bridge', 'road', 'crosswalk', 'gazebo', 'pergola'];

export function finalChecks(spec) {
  const W = spec.bounds.w, D = spec.bounds.d, nx = Math.ceil(W / RES), nz = Math.ceil(D / RES), N = nx * nz;
  const walk = new Uint8Array(N), block = new Uint8Array(N);
  const ci = (x, z) => { const i = Math.floor((x + W / 2) / RES), k = Math.floor((z + D / 2) / RES); return i < 0 || k < 0 || i >= nx || k >= nz ? -1 : k * nx + i; };
  const rect = (arr, x, z, w, d, ry = 0, pad = 0) => {
    const c = Math.cos(ry), s = Math.sin(ry), R = Math.hypot(w, d) / 2 + pad;
    for (let zz = z - R; zz <= z + R; zz += RES) for (let xx = x - R; xx <= x + R; xx += RES) {
      const dx = xx - x, dz = zz - z;
      if (Math.abs(dx * c - dz * s) <= w / 2 + pad && Math.abs(dx * s + dz * c) <= d / 2 + pad) { const i = ci(xx, zz); if (i >= 0) arr[i] = 1; }
    }
  };
  const disc = (arr, x, z, r) => { for (let zz = z - r; zz <= z + r; zz += RES) for (let xx = x - r; xx <= x + r; xx += RES) if (Math.hypot(xx - x, zz - z) <= r) { const i = ci(xx, zz); if (i >= 0) arr[i] = 1; } };
  const seg = (x1, z1, x2, z2, r, gaps = []) => {
    const L = Math.hypot(x2 - x1, z2 - z1); if (L < 0.01) return;
    for (let u = 0; u <= L; u += RES / 2) { if (gaps.some(([a, b]) => u > a && u < b)) continue; disc(block, x1 + (x2 - x1) * (u / L), z1 + (z2 - z1) * (u / L), r); }
  };

  if (spec.environment === 'outdoor') walk.fill(1);
  for (const f of spec.floors) rect(walk, f.x, f.z, f.w, f.d);
  for (const s of spec.stairs) rect(walk, s.x, s.z, Math.abs(Math.sin(s.dir)) > 0.7 ? s.run : s.w, Math.abs(Math.sin(s.dir)) > 0.7 ? s.w : s.run);
  for (const e of spec.elements) if (WALKABLE.includes(e.type) && e.w && e.d) rect(walk, e.x, e.z, e.w, e.d, e.ry || 0);
  if (!spec.floors.length) walk.fill(1);
  for (const w of spec.walls) {
    const L = Math.hypot(w.x2 - w.x1, w.z2 - w.z1);
    const gaps = w.openings.filter((o) => o.kind === 'door' || o.kind === 'opening').map((o) => [o.at * L - o.w / 2 + BODY, o.at * L + o.w / 2 - BODY]);
    seg(w.x1, w.z1, w.x2, w.z2, w.t / 2 + BODY, gaps);
  }
  for (const b of spec.buildings) rect(block, b.x, b.z, b.w, b.d, b.ry || 0, BODY);
  for (const e of spec.elements) {
    // Same footprints as the engine's colliders (arch posts included).
    for (const p of solidParts(e)) rect(block, p.x, p.z, p.hw * 2, p.hd * 2, 0, BODY);
    if (['fence', 'railing', 'hedge'].includes(e.type) && e.x1 != null) seg(e.x1, e.z1, e.x2, e.z2, 0.2 + BODY);
  }
  const ok = (i) => i >= 0 && walk[i] && !block[i];

  // flood fill from the spawn (nearest open cell within 1.5 m)
  let start = ci(spec.spawn.x, spec.spawn.z);
  if (!ok(start)) { start = -1; for (let r = RES; r <= 1.5 && start < 0; r += RES) for (let a = 0; a < 6.28 && start < 0; a += 0.4) { const i = ci(spec.spawn.x + Math.cos(a) * r, spec.spawn.z + Math.sin(a) * r); if (ok(i)) start = i; } }
  const seen = new Uint8Array(N);
  if (start >= 0) { const q = [start]; seen[start] = 1; while (q.length) { const i = q.pop(), x = i % nx; for (const j of [x > 0 ? i - 1 : -1, x < nx - 1 ? i + 1 : -1, i - nx, i + nx]) if (j >= 0 && j < N && !seen[j] && ok(j)) { seen[j] = 1; q.push(j); } } }
  const reach = (x, z, r = 0.6) => { for (let zz = z - r; zz <= z + r; zz += RES) for (let xx = x - r; xx <= x + r; xx += RES) { const i = ci(xx, zz); if (i >= 0 && seen[i]) return true; } return false; };
  let walkCells = 0, reached = 0; for (let i = 0; i < N; i++) if (ok(i)) { walkCells++; if (seen[i]) reached++; }

  const zoneReach = spec.zones.map((z) => { let a = 0, b = 0; for (let zz = z.z - z.d / 2; zz < z.z + z.d / 2; zz += RES) for (let xx = z.x - z.w / 2; xx < z.x + z.w / 2; xx += RES) { const i = ci(xx, zz); if (ok(i)) { a++; if (seen[i]) b++; } } return { name: z.name, pct: a ? Math.round((b / a) * 100) : 0 }; });
  const badZones = zoneReach.filter((z) => z.pct < 30), badMarks = spec.marks.filter((m) => !reach(m.x, m.z));
  const camInWall = spec.cameras.filter((c) => { const i = ci(c.x, c.z); const wallTop = Math.max(0, ...spec.walls.map((w) => w.y + w.h)); return i >= 0 && block[i] && c.y < wallTop; });
  const nearWall = (p) => spec.walls.some((w) => { const L2 = (w.x2 - w.x1) ** 2 + (w.z2 - w.z1) ** 2 || 1, t = Math.max(0, Math.min(1, ((p.x - w.x1) * (w.x2 - w.x1) + (p.z - w.z1) * (w.z2 - w.z1)) / L2)); return Math.hypot(p.x - (w.x1 + t * (w.x2 - w.x1)), p.z - (w.z1 + t * (w.z2 - w.z1))) < w.t / 2 + 0.05; });
  const embedded = spec.furnishings.filter((p) => p.y == null || p.y < 0.3).filter(nearWall);
  const ids = new Set(), dup = []; for (const sec of ['zones', 'floors', 'walls', 'roofs', 'stairs', 'buildings', 'elements', 'nature', 'furnishings', 'vfx', 'lights', 'cameras', 'marks']) for (const o of spec[sec]) { if (ids.has(o.id)) dup.push(o.id); ids.add(o.id); }
  const mats = new Set([spec.ground.material, ...['floors', 'walls', 'roofs', 'stairs', 'elements'].flatMap((k) => spec[k].map((o) => o.material).filter(Boolean)), ...spec.buildings.map((b) => b.facade)]);
  const badMats = [...mats].filter((m) => !MATERIALS[m]), badTypes = spec.furnishings.filter((p) => !CATALOG_SET.has(p.type));

  const nav = circulation(spec);
  const C = (id, label, pass, detail, soft) => ({ id, label, status: pass ? 'pass' : soft ? 'warn' : 'fail', detail });
  const checks = [
    C('spawn', 'Spawn on walkable floor', start >= 0, start >= 0 ? 'Player start is on open floor' : 'No open floor within 1.5 m of the spawn'),
    C('navigation', 'Every room, doorway and mark reachable with furniture collision', !nav.bad.length, nav.bad.length ? `Blocked on the furnished stage (${NAV_BODY} m body): ${nav.bad.slice(0, 10).map((t) => t.name).join(', ')}` : `${nav.T.length} targets reachable from the spawn (${nav.T.filter((t) => t.kind === 'room').length} rooms, ${nav.T.filter((t) => t.kind === 'door').length} door approaches, ${nav.T.filter((t) => t.kind === 'mark').length} marks) with every solid furnishing in place`),
    C('zones', 'Rooms connected by doorways (architecture only)', !badZones.length, badZones.length ? `Not reachable from the spawn: ${badZones.map((z) => `${z.name} (${z.pct}%)`).join(', ')}` : `${zoneReach.length} rooms reachable (${zoneReach.map((z) => `${z.name} ${z.pct}%`).join(', ')})`),
    C('coverage', 'Walkable area connected', walkCells > 0 && reached / walkCells > 0.85, `${Math.round((reached / Math.max(1, walkCells)) * 100)}% of the walkable area connects to the spawn (${Math.round(reached * RES * RES)} m²)`, true),
    C('marks', 'Floor marks reachable', !badMarks.length, badMarks.length ? `Unreachable: ${badMarks.map((m) => m.name).join(', ')}` : `${spec.marks.length} marks reachable`, true),
    C('cameras', 'Production cameras clear of walls', !camInWall.length && spec.cameras.length > 0, camInWall.length ? `Inside a wall: ${camInWall.map((c) => c.name).join(', ')}` : `${spec.cameras.length} cameras`, true),
    C('collision', 'Furniture clear of walls', !embedded.length, embedded.length ? `${embedded.length} floor pieces sit inside a wall line: ${embedded.slice(0, 8).map((p) => `${p.type} (${p.id})`).join(', ')}` : 'No floor furniture intersects a wall', true),
    C('materials', 'All materials supported', !badMats.length, badMats.length ? `Unknown: ${badMats.join(', ')}` : `${mats.size} registry materials in use`),
    C('references', 'Object references valid', !dup.length && !badTypes.length, dup.length || badTypes.length ? `Duplicate ids: ${dup.slice(0, 6).join(', ') || 'none'}; unknown furnishings: ${badTypes.length}` : `${ids.size} objects with unique ids, all furnishings in the catalog`),
  ];
  return { checks, note: 'Navigation uses the engine collision on a 0.25 m grid: wall runs between door/opening gaps, element colliders and every solid floor furnishing (measured catalog footprints, compound shapes for irregular pieces) with the player body. The architecture-only check (below) is a 2D blueprint check on a 0.25 m grid (walls, buildings and solid elements block; door and opening gaps are walkable). Furniture footprints are not part of this grid; the in-engine collider check happens when the stage is opened.', checked_at: new Date().toISOString() };
}