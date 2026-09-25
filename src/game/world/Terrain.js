import * as THREE from 'three';
import { fbm, noise2, smoothstep, lerp, hash2 } from '../core/noise';
import { R, WATER, LAGOON, MOUNTAIN, VILLAGE, PLOTS, PATHS, RIVER_S, STREAM_S, OUTLET_S, GROTTO, sampleCurve } from './layout';

export const SIZE = 440, SEG = 220, STEP = SIZE / SEG, HALF = SIZE / 2, N = SEG + 1;

function distTo(x, z, s) {
  let m = 1e12;
  for (let i = 0; i < s.length; i++) { const dx = x - s[i][0], dz = z - s[i][1]; const d = dx * dx + dz * dz; if (d < m) m = d; }
  return Math.sqrt(m);
}

export function forestMask(x, z) {
  const n = fbm(x * 0.009 + 40, z * 0.009 - 20, 3);
  let f = smoothstep(0.52, 0.63, n);
  f = Math.max(f, smoothstep(-45, -90, z) * smoothstep(0.4, 0.52, n));
  return f * smoothstep(34, 60, Math.hypot(x - VILLAGE.x, z - VILLAGE.z));
}

function rawHeight(x, z) {
  const r = Math.hypot(x, z) / R;
  let h = 7.5 + (fbm(x * 0.011 + 10, z * 0.011 - 4, 5) - 0.5) * 16 + fbm(x * 0.004 + 3, z * 0.004 + 8, 3) * 9;
  const dm = (x - MOUNTAIN.x) ** 2 + (z - MOUNTAIN.z) ** 2;
  h += 60 * Math.exp(-dm / 3200) + 16 * Math.exp(-dm / 12800);
  h += Math.exp(-dm / 9800) * (1 - Math.abs(noise2(x * 0.035, z * 0.035) * 2 - 1)) * 9;
  h += 11 * Math.exp(-((x - 135) ** 2 + (z + 56) ** 2) / 900);
  const dl = Math.hypot(x - LAGOON.x, z - LAGOON.z);
  h = lerp(WATER - 7, h, smoothstep(LAGOON.r - 8, LAGOON.r + 26, dl));
  h = lerp(WATER - 2.4, h, smoothstep(3.5, 15, distTo(x, z, RIVER_S)));
  h = lerp(WATER - 1.8, h, smoothstep(2, 10, distTo(x, z, STREAM_S)));
  h = lerp(WATER - 2.2, h, smoothstep(3, 13, distTo(x, z, OUTLET_S)));
  const edge = smoothstep(1.0, 0.9, r);
  return -12 + (h + 12) * edge;
}

const FLATS = [
  ...PLOTS.map((p) => ({ x: p.x, z: p.z, r: p.r + 1 })),
  { x: VILLAGE.x, z: VILLAGE.z, r: 22 },
  { x: GROTTO.x, z: GROTTO.z, r: 14 },
];
let flatsReady = false;
function shapedHeight(x, z) {
  if (!flatsReady) { FLATS.forEach((f) => { f.h = Math.max(rawHeight(f.x, f.z), WATER + 1.6); }); flatsReady = true; }
  let h = rawHeight(x, z);
  for (const f of FLATS) {
    const o = f.r + 8, dx = x - f.x, dz = z - f.z, d2 = dx * dx + dz * dz;
    if (d2 < o * o) h = lerp(h, f.h, smoothstep(o, f.r, Math.sqrt(d2)));
  }
  return h;
}

const PATH_TYPES = { dirt: 1, stone: 2, crystal: 3 };
const SURF = ['grass', 'dirt', 'stone', 'crystal'];

export class Terrain {
  constructor() {
    this.h = new Float32Array(N * N);
    this.pw = new Float32Array(N * N);
    this.pt = new Uint8Array(N * N);
  }

