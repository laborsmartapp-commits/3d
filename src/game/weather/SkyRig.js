import * as THREE from 'three';
import { glowTexture } from '../core/shared';

// Time-of-day keyframes: hour, sky top, horizon, ground, sun colour, sun power, hemi sky, hemi ground, hemi power, env power
const KEYS = [
  [0, '#05070f', '#141a2e', '#0c0d12', '#9fb4ff', 0.25, '#3a4a78', '#141414', 0.22, 0.07],
  [5, '#0b1124', '#2b2f52', '#121218', '#ffb38a', 0.2, '#4a5a8a', '#1a1a1a', 0.25, 0.09],
  [6.5, '#3a5a8c', '#f7b38a', '#5a5048', '#ffb37a', 1.2, '#b9c8e8', '#6a5a48', 0.6, 0.25],
  [9, '#3f7cc4', '#cfe3f3', '#8a8a80', '#fff1dc', 2.6, '#dbeafe', '#8a7a60', 0.95, 0.45],
  [13, '#2f6fc0', '#d6e8f6', '#8a8a80', '#fff6e8', 3.0, '#e0edff', '#8a7a60', 1.0, 0.5],
  [17, '#3b73b8', '#e8dcc8', '#8a7a68', '#ffd9a8', 2.4, '#dbe6f5', '#8a7258', 0.9, 0.42],
  [18.6, '#3a4f8a', '#ff9a5c', '#5a4038', '#ff8a4a', 1.4, '#c9a8b8', '#6a4a38', 0.7, 0.3],
  [19.6, '#1c2552', '#7a5a8a', '#2a2430', '#ff6a5a', 0.4, '#5a5a8a', '#2a2026', 0.4, 0.16],
  [21, '#070b1c', '#1d2342', '#0e0e14', '#9fb4ff', 0.25, '#3a4a78', '#141414', 0.24, 0.08],
  [24, '#05070f', '#141a2e', '#0c0d12', '#9fb4ff', 0.25, '#3a4a78', '#141414', 0.22, 0.07],
];
const C = (h) => new THREE.Color(h), GREY = C('#8a9098'), tmp = new THREE.Color(), cl = (v, a, b) => Math.min(b, Math.max(a, v));

function skyMat() {
  return new THREE.ShaderMaterial({
    uniforms: { top: { value: C('#2f6fc0') }, mid: { value: C('#d6e8f6') }, bot: { value: C('#8a8a80') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C('#fff6e8') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bot, pow(-h, 0.4)); float s = max(dot(vP, normalize(sunDir)), 0.0); c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 14.0) * 0.3); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}
function cloudTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  let seed = 9; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const x = r() * S, y = r() * S, rad = 14 + r() * 40;
    for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      const gr = g.createRadialGradient(x + dx, y + dy, 1, x + dx, y + dy, rad);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(4, 4); return t;
}

