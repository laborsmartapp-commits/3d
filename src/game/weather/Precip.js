import * as THREE from 'three';
import { glowTexture } from '../core/shared';

const R = 26, H = 24;
// Generic shelter test: tall solid colliders (buildings, enclosed rooms) keep rain and snow out.
export const colliderCover = (e) => (x, z) => {
  for (const o of e.colliders?.query(x, z, 0.5) || []) if (o.y1 - Math.max(o.y0, -2) > 2.5 && e.colliders.contains(o, x, z, 0)) return true;
  return false;
};

// Rain streaks and snowflakes around the filming camera. Flakes never spawn under a roof.
export class Precip {
  constructor(e, covered, { rain = true } = {}) {
    this.e = e; this.covered = covered || colliderCover(e); this.rainOn = rain;
    const touch = e.isTouch, NR = (this.NR = touch ? 1400 : 3200), NS = (this.NS = touch ? 1100 : 2600);
    this.r = { p: new Float32Array(NR * 3), kill: new Float32Array(NR), hide: new Uint8Array(NR) };
    this.rg = new THREE.BufferGeometry(); this.rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NR * 6), 3));
    this.rain = new THREE.LineSegments(this.rg, new THREE.LineBasicMaterial({ color: '#b9c9da', transparent: true, opacity: 0.45, depthWrite: false }));
    this.s = { p: new Float32Array(NS * 3), kill: new Float32Array(NS), hide: new Uint8Array(NS), ph: new Float32Array(NS).map(() => Math.random() * 6.28) };
    this.sg = new THREE.BufferGeometry(); this.sg.setAttribute('position', new THREE.BufferAttribute(this.s.p, 3));
    this.snow = new THREE.Points(this.sg, new THREE.PointsMaterial({ color: '#ffffff', size: 0.11, map: glowTexture(), transparent: true, opacity: 0.9, depthWrite: false }));
    for (const o of [this.rain, this.snow]) { o.frustumCulled = false; o.visible = false; e.scene.add(o); }
    this.init = { r: false, s: false };
  }

  spawn(P, i, c, top) {
    const x = c.x + (Math.random() * 2 - 1) * R, z = c.z + (Math.random() * 2 - 1) * R, y = top ? c.y + Math.random() * H - 4 : c.y + H * 0.6 + Math.random() * 6;
    P.p[i * 3] = x; P.p[i * 3 + 1] = y; P.p[i * 3 + 2] = z;
    P.kill[i] = this.e.groundAt ? this.e.groundAt(x, z, y) : 0;
    P.hide[i] = this.covered(x, z, y) ? 1 : 0;
  }

  step(P, n, total, dt, c, vy, wx, wz, key, sway) {
    if (!this.init[key]) { for (let i = 0; i < total; i++) this.spawn(P, i, c, true); this.init[key] = true; }
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      P.p[j] += (wx + (sway ? Math.sin(P.ph[i] + P.p[j + 1] * 0.7) * sway : 0)) * dt; P.p[j + 1] -= vy * dt; P.p[j + 2] += wz * dt;
      if (P.p[j + 1] < P.kill[i] || Math.abs(P.p[j] - c.x) > R || Math.abs(P.p[j + 2] - c.z) > R) this.spawn(P, i, c, false);
    }
  }

  update(s, dt, cam) {
    const c = cam.position, wd = THREE.MathUtils.degToRad(s.windDir), wx = Math.cos(wd) * s.wind * 7, wz = Math.sin(wd) * s.wind * 7;
    const nr = this.rainOn ? Math.floor(this.NR * s.rain) : 0;
    this.rain.visible = nr > 0;
    if (nr) {
      const vy = 17 + s.rain * 8, P = this.r, out = this.rg.attributes.position.array, len = 0.035 + s.rain * 0.025;
      this.step(P, nr, this.NR, dt, c, vy, wx, wz, 'r');
      for (let i = 0; i < nr; i++) {
        const j = i * 3, o = i * 6, x = P.p[j], y = P.hide[i] ? -9999 : P.p[j + 1], z = P.p[j + 2];
        out[o] = x; out[o + 1] = y; out[o + 2] = z; out[o + 3] = x - wx * len; out[o + 4] = y + vy * len; out[o + 5] = z - wz * len;
      }
      this.rg.attributes.position.needsUpdate = true; this.rg.setDrawRange(0, nr * 2);
      this.rain.material.opacity = 0.25 + s.rain * 0.35;
    }
    const ns = Math.floor(this.NS * s.snow);
    this.snow.visible = ns > 0;
    if (ns) {
      const P = this.s;
      this.step(P, ns, this.NS, dt, c, 1.1 + s.snow * 0.9, wx * 0.45, wz * 0.45, 's', 0.6);
      for (let i = 0; i < ns; i++) if (P.hide[i]) P.p[i * 3 + 1] = -9999;
      this.sg.attributes.position.needsUpdate = true; this.sg.setDrawRange(0, ns);
    }
  }
}