import * as THREE from 'three';

const box = new THREE.Box3(), size = new THREE.Vector3(), WHITE = new THREE.Color('#ffffff');

// Ground wetness and snow cover on the stage's large walkable surfaces (roads, plazas, lawns, floors
// outside). Found once from the scene; base values are kept so the effect is fully reversible.
export class Surfaces {
  constructor(e) { this.e = e; this.mats = null; this.last = ''; }
  find() {
    const set = new Map();
    this.e.scene.traverse((o) => {
      if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
      const m = o.material;
      if (!m?.isMeshStandardMaterial || m.transparent || set.has(m) || m.userData.indoor) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).getSize(size);
      if (size.y < 0.6 && size.x * size.z > 16) set.set(m, { r: m.roughness, c: m.color.clone(), em: m.emissive.clone() });
    });
    this.mats = [...set];
  }
  get supported() { if (!this.mats) this.find(); return this.mats.length > 0; }
  update(s) {
    const key = `${s.wetness.toFixed(2)}|${s.snowCover.toFixed(2)}`;
    if (key === this.last) return;
    if (!this.mats) this.find();
    this.last = key;
    for (const [m, b] of this.mats) {
      m.roughness = b.r * (1 - 0.72 * s.wetness * (1 - s.snowCover));
      m.color.copy(b.c).multiplyScalar(1 - 0.32 * s.wetness * (1 - s.snowCover)).lerp(WHITE, s.snowCover * 0.55);
      m.emissive.copy(b.em).lerp(WHITE, s.snowCover * 0.28);
    }
  }
}