// Sky dome, sun/moon light, clouds, stars, fog and exposure for stages on the street-level engine.
export class SkyRig {
  constructor(e, fog) {
    this.e = e; this.base = { near: fog?.[1] ?? 60, far: fog?.[2] ?? 400 }; this.night = 0; this.flash = 0; this.boltT = 3;
    if (e.sky) e.sky.visible = false;
    this.root = new THREE.Group(); this.root.name = 'weather-sky'; e.scene.add(this.root);
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), skyMat()); this.sky.frustumCulled = false; this.sky.renderOrder = -10; this.root.add(this.sky);
    const n = 1400, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, y = 0.08 + Math.random() * 0.92, r = Math.sqrt(1 - y * y); p.set([Math.cos(a) * r * 1300, y * 1300, Math.sin(a) * r * 1300], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.stars.frustumCulled = false; this.root.add(this.stars);
    this.moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#e8eeff', transparent: true, opacity: 0, depthWrite: false, fog: false }));
    this.moon.scale.setScalar(90); this.root.add(this.moon);
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(3200, 3200).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ map: cloudTexture(), transparent: true, opacity: 0, depthWrite: false, fog: false, side: THREE.DoubleSide }));
    this.clouds.position.y = 240; this.clouds.frustumCulled = false; this.root.add(this.clouds);
  }

  key(h) { let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++; const a = KEYS[i], b = KEYS[i + 1]; return { a, b, k: (h - a[0]) / (b[0] - a[0] || 1) }; }

  update(s, dt, cam) {
    const e = this.e, h = ((s.hour % 24) + 24) % 24, { a, b, k } = this.key(h);
    const col = (i) => C(a[i]).lerp(C(b[i]), k), num = (i) => a[i] + (b[i] - a[i]) * k;
    const night = (this.night = cl((Math.abs(h - 13) - 5) / 2, 0, 1)), day = 1 - night, cloud = s.cloud;
    const grey = cloud * 0.75 + s.haze * 0.2, G = tmp.copy(GREY).multiplyScalar(0.15 + 0.85 * day);
    const u = this.sky.material.uniforms;
    u.top.value.copy(col(1)).lerp(G, grey * 0.85).multiplyScalar(s.skyBright); u.mid.value.copy(col(2)).lerp(G, grey).multiplyScalar(s.skyBright); u.bot.value.copy(col(3)).multiplyScalar(s.skyBright);
    this.root.position.set(cam.position.x, 0, cam.position.z); this.sky.position.y = cam.position.y;
    // Sun follows the selected time exactly; after dark the same light becomes moonlight.
    const isDay = h >= 6 && h <= 18.9, az = THREE.MathUtils.degToRad(s.sunAz + (isDay ? (h - 12) * 15 : 180));
    const el = isDay ? Math.max(0.12, Math.sin(((h - 6) / 12.9) * Math.PI) * 1.15) : 0.75;
    e.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(130);
    u.sunDir.value.copy(e.sunDir).normalize(); u.sunCol.value.copy(col(4)).multiplyScalar(isDay ? 1 - cloud * 0.9 : 0.15 * s.moon);
    const { sun, hemi } = e.lights;
    if (isDay) { sun.color.copy(col(4)); sun.intensity = num(5) * s.sun * (1 - cloud * 0.72); }
    else { sun.color.set('#9fb4ff'); sun.intensity = 0.25 * (0.3 + s.moon) * s.sun * (1 - cloud * 0.6); }
    sun.shadow.intensity = cl(1 - s.shadowSoft * 0.65 - cloud * 0.2, 0.12, 1);
    this.lightning(s, dt);
    hemi.color.copy(col(6)).lerp(G, cloud * 0.5); hemi.groundColor.copy(col(7)); hemi.intensity = num(8) * s.ambient * (1 - cloud * 0.15) + this.flash * 2.2;
    e.scene.environmentIntensity = num(9) * s.ambient * (1 - cloud * 0.25);
    const f = e.scene.fog;
    if (f) {
      f.color.copy(u.mid.value).lerp(tmp.set('#c9d2dc').multiplyScalar(0.2 + 0.8 * day), s.snow * 0.5);
      const thick = 1 + s.fog * 5 + s.haze * 1.2 + s.rain * 1.4 + s.snow * 2.2;
      if (f.isFogExp2) f.density = 0.0032 * thick; else { f.near = this.base.near / (1 + s.fog * 4 + s.rain + s.snow * 1.5); f.far = this.base.far / thick; }
    }
    e.renderer.toneMappingExposure = s.exposure * (1 - s.lightning * 0.06) + this.flash * 0.5;
    const sky = (1 - cloud * 0.9) * night;
    this.stars.material.opacity = s.stars * sky; this.stars.visible = this.stars.material.opacity > 0.01;
    this.moon.material.opacity = s.moon * night * (1 - cloud * 0.8); this.moon.visible = this.moon.material.opacity > 0.01;
    if (!isDay) this.moon.position.copy(e.sunDir).normalize().multiplyScalar(1200);
    const cm = this.clouds.material, wd = THREE.MathUtils.degToRad(s.windDir), sp = (0.0015 + s.cloudMove * 0.02) * dt;
    cm.opacity = Math.min(0.92, cloud * 1.05); this.clouds.visible = cm.opacity > 0.01;
    cm.color.copy(tmp.set('#ffffff').lerp(GREY, cloud * 0.6)).multiplyScalar(0.12 + 0.88 * day + this.flash);
    cm.map.offset.x += Math.cos(wd) * sp; cm.map.offset.y += Math.sin(wd) * sp;
  }

  // Lightning flashes at random moments while enabled; the weather itself never changes.
  lightning(s, dt) {
    this.flash = Math.max(0, this.flash - dt * 3);
    if (s.lightning <= 0.01) return;
    if ((this.boltT -= dt) <= 0) { this.flash = 0.7 + Math.random() * 0.3; this.boltT = (3 + Math.random() * 10) / (0.4 + s.lightning); this.e.audio?.thunder?.(1 + Math.random() * 2); }
  }
}