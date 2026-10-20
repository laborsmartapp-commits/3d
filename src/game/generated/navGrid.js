// Walkability over the LIVE engine: the real colliders (walls, arches, planters, set pieces with their compound
// shapes) tested with the player's own radius at standing height, on the stage's floor slabs. Every cell keeps the
// list of colliders that close it, so an obstruction can be named and "what if X moved" is a cheap re-flood.
export const RES = 0.25, RAD = 0.35;

export function navGrid(e, spec, L) {
  const W = spec.bounds.w, D = spec.bounds.d, nx = Math.ceil(W / RES), nz = Math.ceil(D / RES), N = nx * nz, C = e.colliders;
  const floor = new Uint8Array(N), blockers = new Array(N);
  const px = (i) => -W / 2 + ((i % nx) + 0.5) * RES, pz = (i) => -D / 2 + (Math.floor(i / nx) + 0.5) * RES;
  const onSlab = (x, z) => spec.environment === 'outdoor' || !spec.floors.length || spec.floors.some((f) => Math.abs(x - f.x) <= f.w / 2 && Math.abs(z - f.z) <= f.d / 2);
  for (let i = 0; i < N; i++) {
    const x = px(i), z = pz(i); if (!onSlab(x, z)) continue;
    floor[i] = 1;
    const y = L.baseGroundAt(x, z, 0) + 0.5, b = [];
    for (const o of C.query(x, z, RAD + 1)) if (y >= o.y0 && y <= o.y1 && C.contains(o, x, z, RAD)) b.push(o);
    if (b.length) blockers[i] = b;
  }
  const cell = (x, z) => { const i = Math.floor((x + W / 2) / RES), k = Math.floor((z + D / 2) / RES); return i < 0 || k < 0 || i >= nx || k >= nz ? -1 : k * nx + i; };
  const open = (i, off) => floor[i] && (!blockers[i] || (off && blockers[i].every((o) => off.has(o))));
  // 8-connected flood; a diagonal step needs both side cells open (no corner cutting).
  const flood = (start, off) => {
    const seen = new Int32Array(N).fill(-2); if (start < 0 || !open(start, off)) return seen;
    const q = [start]; seen[start] = -1;
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % nx;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        if ((dx > 0 && x === nx - 1) || (dx < 0 && x === 0)) continue;
        const j = i + dx + dz * nx; if (j < 0 || j >= N || seen[j] !== -2 || !open(j, off)) continue;
        if (dx && dz && (!open(i + dx, off) || !open(i + dz * nx, off))) continue;
        seen[j] = i; q.push(j);
      }
    }
    return seen;
  };
  // Nearest open cell to a point (optionally only cells already in a flood).
  const nearest = (x, z, r = 1.7, seen, off) => {
    let best = -1, bd = 1e9;
    for (let zz = z - r; zz <= z + r; zz += RES) for (let xx = x - r; xx <= x + r; xx += RES) {
      const i = cell(xx, zz); if (i < 0 || !open(i, off) || (seen && seen[i] === -2)) continue;
      const d = Math.hypot(px(i) - x, pz(i) - z); if (d <= r && d < bd) { bd = d; best = i; }
    }
    return best;
  };
  const pathTo = (seen, j) => { const out = []; for (let i = j; i >= 0; i = seen[i]) out.push({ x: px(i), z: pz(i) }); return out.reverse(); };
  return { nx, nz, N, floor, blockers, px, pz, cell, open, flood, nearest, pathTo };
}

const nameOf = (o) => (o.owner ? `${o.label ? `${o.label} ` : ''}${o.owner}`.trim() : o.tag || 'collider');

// Smallest set of colliders (by owner) whose removal connects `target` to the start flood: single owners first,
// then pairs among the owners lining the boundary between the two regions.
export function obstruction(G, start, target) {
  const a = G.flood(start), tSeen = G.flood(target), owners = new Map(), sideA = new Set(), sideT = new Set();
  for (let i = 0; i < G.N; i++) {
    if (!G.blockers[i] || !G.floor[i]) continue;
    const x = i % G.nx, near = (s) => [-1, 1, -G.nx, G.nx, -2, 2, -2 * G.nx, 2 * G.nx].some((d) => { const j = i + d; return j >= 0 && j < G.N && Math.abs((j % G.nx) - x) <= 2 && s[j] !== -2; });
    const nA = near(a), nT = near(tSeen); if (!nA && !nT) continue;
    for (const o of G.blockers[i]) { const k = nameOf(o); if (!owners.has(k)) owners.set(k, new Set()); owners.get(k).add(o); if (nA) sideA.add(k); if (nT) sideT.add(k); }
  }
  const all = (keys) => new Set(keys.flatMap((k) => [...owners.get(k)]));
  const ok = (keys) => G.flood(start, all(keys))[target] !== -2;
  // Owners lining both sides first (a single piece spanning the gap), then the rest; walls and bounds last.
  const rank = (k) => (sideA.has(k) && sideT.has(k) ? 0 : 1) + (/^(wall|bounds|glass)|\bW\d+$/.test(k) ? 2 : 0);
  const keys = [...owners.keys()].sort((p, q) => rank(p) - rank(q)).slice(0, 16);
  for (const k of keys) if (ok([k])) return { owners: [k], candidates: keys };
  const top = keys.slice(0, 10);
  for (let i = 0; i < top.length; i++) for (let j = i + 1; j < top.length; j++) if (ok([top[i], top[j]])) return { owners: [top[i], top[j]], candidates: keys };
  return { owners: [], candidates: keys };
}