import * as THREE from 'three';
import { glowTexture } from '../core/shared';

const R = 18;
const KINDS = {
  fireflies: { n: 140, size: 0.16, blend: THREE.AdditiveBlending, colors: ['#d8ff8a', '#fff3a0'], y: [0.3, 2.4], fall: 0, drift: 0.15 },
  leaves: { n: 170, size: 0.14, blend: THREE.NormalBlending, colors: ['#c8632a', '#d99a2b', '#8a4a20', '#b5462a'], y: [0.5, 9], fall: 0.7, drift: 1 },
  dust: { n: 240, size: 0.05, blend: THREE.NormalBlending, colors: ['#d8c7a4', '#c2b08a'], y: [0.1, 3], fall: 0, drift: 1.6 },
};

// Natural phenomena that live around the camera: fireflies, falling leaves and drifting dust.
export class Ambient {
  constructor(e) {
    this.e = e; this.t = 0; this.sets = {};
    for (const [k, d] of Object.entries(KINDS)) {
      const g = new THREE.BufferGeometry(), p = new Float32Array(d.n * 3), col = new Float32Array(d.n * 3), base = new Float32Array(d.n * 3);
      for (let i = 0; i < d.n; i++) { const c = new THREE.Color(d.colors[i % d.colors.length]); base.set([c.r, c.g, c.b], i * 3); }
      g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: d.size, map: glowTexture(), vertexColors: true, transparent: true, depthWrite: false, blending: d.blend, opacity: k === 'dust' ? 0.45 : 1 }));
      pts.frustumCulled = false; pts.visible = false; e.scene.add(pts);
      this.sets[k] = { d, g, p, col, base, pts, ph: new Float32Array(d.n).map(() => Math.random() * 6.28), init: false };
    }
  }
  spawn(S, i, c) {
    const x = c.x + (Math.random() * 2 - 1) * R, z = c.z + (Math.random() * 2 - 1) * R, g = this.e.groundAt ? this.e.groundAt(x, z, c.y) : 0;
    S.p[i * 3] = x; S.p[i * 3 + 1] = g + S.d.y[0] + Math.random() * (S.d.y[1] - S.d.y[0]); S.p[i * 3 + 2] = z;
  }
  update(s, dt, cam, night) {
    this.t += dt; const c = cam.position, wd = THREE.MathUtils.degToRad(s.windDir), wx = Math.cos(wd) * (0.3 + s.wind * 3), wz = Math.sin(wd) * (0.3 + s.wind * 3);
    for (const [k, S] of Object.entries(this.sets)) {
      const n = Math.floor(S.d.n * s[k]); S.pts.visible = n > 0; if (!n) continue;
      if (!S.init) { for (let i = 0; i < S.d.n; i++) this.spawn(S, i, c); S.init = true; }
      const bright = k === 'fireflies' ? 0.25 + 0.75 * night : 1;
      for (let i = 0; i < n; i++) {
        const j = i * 3, ph = S.ph[i];
        S.p[j] += (wx * S.d.drift + Math.sin(this.t * 0.9 + ph) * 0.4) * dt;
        S.p[j + 1] += (-S.d.fall + Math.sin(this.t * 1.7 + ph * 2) * 0.25) * dt;
        S.p[j + 2] += (wz * S.d.drift + Math.cos(this.t * 0.8 + ph) * 0.4) * dt;
        const blink = k === 'fireflies' ? Math.max(0, Math.sin(this.t * 2.2 + ph * 3)) ** 3 : 1;
        for (let q = 0; q < 3; q++) S.col[j + q] = S.base[j + q] * blink * bright;
        if (Math.abs(S.p[j] - c.x) > R || Math.abs(S.p[j + 2] - c.z) > R || S.p[j + 1] < c.y - 12 || (S.d.fall && S.p[j + 1] < c.y - 4)) this.spawn(S, i, c);
      }
      S.g.attributes.position.needsUpdate = true; S.g.attributes.color.needsUpdate = true; S.g.setDrawRange(0, n);
    }
  }
}