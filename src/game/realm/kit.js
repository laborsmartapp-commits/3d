import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const G = new Map();
const memo = (k, f) => { let g = G.get(k); if (!g) G.set(k, (g = f())); return g; };
const r3 = (v) => Math.round(v * 1000) / 1000;
export const rbox = (w, h, d, r = 0.015) => memo(`b${r3(w)},${r3(h)},${r3(d)},${r}`, () => new RoundedBoxGeometry(w, h, d, 2, Math.max(0.0005, Math.min(r, w / 2 - 0.0005, h / 2 - 0.0005, d / 2 - 0.0005))));
export const cyl = (rt, rb, h, s = 24) => memo(`c${r3(rt)},${r3(rb)},${r3(h)},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const sph = (r, s = 20) => memo(`s${r3(r)},${s}`, () => new THREE.SphereGeometry(r, s, Math.max(8, (s * 0.6) | 0)));
export const tor = (R, r, arc = Math.PI * 2) => memo(`t${r3(R)},${r3(r)},${r3(arc)}`, () => new THREE.TorusGeometry(R, r, 10, 36, arc));
export const lathe = (key, pts, s = 28) => memo(`l${key}`, () => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), s));
export const shade = (hex, f) => `#${new THREE.Color(hex).multiplyScalar(f).getHexString()}`;
const UP = new THREE.Vector3(0, 1, 0);

// Furniture construction kit. Positions are in metres; b/c take the bottom height, s/t take the centre.
export class Kit {
  constructor(M) { this.M = M; this.g = new THREE.Group(); this.main = null; this.lives = []; this.lights = []; }
  m(kind, color) { return this.M.tint(kind, color); }
  mm(kind, color) { return (this.main = this.M.tint(kind, color)); }
  add(geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); this.g.add(o); return o; }
  b(mat, x, y, z, w, h, d, r = 0.015, rx = 0, ry = 0, rz = 0) { return this.add(rbox(w, h, d, r), mat, x, y + h / 2, z, rx, ry, rz); }
  c(mat, x, y, z, rt, rb, h, s = 24, rx = 0, ry = 0, rz = 0) { return this.add(cyl(rt, rb, h, s), mat, x, y + h / 2, z, rx, ry, rz); }
  s(mat, x, y, z, r, sx = 1, sy = 1, sz = 1) { const o = this.add(sph(r), mat, x, y, z); o.scale.set(sx, sy, sz); return o; }
  t(mat, x, y, z, R, r, rx = 0, ry = 0, rz = 0, arc) { return this.add(tor(R, r, arc), mat, x, y, z, rx, ry, rz); }
  lathe(mat, key, pts, x = 0, y = 0, z = 0, s = 28) { return this.add(lathe(key, pts, s), mat, x, y, z); }
  tube(mat, a, b, r = 0.02, s = 8) {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), len = d.length();
    const o = this.add(cyl(r, r, len, s), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
    o.quaternion.setFromUnitVectors(UP, d.normalize());
    return o;
  }
  live(o) { this.lives.push(o); return o; }
  light(x, y, z, kind) { this.lights.push({ x, y, z, kind }); }
}