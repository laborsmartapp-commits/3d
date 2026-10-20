import * as THREE from 'three';

// Reflection probe baked from the generated stage itself. Generated stages used the engine's generic studio
// environment, whose bright softbox panels reflected in mirror-polished floors as unexplained white blobs that
// matched nothing in the room. The probe makes glossy surfaces reflect the stage's real walls, windows and ceiling.
export class StageProbe {
  // First bake on the first frame (a slow first frame must not show the generic studio reflections meanwhile).
  constructor(e, x, y, z, roofs) { this.e = e; this.pos = new THREE.Vector3(x, y, z); this.roofs = roofs; this.tex = null; this.key = ''; this.next = 0; }
  // Re-bakes only when the sun direction/intensity or exposure changed (Weather bubble), checked once a second.
  // The sun follows the player, so its direction (not its position) is compared.
  tick(t) {
    if (t < this.next) return; this.next = t + 1;
    const e = this.e; let sun = null; e.scene.traverse((o) => { if (!sun && o.isDirectionalLight) sun = o; });
    const d = sun && sun.position.clone().sub(sun.target.position).normalize();
    const key = sun ? [d.x, d.y, d.z, sun.intensity, e.renderer.toneMappingExposure, e.scene.environmentIntensity].map((v) => Math.round(v * 20)).join() : 'none';
    if (key !== this.key) { this.key = key; this.bake(); }
  }
  bake() {
    const e = this.e, rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType }), cam = new THREE.CubeCamera(0.05, 500, rt);
    cam.position.copy(this.pos);
    const shown = [];
    const hideIf = (o) => { if (o?.isObject3D && o.visible) { shown.push([o, true]); o.visible = false; } };
    e.scene.traverse((o) => { if (o.isSkinnedMesh) hideIf(o); });
    for (const k of ['mesh', 'group', 'root', 'obj', 'model']) hideIf(e.player?.[k]);
    for (const r of this.roofs) if (!r.node.visible) { shown.push([r.node, false]); r.node.visible = true; } // bake with ceilings in place
    const env = this.tex ? this.base : e.scene.environment; this.base = env; e.scene.environment = env;
    e.scene.add(cam); cam.update(e.renderer, e.scene); e.scene.remove(cam);
    for (const [o, v] of shown) o.visible = v;
    const pm = new THREE.PMREMGenerator(e.renderer), tex = pm.fromCubemap(rt.texture).texture;
    pm.dispose(); rt.dispose();
    this.tex?.dispose(); this.tex = tex; e.scene.environment = tex;
  }
  dispose() { if (this.tex) { if (this.e.scene.environment === this.tex) this.e.scene.environment = this.base; this.tex.dispose(); this.tex = null; } }
}