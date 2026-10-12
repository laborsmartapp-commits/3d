import * as THREE from 'three';
import { SIDEWALKS, COURTS, SPACES, CURB, inPlaza, rng, ENV } from './layout';

// Street furniture with honest wear, lamps that genuinely light the walk, palms, service clutter,
// the gallery courtyard walls and a layered backdrop skyline.
const LAMP = { core: ['#e8eeff', 'modern'], south: ['#ffb866', 'acorn'], palm: ['#ffc6e0', 'deco'] };
const nearFight = (x, z, pad = 3) => SPACES.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + pad);

function lamp(K, x, z, hood, yaw) {
  const { M, mg } = K, [col, kind] = LAMP[hood], y = CURB;
  mg.add(kind === 'acorn' ? M.iron : kind === 'deco' ? M.chrome : M.steel, new THREE.CylinderGeometry(0.08, 0.12, kind === 'modern' ? 7 : 4.6, 8), x, y + (kind === 'modern' ? 3.5 : 2.3), z);
  mg.add(M.iron, new THREE.CylinderGeometry(0.2, 0.24, 0.5, 8), x, y + 0.25, z);
  if (kind === 'modern') { const ax = x + Math.sin(yaw) * 1.1, az = z + Math.cos(yaw) * 1.1; mg.box(M.steel, (x + ax) / 2, y + 6.9, (z + az) / 2, 0.1, 0.1, 2.2, yaw, 0); mg.box(M.neon.white, ax, y + 6.8, az, 0.35, 0.08, 0.9, yaw, 0); }
  else if (kind === 'acorn') { mg.add(M.sconce, new THREE.SphereGeometry(0.3, 10, 8), x, y + 4.9, z); mg.add(M.iron, new THREE.ConeGeometry(0.34, 0.3, 8), x, y + 5.25, z); }
  else { mg.add(M.neon.pink, new THREE.CylinderGeometry(0.22, 0.22, 0.7, 10), x, y + 4.9, z); mg.add(M.chrome, new THREE.TorusGeometry(0.26, 0.04, 6, 12), x, y + 5.3, z, Math.PI / 2); }
  if (K.R() < 0.4) mg.add(K.signs.posterMat, new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8, 1, true), x, y + 1.4, z);
  K.pool.add(x, y + 4.5, z, col, 5, 14);
  K.spill.pool(x, y, z, 6.5, col, 0.55);
  K.e.colliders.addCircle(x, z, 0.22);
}

function palm(K, x, z, h) {
  const { M, mg } = K, lean = (K.R() - 0.5) * 0.25;
  const pts = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(Math.sin(i * 0.5) * lean * i, (i / 5) * h, lean * i * 0.6));
  mg.add(M.palmTrunk, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.22, 7), x, CURB, z);
  const top = new THREE.Vector3(x, 0, z).add(pts[5]);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + K.R() * 0.3, g = new THREE.PlaneGeometry(0.9, 4.2, 1, 6), p = g.attributes.position;
    for (let k = 0; k < p.count; k++) { const v = (p.getY(k) + 2.1) / 4.2; p.setZ(k, -v * v * 1.6); p.setX(k, p.getX(k) * (1 - v * 0.8)); }
    g.translate(0, 2.1, 0); g.rotateX(-1.1); g.computeVertexNormals();
    mg.add(M.frond, g, top.x, top.y + CURB, top.z, 0, a);
  }
  mg.add(M.neon.amber, new THREE.CylinderGeometry(0.35, 0.35, 0.1, 10), x, CURB + 0.05, z);
  K.spill.wash(x, CURB + 2.5, z + 0.3, 0, 1.4, 5, '#ffcf8a', 0.3);
  K.e.colliders.addCircle(x, z, 0.35);
}

