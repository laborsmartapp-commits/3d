import * as THREE from 'three';
import { box } from '../geo';
import { BASE, CURB } from './layout';

const top = BASE + CURB;

export function bench(e, x, z, side) {
  const { mats: M, batch: B } = e;
  B.add(M.wood, x, top + 0.45, z, 0.5, 0.08, 1.8);
  B.add(M.wood, x + side * 0.24, top + 0.75, z, 0.06, 0.5, 1.8);
  for (const dz of [-0.75, 0.75]) B.add(M.iron, x, top + 0.22, z + dz, 0.45, 0.44, 0.08);
  e.colliders.addBox(x, z, 0.3, 0.95, 0);
}

const GOODS = ['#f59e0b', '#dc2626', '#65a30d', '#7c3aed', '#f3e2b3', '#0ea5e9'];
export function stall(e, x, z, r, face = Math.atan2(-x, -z)) {
  const { scene, mats: M } = e, g = new THREE.Group();
  const add = (m, px, py, pz) => { m.position.set(px, py, pz); m.castShadow = m.receiveShadow = true; g.add(m); return m; };
  for (const [px, pz] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) add(box(0.12, 2.8, 0.12, M.wood), px, 1.4, pz);
  add(box(3, 0.9, 1.1, M.wood), 0, 0.45, 0.4);
  add(box(3.1, 0.08, 1.3, M.trim), 0, 0.94, 0.4);
  const can = add(box(3.4, 0.05, 2.4, M.awnings[Math.floor(r() * M.awnings.length)], 1), 0, 2.95, 0.1);
  can.rotation.x = 0.22;
  for (let i = 0; i < 7; i++) {
    const m = new THREE.MeshStandardMaterial({ color: GOODS[Math.floor(r() * GOODS.length)], roughness: 0.7 });
    add(r() < 0.5 ? new THREE.Mesh(new THREE.SphereGeometry(0.12 + r() * 0.08, 12, 8), m) : box(0.3, 0.2, 0.25, m), -1.2 + i * 0.4, 1.08, 0.4 + (r() - 0.5) * 0.4);
  }
  add(box(0.6, 0.5, 0.5, M.wood), 1.9, 0.25, -0.2);
  add(box(0.5, 0.4, 0.5, M.wood), 1.9, 0.7, -0.2);
  g.rotation.y = face; g.position.set(x, top, z); scene.add(g);
  e.colliders.addBox(x, z, 1.6, 1.1, face);
}