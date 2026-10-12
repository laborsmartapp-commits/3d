import * as THREE from 'three';
import { face } from '../market/merge';
import { CURB, LOTS, WEDGES, pip } from './layout';

export const G = 4.8, U = 3.4;
// Tools for one façade frame F (u along the wall, d outward, y up).
export function kit(K, F) {
  const put = (mat, u, y, d, w, h, dd, tile = 2, rx = 0) => { const p = F.at(u, d); K.mg.box(mat, p.x, y, p.z, w, h, dd, F.yaw, tile, rx); };
  const plane = (mat, u, y, d, w, h, geo) => { const p = F.at(u, d); K.mg.add(mat, geo || new THREE.PlaneGeometry(w, h), p.x, y, p.z, 0, F.yaw); };
  const at = (u, d) => F.at(u, d);
  return { F, put, plane, at };
}
export const lotFace = (K, l) => ({ ...kit(K, face(l.fx, l.fz, l.yaw)), l });
export function sideFace(K, l, side) {
  const F = face(l.fx, l.fz, l.yaw), p = F.at(side * l.w / 2, -l.d / 2);
  return kit(K, face(p.x, p.z, l.yaw + side * Math.PI / 2));
}
const inLot = (o, x, z) => { const dx = x - o.x, dz = z - o.z; return Math.abs(dx * o.t[0] + dz * o.t[1]) < o.w / 2 && Math.abs(dx * o.n[0] + dz * o.n[1]) < o.d / 2; };
export function exposed(l, side) {
  const p = face(l.fx, l.fz, l.yaw).at(side * (l.w / 2 + 2.2), -l.d / 2);
  return !LOTS.some((o) => o !== l && inLot(o, p.x, p.z)) && !WEDGES.some((w) => pip(w.poly, p.x, p.z));
}

// Occupancy noise: stable, clustered lighting (~25–30% of upper windows), never a checkerboard.
const h2 = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1);
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
export function winMat(K, seed, floor, col, hood) {
  const v = vnoise(col * 0.55 + seed * 7.3, floor * 0.85 + seed * 3.1), M = K.M;
  K.stats.win++;
  if (v < 0.63) return v < 0.32 ? M.winDim2 : M.winDim;
  K.stats.lit++;
  return hood === 'core' ? (v > 0.8 ? M.winWarm : M.winCool) : hood === 'palm' ? (v > 0.78 ? M.winHotel : M.winHome) : v > 0.79 ? M.winHome : M.winWarm;
}
// A window with its own trim style: sash, carved, deco, iron, band, port.
export function windowAt(K, c, u, y, w, h, style, mat) {
  const { put, plane } = c, M = K.M;
  if (style === 'port') { plane(mat, u, y, 0.06, 0, 0, new THREE.CircleGeometry(h / 2, 18)); const p = c.at(u, 0.1); K.mg.add(M.chrome, new THREE.TorusGeometry(h / 2, 0.07, 6, 18), p.x, y, p.z, 0, c.F.yaw); return; }
  plane(mat, u, y, 0.06, w, h);
  if (style === 'band') return;
  const tm = style === 'carved' ? M.sandstone : style === 'iron' ? M.trimDark : M.trim;
  put(tm, u, y + h / 2 + 0.15, 0.12, w + (style === 'carved' ? 0.7 : 0.35), style === 'carved' ? 0.42 : 0.26, 0.24);
  put(tm, u, y - h / 2 - 0.08, 0.16, w + 0.3, 0.14, 0.32);
  if (style === 'carved' || style === 'sash') for (const s of [-1, 1]) put(tm, u + s * (w / 2 + 0.08), y, 0.1, 0.16, h, 0.2);
  if (style === 'deco') put(M.trim, u, y + h / 2 + 0.3, 0.4, w + 0.8, 0.1, 0.8);
}
export function windowRows(K, c, span, y0, floors, fh, style, seed, hood, { from = 1, ww = 1.3, wh = 1.9, gap = 3 } = {}) {
  const cols = Math.max(1, Math.floor((span - 1.2) / gap));
  for (let k = from; k < floors; k++) for (let i = 0; i < cols; i++) {
    const u = -((cols - 1) * gap) / 2 + i * gap, y = y0 + (k - from) * fh + fh * 0.52;
    windowAt(K, c, u, y, ww, wh, style, winMat(K, seed, k, i, hood));
  }
}

