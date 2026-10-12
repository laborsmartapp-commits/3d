import * as THREE from 'three';
import { rng } from './layout';

// Late dusk, held: the sun has just set. A deep blue-violet sky with soft clouds and a thin peach
// band in the west; the city's own light keeps the streets bright and readable.
function skyTexture(kind) {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = rng(kind === 'clear' ? 3 : 4), grey = kind !== 'clear';
  const v = g.createLinearGradient(0, 0, 0, H);
  v.addColorStop(0, grey ? '#1c1f3a' : '#141a44'); v.addColorStop(0.28, grey ? '#2e3156' : '#262c66'); v.addColorStop(0.44, grey ? '#4d4a6e' : '#4c4588');
  v.addColorStop(0.5, grey ? '#7a6a80' : '#8f6f9c'); v.addColorStop(0.53, '#3a3450'); v.addColorStop(1, '#241f33');
  g.fillStyle = v; g.fillRect(0, 0, W, H);
  // The afterglow: peach/amber low in the west (u≈0 and 1), a lavender belt in the east (u≈0.5).
  for (const [u, col, k] of [[0, '255,170,110', 0.75], [1, '255,170,110', 0.75], [0.5, '220,150,200', 0.35]]) {
    const gr = g.createRadialGradient(u * W, H * 0.5, 2, u * W, H * 0.5, W * 0.32);
    gr.addColorStop(0, `rgba(${col},${grey ? k * 0.5 : k})`); gr.addColorStop(1, `rgba(${col},0)`);
    g.save(); g.scale(1, 0.25); g.fillStyle = gr; g.fillRect(0, 0, W, H * 4); g.restore();
  }
  for (let i = 0; i < (grey ? 26 : 12); i++) {
    const x = r() * W, y = H * (0.18 + r() * 0.28), w = 80 + r() * 200, h = 10 + r() * 22;
    const cg = g.createRadialGradient(x, y, 1, x, y, w / 2); const lit = y > H * 0.36;
    cg.addColorStop(0, lit ? 'rgba(210,150,160,0.35)' : grey ? 'rgba(90,92,120,0.55)' : 'rgba(80,80,130,0.35)'); cg.addColorStop(1, 'rgba(80,80,130,0)');
    g.save(); g.translate(x, y); g.scale(1, h / w); g.translate(-x, -y); g.fillStyle = cg; g.fillRect(x - w, y - w, w * 2, w * 2); g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const LEVELS = { clear: [1.05, 0.55, 140, 520], cloudy: [0.95, 0.4, 110, 440], drizzle: [0.9, 0.34, 70, 360] };
export function applyDusk(e, kind = 'clear') {
  const k = LEVELS[kind] ? kind : 'clear', [hemi, sky, near, far] = LEVELS[k];
  if (e.renderer) e.renderer.toneMappingExposure = 1.08;
  const dome = e.scene.children?.find((o) => o.geometry?.parameters?.radius === 1500);
  if (dome) { dome.material.map?.dispose(); dome.material.map = skyTexture(k); dome.material.needsUpdate = true; }
  if (e.scene.fog) { e.scene.fog.color.set(k === 'drizzle' ? '#3a3b58' : '#433f66'); e.scene.fog.near = near; e.scene.fog.far = far; }
  e.scene.environmentIntensity = 0.32;
  const L = e.lights;
  if (L) {
    L.hemi.color.set('#8a90d8'); L.hemi.groundColor.set('#3e3040'); L.hemi.intensity = hemi;
    L.sun.color.set('#aab4ff'); L.sun.intensity = sky;
  }
  return true;
}

// A bounded pool of real point lights handed to the nearest frontages, screens and lamps, so neon
// and windows genuinely light the pavement, walls and people around the viewer. No shadows.
export class LightPool {
  constructor(scene, n) {
    this.src = []; this.t = 0; this.active = [];
    this.lights = Array.from({ length: n }, () => { const l = new THREE.PointLight('#ffffff', 0, 14, 1.6); scene.add(l); return l; });
  }
  add(x, y, z, color, intensity = 6, dist = 14) { this.src.push({ x, y, z, color: new THREE.Color(color), intensity, dist }); }
  update(dt, fx, fz) {
    if ((this.t -= dt) > 0) return;
    this.t = 0.35;
    const near = [];
    for (const s of this.src) { const d = (s.x - fx) ** 2 + (s.z - fz) ** 2; if (d < 3600) near.push([d, s]); }
    near.sort((a, b) => a[0] - b[0]);
    this.lights.forEach((l, i) => {
      const s = near[i]?.[1];
      if (!s) { l.intensity = 0; return; }
      l.position.set(s.x, s.y, s.z); l.color.copy(s.color); l.distance = s.dist; l.intensity = s.intensity;
    });
  }
}

function glowTex(vertical) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = vertical ? g.createRadialGradient(32, 64, 0, 32, 64, 64) : g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
// Light spill approximations that work at every quality setting: soft coloured pools on the
// pavement under lamps and shopfronts, and washes up the walls above sconces and signs.
export class Spill {
  constructor() { this.g = []; this.w = []; }
  pool(x, y, z, r, color, k = 0.5) { this.g.push([x, y, z, r, new THREE.Color(color).multiplyScalar(k)]); }
  wash(x, y, z, yaw, w, h, color, k = 0.4) { this.w.push([x, y, z, yaw, w, h, new THREE.Color(color).multiplyScalar(k)]); }
  build(scene) {
    const mk = (list, geo, tex, set) => {
      if (!list.length) return;
      const m = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }), list.length);
      const o = new THREE.Object3D();
      list.forEach((it, i) => { set(o, it); o.updateMatrix(); m.setMatrixAt(i, o.matrix); m.setColorAt(i, it[it.length - 1]); });
      m.frustumCulled = false; m.renderOrder = 2; scene.add(m);
    };
    const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    mk(this.g, flat, glowTex(false), (o, [x, y, z, r]) => { o.position.set(x, y + 0.012, z); o.rotation.set(0, 0, 0); o.scale.set(r * 2, 1, r * 2); });
    mk(this.w, new THREE.PlaneGeometry(1, 1), glowTex(true), (o, [x, y, z, yaw, w, h]) => { o.position.set(x, y, z); o.rotation.set(0, yaw, 0); o.scale.set(w, h, 1); });
  }
}