export function buildProps(K) {
  const { M, mg, e } = K, R = rng(31);
  // Lamps and furniture along every sidewalk run.
  for (const w of SIDEWALKS) {
    const s = w.s, curb = w.inner + 0.9;
    const step = s.kind === 'narrow' ? 14 : s.kind === 'alley' ? 10 : 17;
    for (let u = w.u0 + 4; u < w.u1 - 3; u += step) {
      const x = s.a[0] + s.t[0] * u + s.n[0] * w.side * curb, z = s.a[1] + s.t[1] * u + s.n[1] * w.side * curb;
      const h = s.hood || (x < -110 ? 'south' : x > 110 ? 'palm' : 'core');
      if (nearFight(x, z)) continue;
      lamp(K, x, z, h, Math.atan2(-s.n[0] * w.side, -s.n[1] * w.side));
      const r = R(), fx = s.a[0] + s.t[0] * (u + step / 2) + s.n[0] * w.side * curb, fz = s.a[1] + s.t[1] * (u + step / 2) + s.n[1] * w.side * curb;
      if (r < 0.22) { mg.add(M.bin, new THREE.CylinderGeometry(0.32, 0.28, 0.95, 10), fx, CURB + 0.48, fz); if (h === 'south' && R() < 0.6) for (let k = 0; k < 2; k++) mg.add(M.bag, new THREE.SphereGeometry(0.34, 7, 5), fx + 0.6 + k * 0.5, CURB + 0.28, fz + 0.3, 0, R() * 3, 0, 1); e.colliders.addCircle(fx, fz, 0.35); }
      else if (r < 0.34) { mg.box(M.newsbox[(u | 0) % 3], fx, CURB + 0.55, fz, 0.5, 1.1, 0.45, Math.atan2(s.t[0], s.t[1]), 0); }
      else if (r < 0.44) { for (let k = 0; k < 3; k++) mg.add(M.steel, new THREE.TorusGeometry(0.4, 0.035, 5, 12, Math.PI), fx + s.t[0] * k * 0.7, CURB, fz + s.t[1] * k * 0.7, 0, Math.atan2(s.n[0], s.n[1])); }
      else if (r < 0.5 && h !== 'core') mg.add(M.crate, new THREE.BoxGeometry(0.6, 0.45, 0.45), fx, CURB + 0.23, fz, 0, R());
      if (R() < 0.3) mg.add(M.cup, new THREE.CylinderGeometry(0.045, 0.035, 0.1, 6), fx + (R() - 0.5) * 3, CURB + 0.02, fz + (R() - 0.5), Math.PI / 2, R() * 6);
    }
  }
  // Palm promenade and Palm Avenue palms.
  for (let z = -232; z < 236; z += 12) { if (!nearFight(250, z)) palm(K, 250, z + (R() - 0.5) * 2, 7 + R() * 3); palm(K, 260, z + 6, 6 + R() * 4); }
  for (let x = 77; x < 225; x += 14) for (const z of [-9.2, 9.2]) if (!nearFight(x, z)) palm(K, x, z, 6 + R() * 2);
  for (let z = -230; z < 236; z += 9) { mg.box(M.stuccoWhite, 262.5, 0.4, z, 0.5, 0.8, 9, 0, 0); mg.box(M.chrome, 262.5, 0.95, z, 0.06, 0.06, 9, 0, 0); }
  e.colliders.addBox(263, 0, 0.4, 240, 0);
  for (let z = -220; z < 230; z += 16) K.pool.add(255, 3, z, '#ffc6e0', 4, 12);
  // Plaza: bronze promenade lamps and benches around the fountain ring; food carts and stalls.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2, x = Math.cos(a) * 36.5, z = Math.sin(a) * 26.5;
    if (nearFight(x, z)) continue;
    mg.add(M.bronze, new THREE.CylinderGeometry(0.09, 0.14, 5.2, 10), x, CURB + 2.6, z); mg.add(M.sconce, new THREE.SphereGeometry(0.34, 12, 8), x, CURB + 5.4, z);
    K.pool.add(x, CURB + 5, z, '#ffd6a0', 5, 14); K.spill.pool(x, CURB + 0.06, z, 7, '#ffd6a0', 0.6); e.colliders.addCircle(x, z, 0.2);
  }
  // Carts and pop-up stalls around the square and on Southstar.
  const carts = [[-26, -44, 'Hot Pretzels'], [24, 44, 'Stardust Cones'], [-60, 18, 'Comet Dogs'], [-150, -10, 'Flowers'], [-235, 10, 'Jewelry'], [-100, -10, 'Art Table']];
  for (const [x, z, what] of carts) {
    if (nearFight(x, z, 1)) continue;
    mg.box(what === 'Art Table' || what === 'Jewelry' ? M.wood : M.chrome, x, CURB + 0.55, z, 2, 1.1, 1, 0, 0);
    mg.add(M.umbrella[(x | 0) & 1 ? 1 : 2], new THREE.ConeGeometry(1.5, 0.5, 10, 1, true), x, CURB + 2.5, z); mg.add(M.chrome, new THREE.CylinderGeometry(0.03, 0.03, 2, 5), x, CURB + 1.5, z);
    if (what === 'Flowers') for (let k = 0; k < 8; k++) mg.add([M.neon.pink, M.plant, M.neon.amber][k % 3], new THREE.SphereGeometry(0.12, 6, 4), x - 0.8 + k * 0.22, CURB + 1.2, z);
    if (what.includes('Pretzels') || what.includes('Dogs')) K.amb.add('vapor', x, CURB + 1.3, z, '#e8e4de', 2.5);
    K.pool.add(x, CURB + 2, z, '#ffe0b0', 4, 9); K.spill.pool(x, CURB + 0.06, z, 3, '#ffe0b0', 0.5);
    e.colliders.addBox(x, z, 1, 0.5, 0);
    K.interact.push({ x, z: z + 1.4, verb: 'View', label: what, text: `${what} — a street vendor's cart. Menus are decorative; nothing is charged.` });
  }
  // Manhole steam at a few vents.
  for (const [x, z] of [[-160, 30], [-230, -2], [0, 130], [110, -130], [-70, -130]]) K.amb.add('vapor', x, 0.1, z, '#dcdde4', 3);
  gallery(K);
  skyline(K, R);
  for (const [x, z, hw, hd] of [[0, -ENV.z - 2, ENV.x, 1], [0, ENV.z + 2, ENV.x, 1], [-ENV.x - 2, 0, 1, ENV.z]]) e.colliders.addBox(x, z, hw, hd, 0);
}

