import * as THREE from 'three';
import { box, place, textPlane } from '../geo';
import { BASE, CURB } from './layout';

const SHOPS = ['Comet Café', 'Star Charts', 'Nebula Books', 'Orrery & Co', 'Moonstone Jewels', 'Celestial Teas', 'Zodiac Tailor', 'Astral Bakery', 'Aurora Florist', 'Meteor Games', 'Lunar Lanterns', 'Sextant Maps'];
const FH = 3.6, D = 12;
const TILE = { brick: 2, sandstone: 3, brickRed: 2, marble: 3 };
const signs = new WeakMap();

// Shop signs share one texture per name and width within a scene.
function signMesh(e, text, w) {
  let c = signs.get(e);
  if (!c) { c = new Map(); signs.set(e, c); }
  const k = text + '|' + w;
  if (!c.has(k)) c.set(k, textPlane(text, w, 0.9, '#1d2a44', '#f3e2b3'));
  const m = c.get(k);
  return new THREE.Mesh(m.geometry, m.material);
}

// One continuous row of 3–5 storey shop buildings whose fronts face the street.
// axis 'z': facade runs along z at x = f; axis 'x': facade runs along x at z = f.
// side = +1 when the buildings extend toward +f, -1 toward -f. a0..a1 = extent along the facade.
export function buildRow(e, side, f, a0, a1, r, opt = {}) {
  const { scene, mats: M, batch: B } = e;
  const X = opt.axis === 'x';
  const P = (v, u) => (X ? [u, v] : [v, u]);
  const add = (mat, v, y, u, sv, sy, su) => { const [x, z] = P(v, u); if (X) B.add(mat, x, y, z, su, sy, sv); else B.add(mat, x, y, z, sv, sy, su); };
  const put = (mesh, v, y, u) => { const [x, z] = P(v, u); return place(scene, mesh, x, y, z); };
  const walls = (opt.walls || ['brick', 'sandstone', 'brickRed', 'marble']).map((k) => [M[k], TILE[k]]);
  const out = (d) => f - side * d;
  let u = a0;
  while (u < a1 - 6) {
    const w = Math.min(a1 - u, 10 + Math.floor(r() * 6)), uc = u + w / 2;
    const floors = 3 + Math.floor(r() * 3), H = floors * FH + 1.2, [wall, tile] = walls[Math.floor(r() * walls.length)];
    const body = put(X ? box(w, H, D, wall, tile) : box(D, H, w, wall, tile), f + side * (D / 2), BASE + H / 2, uc);
    e.occluders.push(body);
    const [cx, cz] = P(f + side * (D / 2), uc);
    if (X) e.colliders.addBox(cx, cz, w / 2, D / 2, 0); else e.colliders.addBox(cx, cz, D / 2, w / 2, 0);
    const g0 = BASE + CURB;
    add(M.trim, out(0.15), g0 + 0.35, uc, 0.3, 0.7, w);
    const pane = (w - 3.2) / 2;
    for (const s of [-1, 1]) {
      const pu = uc + s * (1.6 + pane / 2);
      add(M.glass, out(0.05), g0 + 2.05, pu, 0.1, 2.5, pane);
      add(M.iron, out(0.1), g0 + 3.35, pu, 0.14, 0.12, pane + 0.1);
      add(M.iron, out(0.1), g0 + 2.05, pu, 0.12, 2.5, 0.08);
    }
    add(M.wood, out(0.06), g0 + 1.35, uc, 0.12, 2.7, 1.5);
    add(M.gold, out(0.14), g0 + 1.3, uc + 0.5, 0.06, 0.08, 0.08);
    const awMat = M.awnings[Math.floor(r() * M.awnings.length)];
    const aw = X ? box(w - 1.2, 0.06, 2.4, awMat, 1) : box(2.4, 0.06, w - 1.2, awMat, 1);
    if (X) aw.rotation.x = -side * 0.38; else aw.rotation.z = side * 0.38;
    put(aw, out(1.1), g0 + 3.9, uc);
    for (const s of [-1, 1]) add(M.iron, out(2.1), g0 + 3.5, uc + s * (w / 2 - 0.8), 0.04, 0.9, 0.04);
    const sw = Math.min(6, w - 3);
    const sign = signMesh(e, SHOPS[Math.floor(r() * SHOPS.length)], sw);
    sign.rotation.y = X ? (side > 0 ? Math.PI : 0) : -side * Math.PI / 2;
    put(sign, out(0.09), g0 + 4.75, uc);
    add(M.wood, out(0.04), g0 + 4.75, uc, 0.06, 1.05, sw + 0.2);
    const n = Math.max(2, Math.floor((w - 1) / 2.6)), step = w / n, balc = r() < 0.6;
    for (let fl = 1; fl < floors; fl++) {
      const y0 = BASE + fl * FH, y = y0 + 1.7;
      add(M.trim, out(0.1), y0 + 0.1, uc, 0.2, 0.2, w);
      for (let i = 0; i < n; i++) {
        const wu = u + step * (i + 0.5);
        add(M.glass, out(0.02), y, wu, 0.06, 1.8, 1.15);
        add(M.trim, out(0.08), y, wu - 0.64, 0.16, 1.9, 0.12);
        add(M.trim, out(0.08), y, wu + 0.64, 0.16, 1.9, 0.12);
        add(M.trim, out(0.16), y - 1.0, wu, 0.32, 0.12, 1.5);
        add(M.trim, out(0.12), y + 1.02, wu, 0.24, 0.2, 1.45);
      }
      if (balc && fl % 2 === 1) {
        const bw = Math.min(w - 2, step * 2 + 1);
        add(M.trim, out(0.7), y0 + 0.12, uc, 1.4, 0.2, bw);
        add(M.iron, out(1.35), y0 + 1.15, uc, 0.06, 0.06, bw);
        for (let k = 0; k <= Math.round(bw / 0.28); k++) add(M.iron, out(1.35), y0 + 0.65, uc - bw / 2 + k * 0.28, 0.035, 0.95, 0.035);
        for (const s of [-1, 1]) add(M.iron, out(0.7), y0 + 1.15, uc + s * bw / 2, 1.4, 0.06, 0.06);
      }
    }
    add(M.trim, out(0.25), BASE + H - 0.9, uc, 0.7, 0.35, w);
    add(M.trim, out(0.1), BASE + H - 0.55, uc, 0.35, 0.25, w);
    add(M.trim, f + side * (D / 2), BASE + H + 0.05, uc, D, 0.12, w);
    u += w;
  }
}