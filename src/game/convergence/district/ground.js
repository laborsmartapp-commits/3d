import * as THREE from 'three';
import { box, place } from '../geo';
import { mosaic } from '../boulevard/street';
import { BASE, CURB, TOP, PLAZA } from './layout';

// Raised paved sidewalk block with marble curbs.
function slab(e, x0, x1, z0, z1, skipPlazaEdge = false) {
  const { scene, mats: M } = e, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  place(scene, box(w, CURB, d, M.pavers, 1.5), cx, BASE + CURB / 2, cz);
  const curb = (x, z, sx, sz) => place(scene, box(sx, CURB + 0.02, sz, M.marble, 3), x, BASE + CURB / 2 + 0.01, z);
  curb(cx, z0 + 0.17, w, 0.35); curb(cx, z1 - 0.17, w, 0.35);
  for (const x of [x0 + 0.17, x1 - 0.17]) {
    if (skipPlazaEdge && Math.abs(x) < PLAZA.hx) {
      curb(x, (z0 - PLAZA.hz) / 2, 0.35, -PLAZA.hz - z0);
      curb(x, (z1 + PLAZA.hz) / 2, 0.35, z1 - PLAZA.hz);
    } else curb(x, cz, 0.35, d);
  }
}

export function buildGround(e) {
  const { scene, mats: M } = e;
  const cob = M.cobble.clone(); cob.map = M.cobble.map.clone(); cob.bumpMap = M.cobble.bumpMap.clone();
  for (const t of [cob.map, cob.bumpMap]) { t.repeat.set(420 / 1.4, 360 / 1.4); t.needsUpdate = true; }
  const road = new THREE.Mesh(new THREE.PlaneGeometry(420, 360), cob);
  road.rotation.x = -Math.PI / 2; road.position.set(-70, BASE, 0); road.receiveShadow = true; scene.add(road);
  const Z = [[-175, -157], [-143, -77], [-63, 63], [77, 143], [157, 175]];
  for (const [x0, x1] of [[-103, -7], [7, 103]]) for (const [z0, z1] of Z) slab(e, x0, x1, z0, z1, z0 === -63);
  slab(e, 117, 140, -175, 175);
  place(scene, box(14, CURB, PLAZA.hz * 2, M.pavers, 1.5), 0, BASE + CURB / 2, 0);
  const mos = new THREE.Mesh(new THREE.CircleGeometry(PLAZA.mosaic, 96), new THREE.MeshStandardMaterial({ map: mosaic(), roughness: 0.5 }));
  mos.rotation.x = -Math.PI / 2; mos.position.y = TOP + 0.012; mos.receiveShadow = true; scene.add(mos);
  const rim = new THREE.Mesh(new THREE.RingGeometry(PLAZA.mosaic, PLAZA.mosaic + 0.6, 96), M.marble);
  rim.rotation.x = -Math.PI / 2; rim.position.y = TOP + 0.014; rim.receiveShadow = true; scene.add(rim);
}