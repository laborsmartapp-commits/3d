import * as THREE from 'three';

// Low-level steps of the stage reflection probe: capture -> read back -> sanitize -> cube texture.
// Captured radiance is checked on the CPU before it reaches the prefilter, so an overflowing highlight
// (e.g. a lamp's specular peak on a mirror-polished floor, > 65504 in half precision = Infinity) can never
// turn into NaN in the environment map and blacken every glossy material.
export const SIZE = 128, CLAMP = 512;

export function captureCube(e, pos, roofs, base, float) {
  const rt = new THREE.WebGLCubeRenderTarget(SIZE, { type: float ? THREE.FloatType : THREE.UnsignedByteType, generateMipmaps: false, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
  const cam = new THREE.CubeCamera(0.05, 500, rt), shown = [], env = e.scene.environment;
  cam.position.copy(pos);
  const hide = (o) => { if (o?.isObject3D && o.visible) { shown.push([o, true]); o.visible = false; } };
  e.scene.traverse((o) => { if (o.isSkinnedMesh || o.isSprite) hide(o); });
  for (const k of ['mesh', 'group', 'root', 'obj', 'model']) hide(e.player?.[k]);
  for (const r of roofs) if (!r.node.visible) { shown.push([r.node, false]); r.node.visible = true; } // ceilings in place
  e.scene.environment = base; // never reflect the probe into itself
  // The 6 faces reuse the shadow maps of the last visible frame instead of re-rendering every shadow 6 times.
  const sm = e.renderer.shadowMap, auto = sm.autoUpdate; sm.autoUpdate = false;
  try { e.scene.add(cam); cam.update(e.renderer, e.scene); }
  finally { sm.autoUpdate = auto; e.scene.remove(cam); e.scene.environment = env; for (const [o, v] of shown) o.visible = v; }
  return rt;
}

// Reads the 6 faces, replaces non-finite texels, clamps extreme highlights and converts to half floats.
export function readFaces(e, rt, float) {
  const n = rt.width, len = n * n * 4, buf = float ? new Float32Array(len) : new Uint8Array(len), faces = [];
  const q = { nonfinite: 0, over_half: 0, clamped: 0, raw_max: 0, max: 0, mean: 0 };
  let sum = 0;
  for (let f = 0; f < 6; f++) {
    buf.fill(0);
    e.renderer.readRenderTargetPixels(rt, 0, 0, n, n, buf, f);
    const h = new Uint16Array(len);
    for (let i = 0; i < len; i++) {
      if ((i & 3) === 3) { h[i] = 0x3c00; continue; } // alpha 1
      let v = float ? buf[i] : buf[i] / 255;
      if (!Number.isFinite(v)) { q.nonfinite++; v = 0; }
      else { if (v > q.raw_max) q.raw_max = v; if (v > 65504) q.over_half++; if (v > CLAMP) { q.clamped++; v = CLAMP; } if (v < 0) v = 0; }
      if (v > q.max) q.max = v; sum += v;
      h[i] = THREE.DataUtils.toHalfFloat(v);
    }
    faces.push(h);
  }
  q.mean = sum / (n * n * 3 * 6);
  for (const k of ['raw_max', 'max', 'mean']) q[k] = Math.round(q[k] * 1e4) / 1e4;
  return { faces, q };
}

// Same orientation as the render-target cube it was read from (so the prefilter must not mirror it).
export function cubeFromFaces(faces) {
  const imgs = faces.map((d) => new THREE.DataTexture(d, SIZE, SIZE, THREE.RGBAFormat, THREE.HalfFloatType));
  const cube = new THREE.CubeTexture(imgs);
  Object.assign(cube, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, generateMipmaps: false, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, flipY: false, isRenderTargetTexture: true });
  cube.colorSpace = THREE.LinearSRGBColorSpace;
  cube.needsUpdate = true;
  return cube;
}