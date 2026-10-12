import * as THREE from 'three';
import { face } from '../market/merge';
import { WEDGES } from './layout';
import { kit, groundFloor, signAt, G } from './frontage';
import { SIGN } from './signs';

// Wedge parcels: glass-and-metal flatirons on the sharp corners, and the two tapering blocks
// between the avenues — the Broadcast House (north) and Apex Rooftop (south) — facing the square.
function inset(poly, d) {
  const n = poly.length, lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
    let nx = dz / L, nz = -dx / L; const cx = poly.reduce((s, p) => s + p[0], 0) / n, cz = poly.reduce((s, p) => s + p[1], 0) / n;
    if (nx * (cx - a[0]) + nz * (cz - a[1]) < 0) { nx = -nx; nz = -nz; }
    return { p: [a[0] + nx * d, a[1] + nz * d], d: [dx / L, dz / L] };
  });
  return lines.map((A, i) => {
    const B = lines[(i + n - 1) % n], den = A.d[0] * B.d[1] - A.d[1] * B.d[0];
    const t = ((B.p[0] - A.p[0]) * B.d[1] - (B.p[1] - A.p[1]) * B.d[0]) / den;
    return [A.p[0] + A.d[0] * t, A.p[1] + A.d[1] * t];
  });
}
function prism(poly, y0, h) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))), { depth: h, bevelEnabled: false });
  g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); return g;
}
function edges(poly) {
  const n = poly.length, cx = poly.reduce((s, p) => s + p[0], 0) / n, cz = poly.reduce((s, p) => s + p[1], 0) / n;
  return poly.map((a, i) => {
    const b = poly[(i + 1) % n], dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let nx = dz / L, nz = -dx / L; if (nx * (m[0] - cx) + nz * (m[1] - cz) < 0) { nx = -nx; nz = -nz; }
    return { a, b, m, L, n: [nx, nz], yaw: Math.atan2(nx, nz), c: [cx, cz] };
  });
}
// Extruded faces carry world-metre UVs, so the curtain wall needs its own 24 m × 28.8 m repeat.
function worldCurtain(K, mat) {
  K.wc ||= new Map();
  if (!K.wc.has(mat)) { const m = mat.clone(); for (const k of ['map', 'emissiveMap']) { m[k] = mat[k].clone(); m[k].repeat.set(1 / 24, 1 / 28.8); } K.wc.set(mat, m); }
  return K.wc.get(mat);
}
function shell(K, w, H, cur, roofDeck = false) {
  const M = K.M, E = edges(w.poly);
  K.occ.add(M.granite, prism(inset(w.poly, 0.7), 0, G), 0, 0, 0);
  K.occ.add(worldCurtain(K, cur), prism(w.poly, G, H - G), 0, 0, 0);
  for (let y = G; y < H - 2; y += 3.6 * 3) K.mg.add(M.bronze, prism(inset(w.poly, -0.12), y, 0.25), 0, 0, 0);
  K.mg.add(M.neon.white, prism(inset(w.poly, 0.4), H, 0.35), 0, 0, 0);
  if (!roofDeck) K.mg.add(M.steel, prism(inset(w.poly, 3), H, 2.4), 0, 0, 0);
  for (const e of E) {
    const c = kit(K, face(e.m[0], e.m[1], e.yaw));
    K.e.colliders.addBox(e.m[0] - e.n[0] * 1, e.m[1] - e.n[1] * 1, e.L / 2, 1, e.yaw);
    if (e.L < 5) { c.put(M.granite, 0, G / 2, -0.35, e.L + 0.05, G, 0.7); continue; }
    const shop = Math.max(2, e.L - 4.4);
    groundFloor(K, c, e.L - 0.4, M.granite, [{ t: 'pier', w: 0.6 }, { t: 'shop', w: shop / 2, kind: w.kind === 'block' ? 'gallery' : 'boutique', light: '#fff2dc' }, { t: 'door', w: 2.2, kind: 'lobby' }, { t: 'shop', w: shop / 2, kind: 'cafe', light: '#ffe2bc' }, { t: 'pier', w: 0.6 }], { frame: M.steel, light: '#fff2dc' });
  }
  K.e.colliders.addCircle(w.x, w.z, 4);
  return E;
}

