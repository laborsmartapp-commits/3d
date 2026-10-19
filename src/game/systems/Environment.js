import * as THREE from 'three';
import { smoothstep, lerp } from '../core/noise';
import { U } from '../core/shared';
import { updateNightMaterials } from '../build/builders';

export const WEATHERS = {
  clear: { label: 'Clear', cloud: 0.05, rain: 0, fog: 0, wind: 0.25, storm: 0, magic: 0 },
  cloudy: { label: 'Cloudy', cloud: 0.55, rain: 0, fog: 0.15, wind: 0.4, storm: 0, magic: 0 },
  lightRain: { label: 'Light Rain', cloud: 0.7, rain: 0.35, fog: 0.25, wind: 0.45, storm: 0, magic: 0 },
  heavyRain: { label: 'Heavy Rain', cloud: 0.9, rain: 0.85, fog: 0.45, wind: 0.7, storm: 0, magic: 0 },
  thunderstorm: { label: 'Thunderstorm', cloud: 1, rain: 1, fog: 0.4, wind: 1, storm: 1, magic: 0 },
  mist: { label: 'Mist', cloud: 0.35, rain: 0, fog: 0.9, wind: 0.1, storm: 0, magic: 0 },
  windy: { label: 'Windy', cloud: 0.25, rain: 0, fog: 0, wind: 1, storm: 0, magic: 0 },
  celestialStorm: { label: 'Celestial Storm', cloud: 0.6, rain: 0, fog: 0.2, wind: 0.7, storm: 0.6, magic: 1 },
  magicRain: { label: 'Starfall Rain', cloud: 0.45, rain: 0.45, fog: 0.15, wind: 0.3, storm: 0, magic: 1 },
};
// Island label for the shared manual conditions (HUD and villager small talk).
const LABEL_OF = [['thunderstorm', 'thunderstorm'], ['heavyRain', 'heavyRain'], ['lightRain', 'lightRain'], ['heavySnow', 'cloudy'], ['lightSnow', 'cloudy'], ['fog', 'mist'], ['mist', 'mist'], ['windy', 'windy'], ['overcast', 'cloudy'], ['partlyCloudy', 'cloudy']];

export function stageOf(h) {
  if (h >= 5 && h < 7) return 'Dawn';
  if (h >= 7 && h < 11) return 'Morning';
  if (h >= 11 && h < 14) return 'Midday';
  if (h >= 14 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 19) return 'Sunset';
  if (h >= 19 && h < 20.5) return 'Twilight';
  if (h >= 20.5) return 'Night';
  return 'Late Night';
}

const cA = new THREE.Color(), cB = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);