// A lit ground-floor bay plan across the whole frontage: shops, doors, roll-ups and piers.
// Glazing sits in a 0.7 m recess, so the interior is seen with real depth behind the glass.
export function groundFloor(K, c, W, wall, bays, o = {}) {
  // An enterable venue's ground floor is its real interior (see interiors.js); only the sign stays.
  if (c.l?.venue?.enter) { if (o.sign) signAt(K, c, o.sign.u || 0, G - 0.45, 0.12, o.sign.w || Math.min(W * 0.7, 9), 1.1, o.sign.text, o.sign.style, o.light); return; }
  const { put, plane } = c, M = K.M, light = o.light || '#ffcf94', total = bays.reduce((a, b) => a + b.w, 0);
  let u = -W / 2, k = W / total;
  for (const b of bays) {
    const w = b.w * k, uc = u + w / 2; u += w;
    if (b.t === 'pier') { put(wall, uc, G / 2, -0.35, w + 0.02, G, 0.7); continue; }
    put(wall, uc, G - 0.45, -0.35, w, 0.9, 0.7);
    if (b.t === 'shop') {
      const h = 3.1, y = CURB + 0.5 + h / 2;
      plane(M.interiors[b.kind || 'boutique'], uc, y, -0.66, w - 0.1, h);
      plane(M.storeGlass, uc, y, -0.12, w - 0.1, h);
      const fm = o.frame || M.iron, n = Math.max(1, Math.round(w / 2.6));
      for (let m = 0; m <= n; m++) put(fm, uc - w / 2 + (m * w) / n, y, -0.1, 0.1, h, 0.12, 0);
      put(fm, uc, y + h / 2, -0.1, w, 0.14, 0.14, 0); put(o.base || M.trimDark, uc, CURB + 0.25, -0.08, w, 0.5, 0.2);
      K.pool.add(c.at(uc, 1.2).x, 2.8, c.at(uc, 1.2).z, b.light || light, 5, 12);
      const s = c.at(uc, 2.2); K.spill.pool(s.x, CURB, s.z, w * 0.45 + 1.8, b.light || light, 0.55);
    } else if (b.t === 'door') {
      plane(M.interiors[b.kind || 'lobby'], uc, CURB + 1.5, -0.66, w - 0.2, 2.8);
      plane(M.storeGlass, uc, CURB + 1.5, -0.2, w - 0.2, 2.8);
      put(o.door || M.bronze, uc, CURB + 2.95, -0.15, w, 0.12, 0.2, 0);
      for (const s of [-1, 1]) { put(o.door || M.bronze, uc + s * (w / 2 - 0.05), CURB + 1.5, -0.15, 0.1, 2.9, 0.2, 0); put(M.sconce, uc + s * (w / 2 + 0.3), 2.6, 0.08, 0.16, 0.3, 0.16, 0); }
      put(M.granite, uc, CURB + 0.06, -0.2, w + 0.4, 0.12, 1.2);
      const s = c.at(uc, 1.5); K.spill.pool(s.x, CURB, s.z, 2.4, '#ffc27a', 0.5); K.pool.add(s.x, 2.6, s.z, '#ffc27a', 3, 8);
    } else if (b.t === 'roll') {
      plane(M.rollup, uc, CURB + 1.7, -0.3, w - 0.3, 3.2);
      put(M.steel, uc, CURB + 3.4, -0.2, w, 0.3, 0.4);
      put(M.downlight, uc, CURB + 3.7, 0.15, 0.4, 0.2, 0.3, 0);
      const s = c.at(uc, 1.8); K.spill.pool(s.x, CURB, s.z, 3, '#dfe6ff', 0.45); K.pool.add(s.x, 3.6, s.z, '#e6ecff', 3, 9);
    } else if (b.t === 'blank') {
      put(wall, uc, G / 2 - 0.45, -0.35, w, G - 0.9, 0.7);
      put(M.sconce, uc, 3, 0.05, 0.25, 0.35, 0.2, 0);
      const s = c.at(uc, 0.06); K.spill.wash(s.x, 2.6, s.z, c.F.yaw, 3, 3.6, '#ffc27a', 0.5);
      if (b.poster != null) plane(K.signs.posterMat, uc, 1.7, 0.04, 1, 1, K.signs.posterQuad(b.poster, 1.1, 1.1));
    }
  }
  if (o.sign) signAt(K, c, o.sign.u || 0, G - 0.45, 0.12, o.sign.w || Math.min(W * 0.7, 9), 1.1, o.sign.text, o.sign.style, light);
}
export function signAt(K, c, u, y, d, w, h, text, style, light = '#ffd9a8') {
  c.plane(K.signs.mat, u, y, d, w, h, K.signs.quad(K.signs.text(text, style), w, h));
  const s = c.at(u, 0.1); K.spill.wash(s.x, y + 0.2, s.z, c.F.yaw, w + 2, 3.2, style.glow || light, 0.35);
}
// Striped awning over a span with downlights beneath it.
export function awning(K, c, u, w, mat, y = G - 1.1, depth = 1.8) {
  const p = c.at(u, depth / 2);
  K.mg.add(mat, new THREE.PlaneGeometry(w, depth * 1.12), p.x, y, p.z, -Math.PI / 2 + 0.45, c.F.yaw);
  for (let i = 0; i < Math.max(1, Math.floor(w / 2.5)); i++) c.put(K.M.downlight, u - w / 2 + 1.25 + i * 2.5, y - 0.3, depth * 0.55, 0.22, 0.05, 0.22, 0);
}
// Café tables on the terrace in front of a frontage, leaving the walking lane clear.
export function terrace(K, c, u, w, k = 0) {
  const M = K.M, n = Math.max(1, Math.floor(w / 3.2));
  for (let i = 0; i < n; i++) {
    const uu = u - w / 2 + 1.6 + i * 3.2, p = c.at(uu, 2.6);
    K.mg.add(M.chrome, new THREE.CylinderGeometry(0.04, 0.05, 0.72, 6), p.x, CURB + 0.36, p.z);
    K.mg.add(M.stoneWhite, new THREE.CylinderGeometry(0.4, 0.4, 0.04, 14), p.x, CURB + 0.74, p.z);
    if ((i + k) % 2 === 0) { K.mg.add(M.chrome, new THREE.CylinderGeometry(0.03, 0.03, 2.4, 5), p.x, CURB + 1.2, p.z); K.mg.add(M.umbrella[(i + k) % 3], new THREE.ConeGeometry(1.4, 0.5, 10, 1, true), p.x, CURB + 2.45, p.z); }
    for (const s of [-1, 1]) {
      const q = c.at(uu + s * 0.75, 2.6);
      K.mg.add(M.iron, new THREE.BoxGeometry(0.42, 0.05, 0.42), q.x, CURB + 0.45, q.z, 0, c.F.yaw);
      K.mg.add(M.iron, new THREE.BoxGeometry(0.42, 0.45, 0.04), q.x + Math.cos(c.F.yaw) * s * 0.2, CURB + 0.7, q.z - Math.sin(c.F.yaw) * s * 0.2, 0, c.F.yaw + Math.PI / 2);
      K.seats.push({ x: q.x, z: q.z, yaw: c.F.yaw - s * Math.PI / 2, y: CURB + 0.48 });
    }
    K.mg.add(M.cup, new THREE.CylinderGeometry(0.04, 0.035, 0.09, 6), p.x + 0.1, CURB + 0.8, p.z);
    K.spill.pool(p.x, CURB, p.z, 1.6, '#ffd6a0', 0.35);
  }
  const pl = c.at(u - w / 2 + 0.4, 1.3);
  K.mg.add(M.terracotta, new THREE.CylinderGeometry(0.35, 0.28, 0.6, 8), pl.x, CURB + 0.3, pl.z);
  K.mg.add(M.plant, new THREE.SphereGeometry(0.45, 7, 5), pl.x, CURB + 0.85, pl.z);
}