// Mosaic Alley Gallery: a walled brick courtyard entered through two gates on the alley.
function gallery(K) {
  const { M, mg, e } = K, c = COURTS.find((x) => x.kind === 'gallery'), H = 5.5;
  const wall = (x, z, w, d) => { mg.box(M.brickRed, x, H / 2, z, w, H, d, 0, 2.5); e.colliders.addBox(x, z, w / 2, d / 2, 0); K.occ.box(M.brickRed, x, H + 0.2, z, w, 0.4, d, 0, 0); };
  wall(c.x - c.hw, c.z, 0.5, c.hd * 2); wall(c.x + c.hw, c.z, 0.5, c.hd * 2);
  for (const z of [c.z - c.hd, c.z + c.hd]) { const gw = 5, side = c.hw - gw / 2; wall(c.x - gw / 2 - side / 2, z, side, 0.5); wall(c.x + gw / 2 + side / 2, z, side, 0.5); mg.box(M.iron, c.x, 4.6, z, gw + 0.4, 0.3, 0.3, 0, 0); mg.add(K.signs.mat, K.signs.quad(K.signs.text('MOSAIC ALLEY GALLERY', { bg: '#1a1410', fg: '#f2c46a', border: '#f2c46a' }), 5, 0.9), c.x, 5.3, z + (z < c.z ? -0.3 : 0.3), 0, z < c.z ? Math.PI : 0); }
  for (let i = 0; i < 4; i++) { const x = c.x - 8 + i * 5.3; mg.box(M.wood, x, CURB + 0.25, c.z + 6, 2.2, 0.1, 0.5, 0, 0); for (const dx of [-0.9, 0.9]) mg.box(M.iron, x + dx, CURB + 0.12, c.z + 6, 0.08, 0.24, 0.45, 0, 0); K.interact.push({ x, z: c.z + 6.6, verb: 'Sit', label: 'gallery bench', action: (en) => en.player.sitAt({ x, y: CURB + 0.3, z: c.z + 6.3, rot: 0 }) }); }
  for (let i = 0; i < 6; i++) K.pool.add(c.x - 10 + i * 4, 4, c.z + (i % 2 ? 7 : -7), '#ffd6a0', 3.5, 9);
}

// Backdrop skyline beyond the playable envelope: stepped glass and masonry silhouettes with lit windows.
function skyline(K, R) {
  const { M, mg } = K, mats = [M.curtainCool, M.curtainWarm, M.curtainMix];
  const ring = [];
  for (let x = -330; x <= 250; x += 26) ring.push([x, -275], [x, 275]);
  for (let z = -250; z <= 250; z += 28) ring.push([-335, z]);
  for (const [x, z] of ring) {
    const h = 25 + R() * (Math.abs(x) < 140 ? 110 : 60), w = 16 + R() * 12;
    mg.box(mats[(R() * 3) | 0], x, h / 2, z, w, h, 18, 0, 24);
    if (R() < 0.3) mg.box(M.neon.white, x, h + 0.2, z, w - 2, 0.3, 16, 0, 0);
    if (R() < 0.25) mg.box(M.neon.red, x, h + 3, z, 0.3, 6, 0.3, 0, 0);
  }
  void inPlaza;
}