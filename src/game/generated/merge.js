import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const KEEP = ['position', 'normal', 'uv'];
const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), p = new THREE.Vector3(), sc = new THREE.Vector3();
const UNIT = new THREE.BoxGeometry(1, 1, 1);

// A box whose texture tiles by real metres, so long walls and floors never stretch their pattern.
export function tbox(w, h, d, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile); }
  return g;
}
export const bbox = (w, h, d, r) => (r > 0.002 ? new RoundedBoxGeometry(w, h, d, 2, Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001))) : new THREE.BoxGeometry(w, h, d));

// Static geometry merged into one mesh per material (few draw calls for a whole stage).
export class Merge {
  constructor() { this.map = new Map(); }
  add(mat, geo, x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (!KEEP.includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups();
    eu.set(rx, ry, rz, 'YXZ');
    g.applyMatrix4(m4.compose(p.set(x, y, z), q.setFromEuler(eu), sc.set(sx, sy, sz)));
    if (!this.map.has(mat)) this.map.set(mat, []);
    this.map.get(mat).push(g);
  }
  build(parent) {
    const out = [];
    for (const [mat, list] of this.map) {
      const g = mergeGeometries(list, false); list.forEach((x) => x.dispose());
      if (!g) continue;
      const m = new THREE.Mesh(g, mat); m.castShadow = !mat.transparent; m.receiveShadow = true;
      parent.add(m); out.push(m);
    }
    this.map.clear();
    return out;
  }
}

// Many repeated small pieces (window panes, frames, lane dashes, pickets): one instanced draw per geometry+material.
export class Inst {
  constructor() { this.map = new Map(); }
  add(mat, x, y, z, sx, sy, sz, ry = 0, geo = UNIT, rx = 0) {
    const k = `${mat.uuid}|${geo.uuid}`;
    if (!this.map.has(k)) this.map.set(k, { mat, geo, list: [] });
    this.map.get(k).list.push([x, y, z, sx, sy, sz, ry, rx]);
  }
  build(parent) {
    for (const { mat, geo, list } of this.map.values()) {
      const im = new THREE.InstancedMesh(geo, mat, list.length);
      list.forEach((a, i) => { eu.set(a[7], a[6], 0, 'YXZ'); im.setMatrixAt(i, m4.compose(p.set(a[0], a[1], a[2]), q.setFromEuler(eu), sc.set(a[3], a[4], a[5]))); });
      im.castShadow = !mat.transparent; im.receiveShadow = true; im.computeBoundingSphere();
      parent.add(im);
    }
    this.map.clear();
  }
}