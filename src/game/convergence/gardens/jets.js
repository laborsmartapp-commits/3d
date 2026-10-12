import * as THREE from 'three';

const G = 9.8;
// One instanced "stream" tube: every vertex is placed on its jet's parabola in the vertex
// shader, so the whole water show is a single draw call of real moving water geometry.
// Per instance: origin, launch velocity, (flight time, head, tail, width), (seed, alpha).
export class Jets {
  constructor(scene, max = 520) {
    this.list = []; this.max = max;
    const base = new THREE.CylinderGeometry(1, 1, 1, 7, 28, true);
    const g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.attributes.position = base.attributes.position; g.attributes.normal = base.attributes.normal;
    this.aO = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3); this.aV = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aF = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4); this.aS = new THREE.InstancedBufferAttribute(new Float32Array(max * 2), 2);
    for (const [k, a] of [['iO', this.aO], ['iV', this.aV], ['iF', this.aF], ['iS', this.aS]]) { a.setUsage(THREE.DynamicDrawUsage); g.setAttribute(k, a); }
    g.instanceCount = 0; this.geo = g;
    const m = new THREE.MeshStandardMaterial({ color: '#eaf8ff', emissive: '#bfe6ff', emissiveIntensity: 0.18, roughness: 0.08, metalness: 0, transparent: true, depthWrite: false, envMapIntensity: 1.6 });
    this.uT = { value: 0 };
    m.onBeforeCompile = (sh) => {
      sh.uniforms.uT = this.uT;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', `#include <common>
attribute vec3 iO; attribute vec3 iV; attribute vec4 iF; attribute vec2 iS; varying float vS; varying vec2 vSeed; uniform float uT;`)
        .replace('#include <beginnormal_vertex>', `
float s0 = position.y + 0.5; float ss = mix(iF.z, iF.y, s0); float tt = ss * iF.x;
vec3 gP = iO + iV * tt + vec3(0.0, -0.5 * ${G.toFixed(1)} * tt * tt, 0.0);
vec3 tg = normalize(iV + vec3(0.0, -${G.toFixed(1)} * tt, 0.0) + vec3(1e-4));
vec3 sd = normalize(cross(tg, abs(tg.y) > 0.97 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
vec3 up2 = cross(sd, tg);
float wob = 1.0 + 0.18 * sin(ss * 40.0 - uT * 9.0 + iS.x * 6.0);
float w = iF.w * mix(0.7, 2.4, ss * ss) * wob * step(0.001, iF.y - iF.z);
vec3 objectNormal = sd * position.x + up2 * position.z;
vS = ss; vSeed = iS;`)
        .replace('#include <begin_vertex>', 'vec3 transformed = gP + (sd * position.x + up2 * position.z) * w;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vS; varying vec2 vSeed; uniform float uT;')
        .replace('#include <alphamap_fragment>', `#include <alphamap_fragment>
float streak = 0.55 + 0.45 * sin(vS * 70.0 - uT * 24.0 + vSeed.x * 17.0) * sin(vS * 23.0 - uT * 11.0);
diffuseColor.a *= vSeed.y * clamp(streak, 0.25, 1.0) * (1.0 - smoothstep(0.8, 1.0, vS) * 0.6);`);
    };
    this.mesh = new THREE.Mesh(g, m); this.mesh.frustumCulled = false; this.mesh.renderOrder = 2;
    scene.add(this.mesh);
  }

  // A nozzle: dir = unit launch direction, h = peak height at full flow, w = stream radius.
  add(group, x, y, z, dir, h, w, extra = {}) {
    const j = { group, x, y, z, dir: new THREE.Vector3(...dir).normalize(), h, w, head: 0, tail: 0, lvl: 0, on: false, seed: Math.random(), ...extra };
    this.list.push(j); return j;
  }

  // levels: group → 0..1. Water already in the air keeps falling when a jet stops.
  update(dt, t, levels, focus) {
    this.uT.value = t;
    let n = 0; const O = this.aO.array, V = this.aV.array, F = this.aF.array, Sd = this.aS.array;
    this.flow = 0; this.impacts = [];
    for (const j of this.list) {
      let target = levels[j.group] || 0;
      if (j.chase) target *= 0.5 + 0.5 * Math.sin(t * 2.4 - j.chase * 0.9);
      j.lvl += (target - j.lvl) * Math.min(1, dt * 1.6);
      const h = Math.max(0.05, j.h * j.lvl), dy = Math.max(0.2, j.dir.y), v = Math.sqrt(2 * G * h) / dy;
      const T = (2 * v * dy) / G + (j.drop || 0);
      const running = j.lvl > 0.04;
      if (running) { j.head = Math.min(1, j.head + dt / Math.max(0.3, T)); j.tail = Math.max(0, j.tail - dt); }
      else if (j.head > 0) { j.tail = Math.min(j.head, j.tail + dt / Math.max(0.3, T)); if (j.tail >= j.head) j.head = j.tail = 0; }
      if (j.head <= 0 || n >= this.max - 1) continue;
      this.flow += j.lvl * j.h;
      const vx = j.dir.x * v, vy = j.dir.y * v, vz = j.dir.z * v;
      if (running && j.head >= 1) this.impacts.push({ x: j.x + vx * T, y: j.y, z: j.z + vz * T, k: j.lvl * Math.min(1, j.h / 10) });
      // A bright core and a wider, fainter sheath of breaking water around it.
      for (const [wk, al] of [[1, 0.8], [2.3, 0.22]]) {
        O.set([j.x, j.y, j.z], n * 3); V.set([vx, vy, vz], n * 3); F.set([T, j.head, j.tail, j.w * wk * (0.5 + 0.5 * j.lvl)], n * 4); Sd.set([j.seed + wk, al], n * 2); n++;
      }
    }
    this.geo.instanceCount = n;
    for (const a of [this.aO, this.aV, this.aF, this.aS]) a.needsUpdate = true;
  }
}