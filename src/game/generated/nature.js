import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { rng } from '../realm/textures';
import { T } from '../realm/textures';

const hash = (s) => { let h = 2166136261; for (const ch of String(s)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const prep = (g) => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv'].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; };
const join = (list) => mergeGeometries(list.map(prep), false);
// Lumpy organic canopy for the photoreal style (displaced icosphere).
function lumpy(r, detail, seed) { const g = new THREE.IcosahedronGeometry(r, detail), p = g.attributes.position, R = rng(seed); for (let i = 0; i < p.count; i++) { const k = 1 + (R() - 0.5) * 0.28; p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; }

// Per-style part geometry: [geometry, 'bark' | 'leaf' | 'stone' | 'bloom' | 'cap', base colour]
function parts(type, S) {
  const seg = S.seg, facet = S.canopy === 'facet', real = S.canopy === 'layered';
  const ball = (r, x, y, z, sy = 1) => (facet ? new THREE.IcosahedronGeometry(r, 0) : real ? lumpy(r, 2, (x * 13 + z * 7 + y) | 0) : new THREE.SphereGeometry(r, 18, 12)).scale(1, sy, 1).translate(x, y, z);
  const trunk = (h, r0, r1) => new THREE.CylinderGeometry(r1, r0, h, Math.max(5, seg / 3)).translate(0, h / 2, 0);
  const G = real ? '#4a6b2e' : facet ? '#4fb34a' : '#5fbf4a';
  switch (type) {
    case 'tree_broadleaf': return [[trunk(3, 0.28, 0.18), 'bark', '#6b4a32'], [join(real ? [ball(1.9, 0, 4.3, 0), ball(1.4, 1.1, 3.8, 0.4), ball(1.3, -1, 3.9, -0.5), ball(1.2, 0.2, 5.4, 0.3)] : facet ? [ball(2.1, 0, 4.4, 0, 1.1)] : [ball(1.8, 0, 4.2, 0), ball(1.3, 1, 3.8, 0.3), ball(1.25, -0.9, 3.9, -0.4)]), 'leaf', G]];
    case 'tree_blossom': return [[trunk(2.6, 0.24, 0.16), 'bark', '#5a3e2c'], [join(facet ? [ball(1.9, 0, 3.8, 0)] : [ball(1.6, 0, 3.7, 0), ball(1.15, 0.9, 3.3, 0.3), ball(1.1, -0.8, 3.4, -0.3)]), 'bloom', '#f2a7c3']];
    case 'tree_pine': return [[trunk(2, 0.25, 0.18), 'bark', '#5a3e2c'], [join([0, 1, 2].map((i) => new THREE.ConeGeometry(2.2 - i * 0.55, 2.6, facet ? 6 : 16).translate(0, 2.6 + i * 1.6, 0))), 'leaf', real ? '#2f4f2a' : facet ? '#2e8a4a' : '#3d9a52']];
    case 'tree_palm': {
      const fronds = []; for (let i = 0; i < (facet ? 5 : 8); i++) { const a = (i / (facet ? 5 : 8)) * Math.PI * 2; fronds.push(new THREE.BoxGeometry(2.6, 0.04, 0.5).translate(1.3, 0, 0).rotateZ(-0.35).rotateY(a).translate(0, 6.6, 0)); }
      return [[new THREE.CylinderGeometry(0.16, 0.26, 6.6, Math.max(5, seg / 3)).translate(0, 3.3, 0), 'bark', '#8a6a4a'], [join(fronds), 'leaf', real ? '#3e6b2e' : '#4fae46']];
    }
    case 'bush': return [[join(facet ? [ball(0.8, 0, 0.6, 0)] : [ball(0.7, 0, 0.6, 0), ball(0.5, 0.5, 0.45, 0.1), ball(0.5, -0.45, 0.45, -0.1)]), 'leaf', G]];
    case 'rock': return [[(facet ? new THREE.IcosahedronGeometry(0.8, 0) : lumpy(0.8, real ? 2 : 1, 7)).scale(1.3, 0.75, 1).translate(0, 0.35, 0), 'stone', '#8f8a80']];
    case 'flowers': { const R = rng(3), list = []; for (let i = 0; i < 9; i++) list.push((facet ? new THREE.IcosahedronGeometry(0.08, 0) : new THREE.SphereGeometry(0.07, 8, 6)).translate((R() - 0.5) * 0.7, 0.28 + R() * 0.15, (R() - 0.5) * 0.7)); return [[join(list), 'bloom', '#e8508a'], [new THREE.CylinderGeometry(0.4, 0.45, 0.22, facet ? 6 : 12).translate(0, 0.11, 0), 'leaf', G]]; }
    case 'grass_tuft': { const list = []; for (let i = 0; i < 6; i++) list.push(new THREE.ConeGeometry(0.05, 0.7, 3).translate(0, 0.35, 0).rotateZ((i - 2.5) * 0.12).rotateY(i * 1.1)); return [[join(list), 'leaf', real ? '#6b8a3e' : '#7cc24f']]; }
    case 'mushroom': return [[new THREE.CylinderGeometry(0.12, 0.18, 0.9, Math.max(5, seg / 3)).translate(0, 0.45, 0), 'stem', '#efe6d4'], [new THREE.SphereGeometry(0.55, facet ? 6 : 20, facet ? 3 : 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.7, 1).translate(0, 0.85, 0), 'cap', '#e0485a']];
  }
  return [];
}

// Instanced vegetation: each placement scatters `count` copies (seeded, so a stage always rebuilds identically).
export function buildNature(c, list) {
  const S = c.S, groups = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), col = new THREE.Color();
  const kinds = {
    bark: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: S.flat, map: S.tex && !S.flat ? T.wood() : null }),
    leaf: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: S.flat ? 0.9 : 0.75, flatShading: S.flat, side: THREE.DoubleSide }),
    bloom: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.6, flatShading: S.flat }),
    stone: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.92, flatShading: S.flat || S.canopy === 'puffy' ? S.flat : false, map: S.tex && !S.flat ? T.stone() : null }),
    stem: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.8, flatShading: S.flat }),
    cap: () => new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.5, flatShading: S.flat, emissive: '#ff6a7a', emissiveIntensity: 0.25 }),
  };
  const mats = {};
  for (const n of list) {
    const R = rng(hash(n.id)), count = Math.max(1, Math.round(n.count * (n.count > 1 ? S.density : 1)));
    for (let i = 0; i < count; i++) {
      const a = R() * Math.PI * 2, rr = count > 1 ? Math.sqrt(R()) * n.radius : 0, x = n.x + Math.cos(a) * rr, z = n.z + Math.sin(a) * rr;
      if (c.C.blocked?.(x, z, 0.3, 0.5) && n.type !== 'flowers') continue; // never inside walls or buildings
      const y = n.y ?? c.L.groundAt(x, z, 0), k = n.scale * (0.8 + R() * 0.4);
      if (!groups.has(n.type)) groups.set(n.type, { parts: parts(n.type, S), list: [] });
      groups.get(n.type).list.push({ x, y, z, k, ry: R() * Math.PI * 2, tint: n.color, v: R() });
      if (n.type.startsWith('tree')) c.C.addCircle(x, z, 0.3 * k, -1, 6 * k, 'tree');
      else if (n.type === 'rock' && k > 0.7) c.C.addCircle(x, z, 0.7 * k, -1, 0.8 * k, 'rock');
    }
  }
  for (const { parts: P, list: L } of groups.values()) for (const [geo, kind, base] of P) {
    const im = new THREE.InstancedMesh(geo, (mats[kind] ||= kinds[kind]()), L.length);
    L.forEach((o, i) => {
      im.setMatrixAt(i, m4.compose(p.set(o.x, o.y, o.z), q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, o.ry), s.setScalar(o.k)));
      col.set((kind === 'bloom' || kind === 'cap' || kind === 'leaf') && o.tint ? o.tint : base); const h = {}; col.getHSL(h);
      col.setHSL((h.h + (o.v - 0.5) * (S.canopy === 'layered' ? 0.04 : 0.02)) % 1, Math.min(1, h.s * S.sat), h.l * (0.85 + o.v * 0.3));
      im.setColorAt(i, col);
    });
    im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
    c.e.scene.add(im);
  }
}