import * as THREE from 'three';
import { FOUNTAIN, CURB } from './layout';
import { FountainShow } from '../gardens/show';

// The Star Square fountain: a granite basin with a bronze armillary centrepiece, driven by the
// Galatical Gardens show system (same schedule). Basin and sculpture stay lit when the jets are off.
const ringGeo = (rxo, rzo, rxi, rzi, y, h) => {
  const s = new THREE.Shape(); s.absellipse(0, 0, rxo, rzo, 0, Math.PI * 2);
  const hole = new THREE.Path(); hole.absellipse(0, 0, rxi, rzi, 0, Math.PI * 2, true); s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 80 }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g;
};
const discGeo = (rx, rz, y) => { const s = new THREE.Shape(); s.absellipse(0, 0, rx, rz, 0, Math.PI * 2); const g = new THREE.ShapeGeometry(s, 80); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); return g; };

export function buildFountain(K) {
  const { M, mg, e } = K, F = FOUNTAIN, W = F.water, base = CURB + 0.06;
  mg.add(M.granite, ringGeo(F.rx + 0.9, F.rz + 0.9, F.rx, F.rz, base, 0.75), 0, 0, 0);
  mg.add(M.stonePale, ringGeo(F.rx + 1.05, F.rz + 1.05, F.rx - 0.1, F.rz - 0.1, base + 0.75, 0.12), 0, 0, 0);
  mg.add(M.plazaDark, discGeo(F.rx, F.rz, base - 0.3), 0, 0, 0);
  e.scene.add(new THREE.Mesh(discGeo(F.rx, F.rz, W + 0.2), M.water));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; e.colliders.addCircle(Math.cos(a) * (F.rx - 3), Math.sin(a) * (F.rz - 3), 4.2); }
  e.colliders.addCircle(0, 0, 9);
  for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; mg.add(i % 2 ? M.neon.cyan : M.downlight, new THREE.SphereGeometry(0.16, 8, 6), Math.cos(a) * (F.rx - 0.8), W + 0.05, Math.sin(a) * (F.rz - 0.8)); }
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; K.pool.add(Math.cos(a) * (F.rx + 3), 2.2, Math.sin(a) * (F.rz + 3), i % 2 ? '#8ff0ff' : '#ffe0b8', 6, 16); }
  K.spill.pool(0, base + 0.93, 0, F.rx + 10, '#9adfff', 0.22);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2 + 0.13, x = Math.cos(a) * (F.rx + 1.6), z = Math.sin(a) * (F.rz + 1.6); K.seats.push({ x, z, yaw: Math.atan2(x, z), y: base + 0.95 }); }
  sculpture(K, W);
  return new FountainShow(K, null, { place: (add) => nozzles(add, W + 0.25), center: { x: 0, z: 0 }, reach: 30 });
}

function sculpture(K, W) {
  const { M, mg } = K;
  mg.add(M.stonePale, new THREE.CylinderGeometry(6, 6.2, 0.9, 40), 0, W + 0.25, 0, 0, 0, 0);
  mg.add(M.granite, new THREE.CylinderGeometry(4.4, 4.6, 0.8, 40), 0, W + 1.1, 0);
  mg.add(M.bronze, new THREE.CylinderGeometry(0.5, 0.8, 2.4, 14), 0, W + 2.7, 0);
  for (const [rx, ry, r] of [[Math.PI / 2, 0, 2.8], [0.5, 0.7, 2.5], [-0.5, -0.7, 2.2]]) mg.add(M.bronze, new THREE.TorusGeometry(r, 0.13, 8, 48), 0, W + 5.4, 0, rx, ry);
  mg.add(M.gold, new THREE.IcosahedronGeometry(0.95, 2), 0, W + 5.4, 0);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mg.add(M.downlight, new THREE.BoxGeometry(0.3, 0.12, 0.3), Math.cos(a) * 5.2, W + 0.72, Math.sin(a) * 5.2); }
  K.pool.add(0, W + 3, -5, '#ffe6c0', 9, 14); K.pool.add(0, W + 3, 5, '#ffe6c0', 9, 14);
}

function nozzles(add, y) {
  const F = FOUNTAIN;
  for (const x of [-16.5, -11, -5.5, 5.5, 11, 16.5]) add('columns', x, y, 0, [0, 1, 0], 17 - Math.abs(x) * 0.45, 0.38, null, true);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; add('crown', Math.cos(a) * 8, y, Math.sin(a) * 6.5, [-Math.cos(a) * 0.26, 1, -Math.sin(a) * 0.26], 9, 0.2); }
  for (let k = 0; k < 12; k++) {
    const x = -18 + k * 3.27, cross = k % 2 ? 0.3 : -0.3, zo = 0.78 * F.rz * Math.sqrt(1 - (x / F.rx) ** 2), h = (1.1 * zo * 1.3) / 4;
    add('arcs', x, y, -zo, [cross, 1.1, 1], h, 0.17); add('arcs', x, y, zo, [-cross, 1.1, -1], h, 0.17);
  }
  for (const sx of [-20.5, 20.5]) for (let k = -3; k <= 3; k++) { const th = (k * 4 * Math.PI) / 180; add('fans', sx, y, 0, [0, Math.cos(th), Math.sin(th)], 9 - Math.abs(k), 0.16); }
  for (let i = 0; i < 12; i++) { const a = i * 2.39, r = 0.45 + (i % 4) * 0.1; add('bubblers', Math.cos(a) * F.rx * r, y, Math.sin(a) * F.rz * r, [0, 1, 0], 1.2, 0.42); }
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2; add('chase', Math.cos(a) * (F.rx - 1.4), y, Math.sin(a) * (F.rz - 1.4), [-Math.cos(a) * 0.4, 1, -Math.sin(a) * 0.4], 2.4, 0.12, { chase: i }); }
}