export function buildWedges(K) {
  const M = K.M, chans = ['music', 'cards', 'weather', 'live'];
  let fi = 0;
  for (const w of WEDGES) {
    if (w.kind === 'flatiron') {
      const H = 58 + K.R() * 36, E = shell(K, w, H, [M.curtainCool, M.curtainMix, M.curtainWarm][fi % 3]);
      // A wraparound corner screen on the two faces that meet at the chamfered tip.
      for (const e of [E[0], E[E.length - 2]]) {
        const tip = e === E[0] ? 1 : -1, p = [e.m[0] + (e.b[0] - e.a[0]) * -0.3 * tip + e.n[0] * 0.25, e.m[1] + (e.b[1] - e.a[1]) * -0.3 * tip + e.n[1] * 0.25];
        K.screens.add(p[0], 16, p[1], e.yaw, 9, 5.06, chans[fi % 4], ['#ff7ae0', '#ffd86a', '#c7b8ff', '#6ff0ff'][fi % 4]);
      }
      fi++;
    } else if (w.id === 'broadcast') {
      const E = shell(K, w, 72, M.curtainCool), f = E[0], c = kit(K, face(f.m[0], f.m[1], f.yaw));
      K.screens.add(f.m[0] + f.n[0] * 0.3, 22, f.m[1] + f.n[1] * 0.3, f.yaw, 28, 15.75, 'zfnn', '#8fb8ff');
      K.screens.add(f.m[0] + f.n[0] * 0.3, 7.4, f.m[1] + f.n[1] * 0.3, f.yaw, 34, 3.2, 'ribbon', '#ffcc4a');
      signAt(K, c, 0, 11, 0.3, 22, 2.4, 'STAR SQUARE BROADCAST HOUSE', SIGN.channel('#ffffff'));
      for (const e of [E[1], E[5]]) K.screens.add(e.m[0] + e.n[0] * 0.3, 30, e.m[1] + e.n[1] * 0.3, e.yaw, 12, 6.75, e === E[1] ? 'style' : 'arts', '#ff9ad8');
      K.interact.push({ x: f.m[0] + f.n[0] * 3, z: f.m[1] + f.n[1] * 3, verb: 'Watch', label: 'ZFNN studio', text: 'ZFNN is broadcasting from the studio windows — all programming is fictional.' });
    } else {
      const E = shell(K, w, 34, M.curtainWarm, true), f = E[0], c = kit(K, face(f.m[0], f.m[1], f.yaw));
      signAt(K, c, 0, G + 1.2, 0.3, 14, 1.8, 'APEX ROOFTOP', SIGN.lux('#f6e2b8'));
      K.screens.add(E[1].m[0] + E[1].n[0] * 0.3, 18, E[1].m[1] + E[1].n[1] * 0.3, E[1].yaw, 9, 16, 'tall', '#ff9ad8');
      rooftop(K, w, 34);
    }
  }
}
// Apex Rooftop: a lounge terrace with a canopy, furniture, planters and string lights above the lobby.
function rooftop(K, w, H) {
  const M = K.M, ring = inset(w.poly, 0.6), E = edges(ring);
  for (const e of E) { K.mg.add(M.storeGlass, new THREE.PlaneGeometry(e.L, 1.1), e.m[0], H + 0.55, e.m[1], 0, e.yaw); K.mg.box(M.chrome, e.m[0], H + 1.12, e.m[1], e.L, 0.06, 0.08, e.yaw, 0); }
  const cx = w.x, cz = w.z;
  for (const [dx, dz] of [[-9, -4], [9, -4], [-9, 4], [9, 4]]) K.mg.add(M.steel, new THREE.CylinderGeometry(0.1, 0.1, 3.2, 6), cx + dx, H + 1.6, cz + dz);
  K.mg.box(M.canvas, cx, H + 3.3, cz, 19, 0.15, 9, 0, 0);
  for (let i = 0; i < 18; i++) K.mg.add(M.bulbs, new THREE.SphereGeometry(0.07, 6, 4), cx - 9 + i * (18 / 17), H + 3.1 - Math.sin((i / 17) * Math.PI) * 0.4, cz + 4.4);
  for (let i = 0; i < 5; i++) { K.mg.add(M.stoneWhite, new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12), cx - 7 + i * 3.5, H + 0.76, cz); K.mg.add(M.chrome, new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), cx - 7 + i * 3.5, H + 0.38, cz); }
  for (const dx of [-11, 11]) { K.mg.add(M.terracotta, new THREE.CylinderGeometry(0.5, 0.4, 0.8, 8), cx + dx, H + 0.4, cz); K.mg.add(M.frond, new THREE.ConeGeometry(1.2, 2, 7), cx + dx, H + 1.8, cz); }
  K.pool.add(cx, H + 2.5, cz, '#ffd58a', 8, 18);
}