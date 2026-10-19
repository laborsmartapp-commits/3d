import * as THREE from 'three';

// Terrain plane (hills displaced, faceted for low poly) extending past the bounds, plus invisible boundary walls.
export function buildGround(c, root) {
  const { w, d } = c.spec.bounds, pad = 60, W = w + pad * 2, D = d + pad * 2, step = c.S.flat ? 3 : 1.5;
  const nx = Math.min(180, Math.ceil(W / step)), nz = Math.min(180, Math.ceil(D / step));
  const g = new THREE.PlaneGeometry(W, D, nx, nz).rotateX(-Math.PI / 2), pos = g.attributes.position, uv = g.attributes.uv;
  const { m, tile } = c.mat(c.spec.ground.material, c.spec.ground.color);
  let seed = 9;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const jitter = c.S.flat && Math.abs(x) < w / 2 && Math.abs(z) < d / 2 && c.spec.terrain.hills.length ? ((seed / 4294967296) - 0.5) * 0.12 : 0;
    pos.setY(i, c.L.terrain(x, z) - 0.02 + jitter);
    uv.setXY(i, x / tile, z / tile);
  }
  g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; root.add(mesh);
  c.R.floorMeshes.push(mesh);
  const C = c.C;
  C.addBox(0, d / 2 + 0.3, w / 2 + 1, 0.3, 0, -5, 60, 'bounds'); C.addBox(0, -d / 2 - 0.3, w / 2 + 1, 0.3, 0, -5, 60, 'bounds');
  C.addBox(w / 2 + 0.3, 0, 0.3, d / 2 + 1, 0, -5, 60, 'bounds'); C.addBox(-w / 2 - 0.3, 0, 0.3, d / 2 + 1, 0, -5, 60, 'bounds');
}

// Floor marks for actors: editor-only (layer 1), so they never appear in production camera footage.
export function buildMarks(c, marks) {
  const ring = new THREE.RingGeometry(0.32, 0.4, 32).rotateX(-Math.PI / 2), arrow = new THREE.ConeGeometry(0.1, 0.25, 3).rotateX(Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: '#05cc8d', transparent: true, opacity: 0.85, depthWrite: false });
  for (const mk of marks) {
    const gr = new THREE.Group(), y = c.L.groundAt(mk.x, mk.z, 0) + 0.02;
    gr.add(new THREE.Mesh(ring, mat));
    const a = new THREE.Mesh(arrow, mat); a.position.set(0, 0.02, 0.55); gr.add(a);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
    g.font = '600 30px Inter, Arial'; g.fillStyle = '#05cc8d'; g.textAlign = 'center'; g.fillText(mk.name, 128, 42);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthWrite: false, transparent: true })); sp.scale.set(1.6, 0.4, 1); sp.position.y = 0.5; gr.add(sp);
    gr.position.set(mk.x, y, mk.z); gr.rotation.y = mk.yaw;
    gr.traverse((n) => n.layers.set(1));
    c.e.scene.add(gr);
  }
}