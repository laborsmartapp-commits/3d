import * as THREE from 'three';

// A box whose texture tiles by real-world metres, so a long wall never stretches its bricks.
export function box(w, h, d, mat, tile = 2) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, (uv.getX(k) * dims[f][0]) / tile, (uv.getY(k) * dims[f][1]) / tile); }
  const m = new THREE.Mesh(g, mat);
  m.castShadow = m.receiveShadow = true;
  return m;
}

export function place(scene, mesh, x, y, z) { mesh.position.set(x, y, z); scene.add(mesh); return mesh; }

// Collects many small untextured boxes (glass, sills, railings) into one instanced draw per material.
export class Batch {
  constructor() { this.map = new Map(); }
  add(mat, x, y, z, sx, sy, sz) { if (!this.map.has(mat)) this.map.set(mat, []); this.map.get(mat).push([x, y, z, sx, sy, sz]); }
  build(scene) {
    const g = new THREE.BoxGeometry(1, 1, 1), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    for (const [mat, list] of this.map) {
      const im = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((a, i) => { m4.compose(p.set(a[0], a[1], a[2]), q, s.set(a[3], a[4], a[5])); im.setMatrixAt(i, m4); });
      im.castShadow = im.receiveShadow = true;
      im.computeBoundingSphere();
      scene.add(im);
    }
  }
}

export function textPlane(text, w, h, bg, fg) {
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round((512 * h) / w);
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = '#d4a63a'; g.lineWidth = 6; g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.fillStyle = fg; g.font = `600 ${Math.round(c.height * 0.5)}px Cinzel, Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 }));
}