  build() {
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const x = -HALF + i * STEP, z = -HALF + j * STEP;
      this.h[j * N + i] = Math.hypot(x, z) > R ? -12 : shapedHeight(x, z);
    }
    for (const p of PATHS) for (const [x, z] of sampleCurve(p.pts, 1)) this.splat(x, z, p.w, PATH_TYPES[p.type] || 1);
    this.splat(VILLAGE.x, VILLAGE.z, 10, 2);
    this.mesh = this.createMesh();
    this.underside = this.createUnderside();
    this.depthTex = this.createDepthTexture();
    this.shorePoints = [];
    for (let j = 0; j < N; j += 2) for (let i = 0; i < N; i += 2) {
      const x = -HALF + i * STEP, z = -HALF + j * STEP, hh = this.h[j * N + i];
      if (hh > WATER + 0.2 && hh < WATER + 1.1 && Math.hypot(x, z) < R * 0.86) this.shorePoints.push({ x, z });
    }
  }

  splat(px, pz, w, type) {
    const rad = w + 1.2;
    const i0 = Math.max(0, Math.floor((px - rad + HALF) / STEP)), i1 = Math.min(SEG, Math.ceil((px + rad + HALF) / STEP));
    const j0 = Math.max(0, Math.floor((pz - rad + HALF) / STEP)), j1 = Math.min(SEG, Math.ceil((pz + rad + HALF) / STEP));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const d = Math.hypot(-HALF + i * STEP - px, -HALF + j * STEP - pz);
      const v = smoothstep(rad, w * 0.45, d);
      const k = j * N + i;
      if (v > this.pw[k]) { this.pw[k] = v; this.pt[k] = type; }
    }
  }

  createMesh() {
    const g = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      let x = pos.getX(k), z = pos.getZ(k);
      const r = Math.hypot(x, z);
      if (r > R) { x *= R / r; z *= R / r; }
      pos.setXYZ(k, x, this.h[k], z);
    }
    g.computeVertexNormals();
    const nor = g.attributes.normal;
    const cols = new Float32Array(pos.count * 3);
    const C = {
      grass: new THREE.Color('#2e6135'), grass2: new THREE.Color('#3d7039'), forest: new THREE.Color('#1a3f26'),
      teal: new THREE.Color('#22675a'), violet: new THREE.Color('#4b3a72'), sand: new THREE.Color('#b5a17a'),
      wet: new THREE.Color('#57553f'), rock: new THREE.Color('#4a4652'), basalt: new THREE.Color('#1e1c25'),
      dirt: new THREE.Color('#6a5640'), stone: new THREE.Color('#77727c'), crystal: new THREE.Color('#6d3fa6'),
    };
    const c = new THREE.Color();
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k), ny = nor.getY(k), r = Math.hypot(x, z);
      c.copy(C.grass).lerp(C.grass2, noise2(x * 0.05, z * 0.05));
      c.lerp(C.teal, smoothstep(0.5, 0.7, fbm(x * 0.02 + 7, z * 0.02, 2)) * 0.7);
      c.lerp(C.violet, smoothstep(0.62, 0.8, noise2(x * 0.018 - 30, z * 0.018 + 11)) * 0.75);
      c.lerp(C.forest, forestMask(x, z) * 0.8);
      c.lerp(C.sand, smoothstep(WATER + 1.6, WATER + 0.4, y));
      c.lerp(C.wet, smoothstep(WATER - 0.2, WATER - 1.5, y));
      c.lerp(C.rock, smoothstep(0.86, 0.68, ny));
      c.lerp(C.basalt, Math.min(1, smoothstep(0.62, 0.45, ny) + smoothstep(40, 60, y) * 0.8));
      c.lerp(C.crystal, smoothstep(34, 8, Math.hypot(x - GROTTO.x, z - GROTTO.z)) * 0.45);
      const pw = this.pw[k];
      if (pw > 0) { const t = this.pt[k]; c.lerp(t === 2 ? C.stone : t === 3 ? C.crystal : C.dirt, pw * (t === 3 ? 0.6 : 0.9)); }
      c.lerp(C.basalt, smoothstep(R * 0.93, R * 0.99, r));
      const b = 0.9 + hash2(k, 7) * 0.18;
      cols[k * 3] = c.r * b; cols[k * 3 + 1] = c.g * b; cols[k * 3 + 2] = c.b * b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 }));
    m.receiveShadow = true;
    m.castShadow = true;
    return m;
  }

  createUnderside() {
    const pts = [];
    for (let k = 0; k <= 30; k++) {
      const t = k / 30;
      pts.push(new THREE.Vector2(Math.max(R * Math.pow(1 - t, 1.25), 0.01), -12 - t * 170));
    }
    const g = new THREE.LatheGeometry(pts, 80);
    const pos = g.attributes.position;
    const cols = new Float32Array(pos.count * 3);
    const top = new THREE.Color('#3b2d24'), mid = new THREE.Color('#2b2733'), deep = new THREE.Color('#2a1a44'), vein = new THREE.Color('#5b2f9a');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const t = (-12 - y) / 170, rr = Math.hypot(x, z);
      const ux = rr > 0.01 ? x / rr : 0, uz = rr > 0.01 ? z / rr : 0;
      const n = fbm(ux * 2.5 + t * 3 + 5, uz * 2.5 - t * 4 - 3, 4);
      const jag = noise2(ux * 14 + uz * 9 + 20, t * 22);
      const s = 1 + ((n - 0.5) * 0.7 + (jag - 0.5) * 0.2) * smoothstep(0, 0.12, t);
      pos.setXYZ(i, x * s, y + (n - 0.5) * 10 * smoothstep(0, 0.1, t), z * s);
      c.copy(top).lerp(mid, smoothstep(0, 0.2, t)).lerp(deep, smoothstep(0.4, 1, t));
      c.lerp(vein, smoothstep(0.62, 0.75, jag) * 0.6);
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, flatShading: true }));
  }

  createDepthTexture() {
    const data = new Uint8Array(N * N * 4);
    for (let k = 0; k < N * N; k++) {
      data[k * 4] = Math.max(0, Math.min(255, ((WATER - this.h[k]) / 8) * 255));
      data[k * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }

  getHeight(x, z) {
    if (x * x + z * z > (R * 0.985) ** 2) return -1000;
    const fx = (x + HALF) / STEP, fz = (z + HALF) / STEP;
    const i = Math.floor(fx), j = Math.floor(fz);
    const tx = fx - i, tz = fz - j, k = j * N + i, h = this.h;
    const a = h[k], d = h[k + 1], b = h[k + N], c = h[k + N + 1];
    if (tx + tz <= 1) return a + (d - a) * tx + (b - a) * tz;
    return c + (b - c) * (1 - tx) + (d - c) * (1 - tz);
  }

  idx(x, z) {
    const i = Math.round((x + HALF) / STEP), j = Math.round((z + HALF) / STEP);
    if (i < 0 || j < 0 || i > SEG || j > SEG) return -1;
    return j * N + i;
  }

  pathWeight(x, z) { const k = this.idx(x, z); return k < 0 ? 0 : this.pw[k]; }

  slopeAt(x, z) {
    const a = this.getHeight(x + 1, z) - this.getHeight(x - 1, z);
    const b = this.getHeight(x, z + 1) - this.getHeight(x, z - 1);
    return Math.hypot(a, b) / 2;
  }

  surfaceAt(x, z) {
    const k = this.idx(x, z);
    if (k < 0) return 'stone';
    if (this.pw[k] > 0.5) return SURF[this.pt[k]];
    const y = this.h[k];
    if (y < WATER - 0.1) return 'water';
    if (y < WATER + 1.2) return 'sand';
    if (this.slopeAt(x, z) > 0.8 || y > 40) return 'stone';
    if (forestMask(x, z) > 0.5) return 'leaves';
    return 'grass';
  }
}