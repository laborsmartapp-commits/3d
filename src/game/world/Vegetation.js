import * as THREE from 'three';
import { mulberry32, noise2, smoothstep } from '../core/noise';
import { mergeGeo, jitter, patchMaterial } from '../core/shared';
import { R, WATER, EXCLUDE, LAGOON, GROTTO, VILLAGE } from './layout';
import { forestMask, HALF } from './Terrain';

const tmp = new THREE.Object3D();
const hex = (h) => new THREE.Color(h);
const pick = (rng, arr) => hex(arr[Math.floor(rng() * arr.length)]);

function buildChunked(group, geo, mat, items, { chunk = 55, shadow = false, list }) {
  const map = new Map();
  for (const it of items) {
    const key = Math.floor((it.x + HALF) / chunk) + '_' + Math.floor((it.z + HALF) / chunk);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  }
  for (const arr of map.values()) {
    const m = new THREE.InstancedMesh(geo, mat, arr.length);
    let cx = 0, cz = 0;
    arr.forEach((it, i) => {
      tmp.position.set(it.x, it.y, it.z);
      tmp.rotation.set(it.rx || 0, it.ry || 0, it.rz || 0);
      tmp.scale.set(it.sx ?? it.s, it.sy ?? it.s, it.sz ?? it.s);
      tmp.updateMatrix();
      m.setMatrixAt(i, tmp.matrix);
      m.setColorAt(i, it.c);
      cx += it.x; cz += it.z;
    });
    m.instanceMatrix.needsUpdate = true;
    m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
    m.castShadow = shadow;
    m.receiveShadow = true;
    m.userData.center = new THREE.Vector2(cx / arr.length, cz / arr.length);
    m.userData.full = arr.length;
    group.add(m);
    if (list) list.push(m);
  }
}

function treeGeos() {
  const broad = {
    trunk: mergeGeo([
      new THREE.CylinderGeometry(0.28, 0.55, 7, 7).translate(0, 3.5, 0),
      new THREE.CylinderGeometry(0.12, 0.22, 3, 5).rotateZ(0.8).translate(1.1, 6, 0),
      new THREE.CylinderGeometry(0.12, 0.2, 3, 5).rotateZ(-0.7).translate(-1, 5.6, 0.3),
    ]),
    leaves: mergeGeo([
      jitter(new THREE.IcosahedronGeometry(3.2, 1), 0.35, 1).translate(0, 8.4, 0),
      jitter(new THREE.IcosahedronGeometry(2.4, 1), 0.35, 2).translate(2.1, 7.2, 0.6),
      jitter(new THREE.IcosahedronGeometry(2.3, 1), 0.35, 3).translate(-1.9, 7, -0.8),
      jitter(new THREE.IcosahedronGeometry(2, 1), 0.3, 4).translate(0.4, 10.2, -0.5),
    ]),
  };
  const pine = {
    trunk: new THREE.CylinderGeometry(0.18, 0.42, 12, 6).translate(0, 6, 0),
    leaves: mergeGeo([
      jitter(new THREE.ConeGeometry(3.2, 4.5, 8), 0.15, 5).translate(0, 5, 0),
      jitter(new THREE.ConeGeometry(2.6, 4, 8), 0.15, 6).translate(0, 7.6, 0),
      jitter(new THREE.ConeGeometry(1.9, 3.5, 8), 0.15, 7).translate(0, 9.9, 0),
      new THREE.ConeGeometry(1.1, 3, 7).translate(0, 12.1, 0),
    ]),
  };
  const segs = [];
  for (let i = 0; i < 6; i++) segs.push(new THREE.CylinderGeometry(0.2 - i * 0.012, 0.25 - i * 0.012, 1.7, 6).translate(i * i * 0.07, 0.85 + i * 1.6, 0));
  const fronds = [];
  for (let i = 0; i < 8; i++) {
    const f = new THREE.PlaneGeometry(5, 1.0, 5, 1).translate(2.5, 0, 0).rotateX(-Math.PI / 2);
    const p = f.attributes.position;
    for (let k = 0; k < p.count; k++) { const x = p.getX(k); p.setY(k, -((x / 5) ** 2) * 2.4); }
    f.rotateZ(0.25).rotateY((i / 8) * Math.PI * 2 + (i % 2) * 0.2).translate(2.45, 9.7, 0);
    fronds.push(f);
  }
  const palm = { trunk: mergeGeo(segs), leaves: mergeGeo(fronds) };
  const mush = {
    trunk: new THREE.CylinderGeometry(0.35, 0.6, 5.5, 8).translate(0, 2.75, 0),
    leaves: new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1).translate(0, 5.3, 0),
  };
  return { broad, pine, palm, mush };
}

