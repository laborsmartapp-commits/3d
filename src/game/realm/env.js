import * as THREE from 'three';
import { ENV_DEFAULT } from './templates';

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
export const PRESETS = { Morning: 8, Afternoon: 14, Sunset: 18.6, Dusk: 19.6, Night: 22 };
export const ACCENTS = { warm: '#ffb070', cool: '#62b6ff', purple: '#a56bff', studio: '#ff3b5c', party: null, off: null };
const WEATHER = { clear: [1, 1, 1], overcast: [0.35, 1.15, 0.7], fog: [0.5, 1.1, 0.25] };
const C = (h) => new THREE.Color(h), tc = new THREE.Color(), tv = new THREE.Vector3();

function skyMat() {
  return new THREE.ShaderMaterial({
    uniforms: { top: { value: C('#2f6fc0') }, mid: { value: C('#d6e8f6') }, bot: { value: C('#8a8a80') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: C('#fff6e8') } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 bot; uniform vec3 sunDir; uniform vec3 sunCol; varying vec3 vP; void main(){ float h = vP.y; vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.55)) : mix(mid, bot, pow(-h, 0.4)); float s = max(dot(vP, normalize(sunDir)), 0.0); c += sunCol * (pow(s, 900.0) * 6.0 + pow(s, 14.0) * 0.3); gl_FragColor = vec4(c, 1.0);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
}

// Realm Environment: time of day, sun, weather, exposure and every practical light (pooled for speed).
export class RealmEnv {
  constructor(R) {
    this.R = R; const e = (this.e = R.e);
    this.s = { ...ENV_DEFAULT, rooms: {} };
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 16), skyMat()); this.sky.frustumCulled = false; e.scene.add(this.sky);
    this.pool = []; const n = e.isTouch ? 6 : 12;
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight('#ffd9a8', 0, 8, 2); l.castShadow = false; e.scene.add(l); this.pool.push(l); }
    this.poolT = 0; this.assigned = []; this.flick = 0;
  }
  load(s) { this.s = { ...ENV_DEFAULT, ...(s || {}), rooms: { ...(s?.rooms || {}) } }; this.poolT = 0; }
  save() { return JSON.parse(JSON.stringify(this.s)); }
  set(p) { Object.assign(this.s, p); this.poolT = 0; this.R.store.markDirty(); }
  setRoom(id, on) { this.s.rooms = { ...this.s.rooms, [id]: on }; this.poolT = 0; this.R.store.markDirty(); }
  setPlayback(h, w) { if (h != null) this.s.hour = h; if (w && WEATHER[w]) this.s.weather = w; }
  roomOn(id) { return this.s.rooms[id] !== false; }
  get outdoorOn() { const s = this.s; return s.outdoor === 'on' || (s.outdoor === 'auto' && (s.hour >= 18.3 || s.hour < 6.6)); }
  accentColor(t) { const s = this.s; if (s.accent === 'party') return tc.setHSL((t * 0.12) % 1, 0.9, 0.55); return tc.set(ACCENTS[s.accent] || '#000000'); }

  key(h) { let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++; const a = KEYS[i], b = KEYS[i + 1], k = (h - a[0]) / (b[0] - a[0] || 1); return { a, b, k }; }
  update(dt, t) {
    const e = this.e, s = this.s;
    // The universal weather system owns time, sky, sun, fog and exposure; this keeps only the set's practical lights.
    if (e.weather) { s.hour = e.weather.s.hour; this.sky.visible = false; }
    else this.skyUpdate();
    this.practicals(dt, t);
  }
  skyUpdate() {
    const e = this.e, s = this.s, { a, b, k } = this.key(((s.hour % 24) + 24) % 24), W = WEATHER[s.weather] || WEATHER.clear;
    const col = (i) => C(a[i]).lerp(C(b[i]), k), num = (i) => a[i] + (b[i] - a[i]) * k, grey = s.weather === 'clear' ? 0 : 0.55;
    const u = this.sky.material.uniforms, G = C('#8a9098');
    u.top.value.copy(col(1)).lerp(G, grey * 0.8); u.mid.value.copy(col(2)).lerp(G, grey); u.bot.value.copy(col(3));
    this.sky.position.copy(e.camera.position);
    const day = s.hour >= 6 && s.hour <= 18.9, az = THREE.MathUtils.degToRad(s.azimuth + (s.hour - 12) * 15);
    const el = day ? Math.max(0.12, Math.sin(((s.hour - 6) / 12.9) * Math.PI) * 1.15) : 0.75;
    e.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).multiplyScalar(130);
    u.sunDir.value.copy(e.sunDir).normalize(); u.sunCol.value.copy(col(4)).multiplyScalar(day ? 1 - grey : 0.15);
    const { sun, hemi } = e.lights;
    sun.color.copy(col(4)); sun.intensity = num(5) * s.sun * W[0];
    hemi.color.copy(col(6)); hemi.groundColor.copy(col(7)); hemi.intensity = num(8) * W[1];
    e.scene.environmentIntensity = num(9) * (s.weather === 'clear' ? 1 : 0.8);
    e.scene.fog.color.copy(u.mid.value); e.scene.fog.near = 40 * W[2] / s.fog; e.scene.fog.far = 380 * W[2] / s.fog;
    e.renderer.toneMappingExposure = s.exposure;
  }
  practicals(dt, t) {
    const s = this.s, M = this.R.M, night = THREE.MathUtils.clamp((Math.abs(s.hour - 13) - 5) / 2, 0, 1), out = this.outdoorOn;
    M.glow.lamp.emissiveIntensity = 1.3 * s.interior; M.glow.xmas.emissiveIntensity = 2.4 * s.interior;
    M.glow.bulb.emissiveIntensity = out ? 2.8 : 0.05; M.glow.street.emissiveIntensity = out ? 2.4 : 0; M.glow.window.emissiveIntensity = night * 1.1;
    const ac = this.accentColor(t), aOn = s.accent !== 'off';
    for (const m of [M.glow.accent, M.glow.led]) { m.emissive.copy(ac); m.emissiveIntensity = aOn ? 2.0 : 0.04; }
    M.glow.beam.color.copy(ac); M.glow.beam.opacity = s.party ? 0.14 : 0;
    this.lights(dt, t, ac, aOn, out);
  }

  sources(aOn, out) {
    const s = this.s, list = [];
    for (const l of this.R.lightSources) {
      if (l.kind === 'room') { if (this.roomOn(l.room) && s.interior > 0) list.push({ ...l, i: l.i * s.interior, c: '#ffd9a8' }); }
      else if (out) list.push({ ...l, c: l.kind === 'street' ? '#ffe2b0' : '#ffcf8f' });
    }
    for (const l of this.R.set.lights()) {
      const k = l.kind;
      if (k === 'lamp' || k === 'pendant' || k === 'chandelier' || k === 'candle') { if (s.interior > 0) list.push({ ...l, i: (k === 'chandelier' ? 9 : k === 'candle' ? 1.2 : 4) * s.interior, d: k === 'chandelier' ? 7 : 4.5, c: '#ffc98a' }); }
      else if (k === 'xmas') list.push({ ...l, i: 3 * s.interior, d: 4, c: '#ffd27a' });
      else if (k === 'string') { if (out) list.push({ ...l, i: 5, d: 8, c: '#ffc46b' }); }
      else if (k === 'fire') list.push({ ...l, i: 4, d: 6, c: '#ff8a3a', fire: true });
      else if (k === 'accent' || k === 'party') { if (aOn && (k === 'accent' || s.party || s.accent !== 'warm')) list.push({ ...l, i: k === 'party' ? 7 : 3, d: k === 'party' ? 9 : 4, accent: true }); }
    }
    return list;
  }
  lights(dt, t, ac, aOn, out) {
    const e = this.e, cam = e.studio?.busy || e.studio?.active ? e.studio.outputCam() || e.camera : e.camera;
    if ((this.poolT -= dt) <= 0) {
      this.poolT = 0.3; const p = cam.position;
      const src = this.sources(aOn, out).map((l) => ({ l, sc: l.i / (1 + ((l.x - p.x) ** 2 + (l.y - p.y) ** 2 + (l.z - p.z) ** 2) / 50) }));
      src.sort((a, b) => b.sc - a.sc); this.assigned = src.slice(0, this.pool.length).map((x) => x.l);
      this.active = src.length;
    }
    this.flick += dt;
    this.pool.forEach((L, i) => {
      const l = this.assigned[i]; if (!l) { L.intensity = 0; return; }
      L.position.set(l.x, l.y, l.z); L.distance = l.d; L.intensity = l.fire ? l.i * (0.8 + 0.25 * Math.sin(this.flick * 13 + i)) : l.i;
      if (l.accent) L.color.copy(ac); else L.color.set(l.c);
    });
  }
}