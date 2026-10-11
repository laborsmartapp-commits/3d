import * as THREE from 'three';
import { box, place } from '../geo';
import { bench } from '../boulevard/props';
import { PARK, TOP, BASE, CURB, SPACES, EW } from './layout';
import { lamp, fountain } from './kit';

const C = { x: -196, z: 0, a: 55, b: 135 };
const FOUNTAINS = [[-196, 0], [-196, -100], [-196, 100]];
const W = PARK.x1 - PARK.x0, H = PARK.z1 - PARK.z0;

function loopPath() {
  const pts = [];
  for (let i = 0; i <= 240; i++) { const t = (i / 240) * Math.PI * 2, w = 1 + 0.06 * Math.sin(t * 5); pts.push([C.x + Math.sin(t) * C.a * w, C.z + Math.cos(t) * C.b * w]); }
  return pts;
}
function wind(a, b, n = 30) {
  return Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k + Math.sin(k * Math.PI) * 4]; });
}
const nearest = (pts, p) => pts.reduce((m, q) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(m[0] - p[0], m[1] - p[1]) ? q : m));

// Lawn texture with the winding gravel paths, clearings and fountain circles painted in.
function lawn(paths, spaces) {
  const S = 512 / W, c = document.createElement('canvas'); c.width = 512; c.height = Math.round(H * S);
  const g = c.getContext('2d'), px = ([x, z]) => [(x - PARK.x0) * S, (z - PARK.z0) * S];
  g.fillStyle = '#5c8b3d'; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '30,60,20' : '140,180,90'},${Math.random() * 0.25})`; g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2); }
  g.lineCap = g.lineJoin = 'round';
  for (const [col, wid] of [['#9d8a63', 4.2], ['#d2c29c', 3.2]]) {
    g.strokeStyle = col; g.lineWidth = wid * S;
    for (const p of paths) { g.beginPath(); p.forEach((q, i) => (i ? g.lineTo(...px(q)) : g.moveTo(...px(q)))); g.stroke(); }
  }
  g.fillStyle = '#d9cca8';
  for (const s of spaces) { g.beginPath(); g.arc(...px([s.x, s.z]), 10 * S, 0, 7); g.fill(); }
  for (const f of FOUNTAINS) { g.beginPath(); g.arc(...px(f), 7 * S, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildPark(e, r, forest) {
  const { scene, mats: M } = e, spaces = SPACES.filter((s) => s.x < PARK.x1);
  const loop = loopPath();
  const paths = [loop, wind([PARK.x1, 0], [-251, 0], 60)];
  for (const z of [-100, 100]) paths.push(wind(nearest(loop, [-150, z]), nearest(loop, [-250, z]), 40));
  for (const z of EW) paths.push(wind([PARK.x1, z], nearest(loop, [PARK.x1, z])));
  place(scene, box(W, CURB, H, M.leaf, 4), C.x, BASE + CURB / 2, 0);
  const grass = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: lawn(paths, spaces), roughness: 0.95 }));
  grass.rotation.x = -Math.PI / 2; grass.position.set(C.x, TOP + 0.01, 0); grass.receiveShadow = true; scene.add(grass);
  for (const [x, z] of FOUNTAINS) fountain(e, x, z);
  const hedge = (x, z, sx, sz) => { place(scene, box(sx, 2.2, sz, M.leaf, 2), x, TOP + 1.1, z); e.colliders.addBox(x, z, sx / 2, sz / 2, 0); };
  hedge(PARK.x0 - 1, 0, 2, H + 24); hedge(C.x, PARK.z0 - 1, W, 2); hedge(C.x, PARK.z1 + 1, W, 2);
  const all = paths.flat();
  const clear = (x, z) => all.every((p) => Math.hypot(p[0] - x, p[1] - z) > 5) && spaces.every((s) => Math.hypot(s.x - x, s.z - z) > 14) && FOUNTAINS.every((f) => Math.hypot(f[0] - x, f[1] - z) > 10);
  for (let i = 0; i < 260; i++) {
    const x = PARK.x0 + 5 + r() * (W - 12), z = PARK.z0 + 5 + r() * (H - 10);
    if (clear(x, z)) forest.add(x, z, 0.9 + r() * 0.7);
  }
  loop.forEach(([x, z], i) => {
    const s = x < C.x ? -1 : 1;
    if (i % 16 === 0) lamp(e, x - s * 2.6, z);
    if (i % 20 === 10 && Math.abs(z) < 110) bench(e, x + s * 3, z, s);
  });
}