function grassGeometry() {
  const pos = [], nor = [], col = [];
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3, c = Math.cos(a), s = Math.sin(a), ox = (i - 1) * 0.06, oz = (i % 2) * 0.05;
    const v = [[-0.07, 0, 0], [0.07, 0, 0], [0.02, 0.75, 0.05]];
    for (const [x, y, z] of v) pos.push(x * c + z * s + ox, y, -x * s + z * c + oz);
    nor.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
    col.push(0.35, 0.35, 0.35, 0.35, 0.35, 0.35, 1, 1, 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

export class Vegetation {
  constructor(e) {
    this.e = e;
    const T = e.terrain, C = e.colliders;
    this.group = new THREE.Group();
    this.grassChunks = [];
    this.smallChunks = [];
    this.treeTops = [];
    this.flowerPatches = [];
    this.forestPoints = [];
    this.meadowPoints = [];
    const rng = mulberry32(1337);
    const excluded = (x, z) => EXCLUDE.some((q) => (x - q.x) ** 2 + (z - q.z) ** 2 < q.r * q.r);
    const ok = (x, z, clear) => {
      if (x * x + z * z > (R * 0.86) ** 2) return false;
      if (T.getHeight(x, z) < WATER + 0.9) return false;
      for (const [dx, dz] of [[0, 0], [clear, 0], [-clear, 0], [0, clear], [0, -clear]]) if (T.pathWeight(x + dx, z + dz) > 0.02) return false;
      return !excluded(x, z);
    };
    const occ = new Set();
    const G = treeGeos();
    const trees = { broad: [], pine: [], palm: [], mush: [] };
    const max = { broad: 900, pine: 480, palm: 150, mush: 70 };
    for (let i = 0; i < 16000; i++) {
      const x = (rng() * 2 - 1) * R, z = (rng() * 2 - 1) * R;
      const cell = Math.floor(x / 4) + ',' + Math.floor(z / 4);
      if (occ.has(cell) || !ok(x, z, 2.5)) continue;
      const h = T.getHeight(x, z), f = forestMask(x, z), sl = T.slopeAt(x, z);
      if (sl > 1.0) continue;
      const dl = Math.hypot(x - LAGOON.x, z - LAGOON.z), dg = Math.hypot(x - GROTTO.x, z - GROTTO.z), r = rng();
      let type = null;
      if (dg < 50 && r < 0.14) type = 'mush';
      else if ((dl < 75 || h < WATER + 3.5) && r < 0.09) type = 'palm';
      else if ((h > 22 || z < -70) && f > 0.3 && r < 0.4) type = 'pine';
      else if (f > 0.35 && r < 0.5) type = 'broad';
      else if (r < 0.012) type = 'broad';
      else if (h > 28 && r < 0.05) type = 'pine';
      if (!type || trees[type].length >= max[type]) continue;
      occ.add(cell);
      const s = type === 'palm' ? 0.8 + rng() * 0.5 : 0.75 + rng() * 0.9;
      const cols = {
        broad: rng() < 0.18 ? ['#5b3f8c', '#6a4aa0'] : rng() < 0.15 ? ['#1e7a6a'] : ['#1f5a33', '#2d6e3a', '#174a2c', '#2a5f2f'],
        pine: ['#123a2a', '#1b3325', '#16402f'], palm: ['#2f7a3a', '#3e8a3d', '#2b6b44'], mush: ['#2ee6c0', '#a855f7', '#6d7cff'],
      }[type];
      trees[type].push({ x, y: h - 0.3, z, s, ry: rng() * 6.28, c: pick(rng, cols) });
      const th = { broad: 11, pine: 13, palm: 10, mush: 6 }[type] * s;
      C.addCircle(x, z, 0.45 * s + 0.15, h - 1, h + th, 'tree');
      if (this.treeTops.length < 160 && rng() < 0.25 && type !== 'mush') this.treeTops.push(new THREE.Vector3(x, h + th * 0.92, z));
      if (f > 0.4 && this.forestPoints.length < 300) this.forestPoints.push({ x, z });
    }
    const bark = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 });
    const mats = {
      broad: patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), { wind: { amp: 0.035, minY: 5 }, key: 'broad' }),
      pine: patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), { wind: { amp: 0.02, minY: 3 }, key: 'pine' }),
      palm: patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.8, side: THREE.DoubleSide }), { wind: { amp: 0.06, minY: 8 }, key: 'palm' }),
      mush: patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.6 }), { glow: 0.9, wind: { amp: 0.01, minY: 4 }, key: 'mush' }),
    };
    const barkCol = { broad: '#4a3528', pine: '#3b2a22', palm: '#6b5237', mush: '#cfc6e0' };
    for (const k of Object.keys(trees)) {
      buildChunked(this.group, G[k].trunk, bark, trees[k].map((t) => ({ ...t, c: hex(barkCol[k]) })), { chunk: 110, shadow: true });
      buildChunked(this.group, G[k].leaves, mats[k], trees[k], { chunk: 110, shadow: true });
    }
    this.treeCount = Object.values(trees).reduce((a, b) => a + b.length, 0);

    // grass (bends with wind and around the player)
    const grassMat = patchMaterial(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), { wind: { amp: 0.25, minY: 0, push: true }, key: 'grass' });
    const grass = [];
    const grng = mulberry32(7);
    for (let i = 0; i < 140000 && grass.length < 70000; i++) {
      const a = grng() * Math.PI * 2, rr = Math.sqrt(grng()) * R * 0.9;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      const h = T.getHeight(x, z);
      if (h < WATER + 0.7 || T.pathWeight(x, z) > 0.3 || T.slopeAt(x, z) > 0.9 || h > 45) continue;
      if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 11 || Math.hypot(x - GROTTO.x, z - GROTTO.z) < 13) continue;
      const f = forestMask(x, z);
      if (grng() < f * 0.6) continue;
      const vio = smoothstep(0.62, 0.8, noise2(x * 0.018 - 30, z * 0.018 + 11));
      const c = hex('#3f7a3a').lerp(hex('#2f8a6a'), grng() * 0.5).lerp(hex('#7a5bb0'), vio * 0.8).multiplyScalar(0.8 + grng() * 0.4);
      grass.push({ x, y: h - 0.05, z, s: 0.7 + grng() * 0.8, c });
      if (grng() < 0.004 && f < 0.3) this.meadowPoints.push({ x, z });
    }
    buildChunked(this.group, grassGeometry(), grassMat, grass, { chunk: 55, list: this.grassChunks });

    // bioluminescent flowers
    const flowerGeo = mergeGeo([new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4).translate(0, 0.25, 0), new THREE.IcosahedronGeometry(0.13, 0).translate(0, 0.52, 0)]);
    const flowerMat = patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.6 }), { wind: { amp: 0.15 }, glow: 0.9, key: 'flower' });
    const flowers = [];
    const fcols = ['#b26bff', '#e24bb5', '#36e0c4', '#f7c948', '#e8e4ff', '#ff8a4c'];
    for (let p = 0; p < 900 && this.flowerPatches.length < 170; p++) {
      const x = (rng() * 2 - 1) * R * 0.85, z = (rng() * 2 - 1) * R * 0.85;
      if (!ok(x, z, 1) || forestMask(x, z) > 0.5) continue;
      const col = fcols[Math.floor(rng() * fcols.length)];
      this.flowerPatches.push(new THREE.Vector3(x, T.getHeight(x, z), z));
      const n = 12 + Math.floor(rng() * 20);
      for (let k = 0; k < n; k++) {
        const fx = x + (rng() - 0.5) * 7, fz = z + (rng() - 0.5) * 7, fh = T.getHeight(fx, fz);
        if (fh < WATER + 0.6) continue;
        flowers.push({ x: fx, y: fh, z: fz, s: 0.8 + rng() * 0.8, c: hex(col) });
      }
    }
    buildChunked(this.group, flowerGeo, flowerMat, flowers, { chunk: 55, list: this.smallChunks });

    const bushes = [], mushrooms = [], rocks = [], crystals = [], logs = [];
    for (let i = 0; i < 9000; i++) {
      const x = (rng() * 2 - 1) * R * 0.9, z = (rng() * 2 - 1) * R * 0.9;
      if (!ok(x, z, 1.2)) continue;
      const h = T.getHeight(x, z), f = forestMask(x, z), sl = T.slopeAt(x, z), r = rng();
      const dg = Math.hypot(x - GROTTO.x, z - GROTTO.z);
      if (f > 0.3 && r < 0.3 && bushes.length < 1600) bushes.push({ x, y: h - 0.2, z, s: 0.6 + rng() * 1.1, sy: 0.5 + rng() * 0.4, ry: rng() * 6, c: pick(rng, ['#1f4f2c', '#2a5e38', '#1c5a50', '#40306a']) });
      else if ((f > 0.4 || dg < 40) && r < 0.45 && mushrooms.length < 800) mushrooms.push({ x, y: h, z, s: 0.5 + rng() * 1.2, ry: rng() * 6, c: pick(rng, ['#2ee6c0', '#a855f7', '#f59e0b', '#6d7cff']) });
      else if ((sl > 0.5 || h > 30 || r < 0.05) && r < 0.6 && rocks.length < 650) {
        const s = h > 30 && rng() < 0.3 ? 2.5 + rng() * 3.5 : 0.3 + rng() * 2;
        rocks.push({ x, y: h - s * 0.25, z, s, sy: s * (0.55 + rng() * 0.4), rx: rng(), ry: rng() * 6, c: pick(rng, ['#4a4652', '#3a3642', '#2b2932', '#57515c']) });
        if (s > 1.1) C.addCircle(x, z, s * 0.85, h - 2, h + s, 'rock');
      } else if ((dg < 42 || h > 40) && r < 0.7 && crystals.length < 260) {
        const s = 0.4 + rng() * 1.6;
        crystals.push({ x, y: h + s * 0.3, z, s, sy: s * 1.6, rx: (rng() - 0.5) * 0.6, rz: (rng() - 0.5) * 0.6, c: pick(rng, ['#a855f7', '#05ce91', '#d946ef', '#60a5fa']) });
        if (s > 1.2) C.addCircle(x, z, s * 0.5, h - 1, h + s * 2, 'crystal');
      } else if (f > 0.5 && r < 0.75 && logs.length < 40) {
        const ry = rng() * Math.PI;
        logs.push({ x, y: h + 0.35, z, s: 1, rz: Math.PI / 2, ry, c: hex('#4a3528') });
        e.seats.push({ x, y: h + 0.75, z, rot: ry, kind: 'log' });
        C.addCircle(x, z, 1.2, h - 1, h + 0.9, 'log');
      }
    }
    const bushMat = patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.9, flatShading: true }), { wind: { amp: 0.05, minY: 0.2 }, key: 'bush' });
    buildChunked(this.group, jitter(new THREE.IcosahedronGeometry(1, 1), 0.3, 9).translate(0, 0.6, 0), bushMat, bushes, { chunk: 110, shadow: true });
    const mushGeo = mergeGeo([new THREE.CylinderGeometry(0.05, 0.07, 0.35, 5).translate(0, 0.17, 0), new THREE.SphereGeometry(0.2, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.6, 1).translate(0, 0.33, 0)]);
    buildChunked(this.group, mushGeo, patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.5 }), { glow: 1.4, key: 'smush' }), mushrooms, { chunk: 55, list: this.smallChunks });
    buildChunked(this.group, jitter(new THREE.DodecahedronGeometry(1, 0), 0.3, 11), new THREE.MeshStandardMaterial({ roughness: 0.95, flatShading: true }), rocks, { chunk: 110, shadow: true });
    buildChunked(this.group, new THREE.OctahedronGeometry(1, 0).scale(0.35, 1, 0.35), patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.1 }), { glow: 1.6, key: 'crys' }), crystals, { chunk: 110 });
    buildChunked(this.group, new THREE.CylinderGeometry(0.4, 0.45, 5, 7), new THREE.MeshStandardMaterial({ roughness: 1 }), logs, { chunk: 220, shadow: true });
    this.timer = 0;
  }

  update(dt, cam, Q) {
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
    const gd = Q.grassDist;
    for (const m of this.grassChunks) {
      m.visible = Math.hypot(m.userData.center.x - cam.x, m.userData.center.y - cam.z) < gd + 40;
      m.count = Math.floor(m.userData.full * Q.grass);
    }
    for (const m of this.smallChunks) m.visible = Math.hypot(m.userData.center.x - cam.x, m.userData.center.y - cam.z) < gd * 1.4 + 40;
  }
}