export class Environment {
  constructor(e) {
    this.e = e;
    // Driven only by the shared manual weather state (see manual()); nothing here advances by itself.
    this.hour = 15.5;
    this.weather = 'clear';
    this.p = { ...WEATHERS.clear };
    this.sun1 = 1; this.azOff = 0; this.lightning = 0;
    this.sunDir = new THREE.Vector3();
    this.moonDir = new THREE.Vector3();
    this.day = 1; this.night = 0; this.sunset = 0; this.flash = 0;
    this.ov = { fog: 1, exposure: 1, ambient: 1, wind: null, rain: null, cloud: null, storm: null };
    this.lightningT = 6;
    const scene = e.scene;
    this.sun = new THREE.DirectionalLight('#ffffff', 2);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    const sc = this.sun.shadow.camera;
    sc.left = -70; sc.right = 70; sc.top = 70; sc.bottom = -70; sc.near = 1; sc.far = 400;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight('#9ec9e6', '#3a4a2a', 0.6);
    scene.add(this.hemi);
    scene.fog = new THREE.FogExp2('#8fb1c0', 0.0035);
    this.bolt = new THREE.Line(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 10 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#e9e3ff', transparent: true, opacity: 0, fog: false }));
    this.bolt.frustumCulled = false;
    scene.add(this.bolt);
  }

  manual(s) {
    this.hour = s.hour;
    this.weather = LABEL_OF.find(([c]) => s.conditions.includes(c))?.[1] || 'clear';
    Object.assign(this.p, { cloud: s.cloud, rain: s.rain, fog: Math.max(s.fog, s.haze * 0.5), wind: s.wind, storm: s.lightning, magic: 0 });
    Object.assign(this.ov, { exposure: s.exposure, ambient: s.ambient });
    this.sun1 = s.sun; this.azOff = THREE.MathUtils.degToRad(s.sunAz - 35); this.lightning = s.lightning; this.veg = s.vegetation * 2;
  }

  strike() {
    const pp = this.e.player.pos, a = Math.random() * Math.PI * 2, d = 250 + Math.random() * 350;
    const x = pp.x + Math.cos(a) * d, z = pp.z + Math.sin(a) * d;
    const pos = this.bolt.geometry.attributes.position;
    for (let i = 0; i < 10; i++) pos.setXYZ(i, x + (i ? (Math.random() - 0.5) * 30 : 0), 260 - i * 30, z + (i ? (Math.random() - 0.5) * 30 : 0));
    pos.needsUpdate = true;
    this.bolt.material.color.set(this.p.magic > 0.5 || Math.random() < 0.15 ? '#c084fc' : '#e9e3ff');
    this.bolt.material.opacity = 1;
    this.flash = 0.5;
    this.e.audio.thunder(d / 340);
  }

  update(dt) {
    const a = ((this.hour - 6) / 24) * Math.PI * 2;
    this.sunDir.set(Math.cos(a) * 0.85, Math.sin(a), -0.4).normalize().applyAxisAngle(UP, this.azOff);
    this.moonDir.set(-Math.cos(a) * 0.7 + 0.2, -Math.sin(a) * 0.9 + 0.25, 0.45).normalize().applyAxisAngle(UP, this.azOff);
    this.day = smoothstep(-0.12, 0.25, this.sunDir.y);
    this.night = 1 - smoothstep(-0.2, 0.08, this.sunDir.y);
    this.sunset = Math.exp(-Math.abs(this.sunDir.y) * 5) * (1 - this.p.cloud * 0.7);
    const cl = this.p.cloud;
    const sunUp = this.sunDir.y > -0.05;
    const dir = sunUp ? this.sunDir : this.moonDir;
    const target = this.e.player.pos;
    this.sun.position.copy(target).addScaledVector(dir, 150);
    this.sun.target.position.copy(target);
    if (sunUp) {
      this.sun.color.setRGB(1, 0.55 + 0.45 * smoothstep(0, 0.4, this.sunDir.y), 0.35 + 0.6 * smoothstep(0, 0.45, this.sunDir.y));
      this.sun.intensity = 2.4 * smoothstep(-0.05, 0.2, this.sunDir.y) * (1 - cl * 0.65) * this.sun1;
    } else {
      this.sun.color.set('#9fb4ff');
      this.sun.intensity = 0.55 * (1 - cl * 0.6) * smoothstep(-0.05, 0.3, this.moonDir.y) * this.sun1;
    }
    this.hemi.color.set('#1b2455').lerp(cA.set('#a7cde6'), this.day);
    this.hemi.groundColor.set('#0b0a16').lerp(cA.set('#3a4a2a'), this.day);
    this.hemi.intensity = (0.45 + 0.6 * this.day) * (1 - cl * 0.3) * this.ov.ambient + this.flash * 2.5;
    const fogC = this.e.scene.fog.color;
    fogC.set('#0b0d20').lerp(cA.set('#8fb1c0'), this.day);
    fogC.lerp(cA.set('#e08a5c'), this.sunset * 0.35);
    fogC.lerp(cB.set('#505866').multiplyScalar(0.3 + this.day * 0.7), cl * 0.5);
    this.e.scene.fog.density = 0.0032 * (1 + this.p.fog * 3 + this.p.rain * 1.2) * this.ov.fog * this.e.Q.fog;
    this.e.renderer.toneMappingExposure = this.ov.exposure * (1 - this.p.storm * 0.2);
    if (this.lightning > 0.01) { // strikes flash at random moments while enabled; the weather itself never changes
      this.lightningT -= dt * (0.4 + this.lightning);
      if (this.lightningT < 0) { this.strike(); this.lightningT = 6 + Math.random() * 12; }
    }
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.bolt.material.opacity = Math.max(0, this.bolt.material.opacity - dt * 5);
    U.night.value = this.night;
    U.wind.value = (0.15 + this.p.wind * 0.9) * (this.veg ?? 1);
    U.light.value = 0.25 + 0.75 * this.day * (1 - cl * 0.4);
    updateNightMaterials(this.night);
    const w = this.e.water?.uniforms;
    if (w) {
      w.uKeyDir.value.copy(dir);
      w.uKeyCol.value.copy(this.sun.color).multiplyScalar(sunUp ? 1 - cl * 0.7 : 0.6);
      w.uSky.value.set('#0c1330').lerp(cA.set('#79a9bf'), this.day).lerp(cB.set('#58606e'), cl * 0.5);
      w.uFogColor.value.copy(fogC);
      w.uFogDensity.value = this.e.scene.fog.density;
      w.uRain.value = this.p.rain;
      w.uRough.value = this.p.wind * 0.5 + this.p.storm * 0.5;
    }
  }

  clock() {
    const h = Math.floor(this.hour), m = Math.floor((this.hour - h) * 60);
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }
}