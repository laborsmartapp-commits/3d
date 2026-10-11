import * as THREE from 'three';

// Street lamp drawn entirely from batched boxes, so hundreds cost a few draw calls.
export function lamp(e, x, z) {
  const { mats: M, batch: B } = e, y = e.groundAt(x, z);
  B.add(M.iron, x, y + 0.2, z, 0.4, 0.4, 0.4);
  B.add(M.iron, x, y + 2.5, z, 0.14, 4.4, 0.14);
  B.add(M.lantern, x, y + 4.95, z, 0.4, 0.55, 0.4);
  B.add(M.iron, x, y + 5.3, z, 0.55, 0.14, 0.55);
  e.colliders.addCircle(x, z, 0.22);
}

export function fountain(e, x, z) {
  const { scene, mats: M } = e, y = e.groundAt(x, z);
  M.water ||= new THREE.MeshStandardMaterial({ color: '#5fa8c9', metalness: 0.3, roughness: 0.08, transparent: true, opacity: 0.85 });
  const mesh = (g, m, py) => { const o = new THREE.Mesh(g, m); o.position.set(x, y + py, z); o.castShadow = o.receiveShadow = true; scene.add(o); return o; };
  mesh(new THREE.CylinderGeometry(3.2, 3.4, 0.7, 32), M.marble, 0.35);
  mesh(new THREE.CircleGeometry(2.9, 32), M.water, 0.66).rotation.x = -Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.35, 0.5, 2.4, 16), M.marble, 1.9);
  mesh(new THREE.CylinderGeometry(1.2, 0.4, 0.35, 24), M.marble, 3.1);
  mesh(new THREE.SphereGeometry(0.35, 16, 12), M.gold, 3.6);
  e.colliders.addCircle(x, z, 3.5);
}

// A faint marble inlay marks each open gathering space.
export function spaceRing(e, s) {
  const m = new THREE.Mesh(new THREE.RingGeometry(s.r - 0.2, s.r, 64), new THREE.MeshStandardMaterial({ color: '#efe6d6', roughness: 0.4, transparent: true, opacity: 0.55 }));
  m.rotation.x = -Math.PI / 2; m.position.set(s.x, e.groundAt(s.x, s.z) + 0.02, s.z); m.receiveShadow = true;
  e.scene.add(m);
}

// Every tree in the district, drawn as three instanced meshes.
export class Forest {
  constructor() { this.t = []; }
  add(x, z, k = 1) { this.t.push([x, z, k]); }
  build(e, r) {
    const n = this.t.length; if (!n) return;
    const { scene, mats: M } = e, geo = new THREE.IcosahedronGeometry(1, 1);
    const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.2, 3.2, 8), M.bark, n);
    const crowns = [new THREE.InstancedMesh(geo, M.leaf, n * 3), new THREE.InstancedMesh(geo, M.leaf2, n * 2)];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3(), idx = [0, 0];
    this.t.forEach(([x, z, k], i) => {
      const y = e.groundAt(x, z);
      trunks.setMatrixAt(i, m4.compose(p.set(x, y + 1.6 * k, z), q, s.set(k, k, k)));
      for (let j = 0; j < 5; j++) {
        const w = j < 3 ? 0 : 1, rad = (0.9 + r() * 0.6) * k;
        crowns[w].setMatrixAt(idx[w]++, m4.compose(p.set(x + (r() - 0.5) * 1.4 * k, y + (3.4 + r() * 1.2) * k, z + (r() - 0.5) * 1.4 * k), q, s.set(rad, rad, rad)));
      }
      e.colliders.addCircle(x, z, 0.35 * k);
    });
    for (const im of [trunks, ...crowns]) { im.castShadow = im.receiveShadow = true; im.computeBoundingSphere(); scene.add(im); }
  }
}