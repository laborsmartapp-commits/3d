import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const eu = new THREE.Euler(), q = new THREE.Quaternion(), m4 = new THREE.Matrix4(), p = new THREE.Vector3(), sc = new THREE.Vector3();

// Box whose texture tiles by real metres (tile = 0 keeps one image per face).
export function tiledBox(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d);
  if (!tile) return g;
  const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile); }
  return g;
}

// Every static piece of the market is baked into one mesh per material per 80 m chunk.
export class Merger {
  constructor(chunk = 80) { this.chunk = chunk; this.m = new Map(); }
  add(mat, g, x, y, z, rx = 0, ry = 0, rz = 0, s = 1) {
    if (!g.index) g = mergeVertices(g);
    g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(eu.set(rx, ry, rz, 'YXZ')), sc.set(s, s, s)));
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    const key = `${Math.floor(x / this.chunk)},${Math.floor(z / this.chunk)}`;
    if (!this.m.has(mat)) this.m.set(mat, new Map());
    const c = this.m.get(mat); if (!c.has(key)) c.set(key, []); c.get(key).push(g);
  }
  box(mat, x, y, z, w, h, d, ry = 0, tile = 2, rx = 0, rz = 0) { this.add(mat, tiledBox(w, h, d, tile), x, y, z, rx, ry, rz); }
  build(scene) {
    for (const [mat, chunks] of this.m) for (const list of chunks.values()) {
      const g = mergeGeometries(list, false); list.forEach((x) => x.dispose());
      const mesh = new THREE.Mesh(g, mat);
      mesh.castShadow = !mat.transparent; mesh.receiveShadow = true;
      scene.add(mesh);
    }
    this.m.clear();
  }
}

// A frame on one face of a lot: u runs along the wall, d outward from it.
export function face(ox, oz, yaw) {
  const c = Math.cos(yaw), s = Math.sin(yaw);
  return { yaw, at: (u, d) => ({ x: ox + c * u + s * d, z: oz - s * u + c * d }) };
}