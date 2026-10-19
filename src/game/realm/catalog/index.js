import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Kit } from '../kit';
import { getMaterials } from '../materials';
import living from './living';
import kitchen from './kitchen';
import bedroom from './bedroom';
import bath from './bath';
import studio from './studio';
import outdoor from './outdoor';
import decor from './decor';

// Reusable base asset definitions (separate from scene-instance data in the set scene).
export const CATALOG = { ...living, ...kitchen, ...bedroom, ...bath, ...studio, ...outdoor, ...decor };
export const CATEGORIES = ['Living Room', 'Dining Room', 'Kitchen', 'Bedroom', 'Bathroom', 'Studio', 'DJ & Stage', 'Outdoor Furniture', 'Lighting', 'Electronics', 'Decorations', 'Plants', 'Seasonal Decorations', 'Production Props'];

const protos = new Map();
const KEEP = ['position', 'normal', 'uv'];

// Builds a catalog item once and bakes it into one merged mesh per material; instances share it.
export function prepare(type) {
  if (protos.has(type)) return protos.get(type);
  const def = CATALOG[type], k = new Kit(getMaterials());
  def.build(k, def.color || '#ffffff', def);
  k.g.updateMatrixWorld(true);
  const lives = new Set(k.lives), by = new Map();
  k.g.traverse((o) => {
    if (!o.isMesh || lives.has(o)) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrixWorld);
    for (const a of Object.keys(g.attributes)) if (!KEEP.includes(a)) g.deleteAttribute(a);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!by.has(o.material)) by.set(o.material, []);
    by.get(o.material).push(g);
  });
  const parts = [...by].map(([mat, list]) => { const geo = mergeGeometries(list, false); list.forEach((g) => g.dispose()); geo.computeBoundingSphere(); return { mat, geo }; });
  const box = new THREE.Box3().setFromObject(k.g);
  const p = { def, parts, lives: k.lives, box, main: k.main, lights: k.lights };
  protos.set(type, p);
  return p;
}

export function instantiate(type) {
  const p = prepare(type), g = new THREE.Group(), s = p.box.getSize(new THREE.Vector3()), big = s.x + s.z > 0.7 && p.def.shadow !== false;
  for (const { mat, geo } of p.parts) { const m = new THREE.Mesh(geo, mat); m.castShadow = big && !mat.transparent; m.receiveShadow = true; g.add(m); }
  g.userData.lives = p.lives.map((o) => { const m = o.clone(); g.add(m); return m; });
  return { node: g, proto: p };
}

export const defOf = (type) => CATALOG[type];