import * as THREE from 'three';
import { captureCube, readFaces, cubeFromFaces } from './probeCapture';

// Reflection probe baked from the generated stage itself, so glossy floors and the piano reflect the room's real
// walls, windows and ceiling instead of the generic studio softboxes. Safety rules:
// - never bakes before the main scene has rendered (the first visible frame is never blocked);
// - the capture is validated and sanitized before prefiltering; an empty/failed capture keeps the engine's
//   static environment map (materials keep their roughness / metalness, reflections stay on);
// - re-bakes only when the lighting has changed and held still, at most every MIN_GAP_S seconds.
// `?probe=off` in the URL disables it entirely (diagnostics). Live state: window.__stage.genProbe.stats.
const MIN_GAP_S = 4;
const OFF = typeof location !== 'undefined' && /[?&]probe=off\b/.test(location.search);

export class StageProbe {
  constructor(e, x, y, z, roofs) {
    Object.assign(this, { e, roofs, pos: new THREE.Vector3(x, y, z), tex: null, base: null, key: '', pending: '', frames: 0, next: 0, last: -1e9 });
    this.stats = { mode: OFF ? 'off' : 'waiting', bakes: 0, failures: 0, last_ms: 0, capture: null, error: '' };
  }
  sig() {
    const e = this.e; let sun = null; e.scene.traverse((o) => { if (!sun && o.isDirectionalLight) sun = o; });
    if (!sun) return 'none';
    const d = sun.position.clone().sub(sun.target.position).normalize(); // the sun follows the player: compare direction
    return [d.x, d.y, d.z, sun.intensity, e.renderer.toneMappingExposure, e.scene.environmentIntensity].map((v) => Math.round(v * 20)).join();
  }
  tick(t) {
    if (OFF || ++this.frames < 3 || t < this.next) return;
    this.next = t + 1;
    const key = this.sig();
    if (key === this.key) { this.pending = ''; return; }
    if (this.key && (key !== this.pending || t - this.last < MIN_GAP_S)) { this.pending = key; return; }
    this.key = key; this.last = t; this.bake();
  }
  bake() {
    const e = this.e, t0 = performance.now();
    if (e.scene.environment !== this.tex) this.base = e.scene.environment; // the engine's static map = fallback
    let rt = null, cube = null;
    try {
      const float = e.renderer.extensions.has('EXT_color_buffer_float');
      const ms = {}, lap = (k, t) => (ms[k] = Math.round(performance.now() - t));
      let t = performance.now(); rt = captureCube(e, this.pos, this.roofs, this.base, float); lap('capture', t);
      t = performance.now(); const { faces, q } = readFaces(e, rt, float); lap('readback', t);
      this.stats.capture = { precision: float ? 'float32' : '8-bit', ...q, ms };
      if (!(q.max > 0)) throw new Error('capture is empty (render target incomplete or read back failed)');
      t = performance.now(); cube = cubeFromFaces(faces);
      const pm = new THREE.PMREMGenerator(e.renderer), tex = pm.fromCubemap(cube).texture;
      pm.dispose(); lap('prefilter', t);
      const old = this.tex; this.tex = tex; e.scene.environment = tex; old?.dispose();
      Object.assign(this.stats, { mode: 'probe', bakes: this.stats.bakes + 1, error: '' });
    } catch (err) {
      e.scene.environment = this.base; this.tex?.dispose(); this.tex = null;
      Object.assign(this.stats, { mode: 'static-fallback', failures: this.stats.failures + 1, error: String(err?.message || err) });
      console.warn('[StageProbe] reflection capture failed, using the static environment map:', this.stats.error);
    } finally { rt?.dispose(); cube?.dispose(); }
    this.stats.last_ms = Math.round(performance.now() - t0);
  }
  dispose() { if (this.tex) { if (this.e.scene.environment === this.tex) this.e.scene.environment = this.base; this.tex.dispose(); this.tex = null; } }
}