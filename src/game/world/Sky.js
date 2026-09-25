import * as THREE from 'three';
import { GLSL_NOISE, U } from '../core/shared';
import { mulberry32 } from '../core/noise';

const V = THREE.Vector3;

const SKY_FRAG = `
uniform vec3 uSun; uniform vec3 uMoon; uniform float uDay; uniform float uTime; uniform float uCloud; uniform float uFlash; uniform float uNight;
varying vec3 vDir;
float h3(vec3 p){ p = fract(p*vec3(0.1031,0.1030,0.0973)); p += dot(p, p.yxz+33.33); return fract((p.x+p.y)*p.z); }
${GLSL_NOISE}
void main(){
  vec3 d = normalize(vDir);
  float y = d.y;
  float hz = pow(1.0 - clamp(y,0.0,1.0), 3.0);
  vec3 day = mix(vec3(0.13,0.36,0.62), vec3(0.58,0.76,0.84), hz);
  vec3 night = mix(vec3(0.006,0.01,0.035), vec3(0.07,0.05,0.15), hz);
  vec3 col = mix(night, day, uDay);
  float sunset = exp(-abs(uSun.y)*5.0);
  vec3 sflat = normalize(vec3(uSun.x, 0.0001, uSun.z));
  float toward = max(dot(normalize(vec3(d.x,0.0001,d.z)), sflat), 0.0);
  col += vec3(1.0,0.42,0.2) * sunset * hz * (0.25 + 0.75*pow(toward,4.0)) * 0.95;
  col += vec3(0.45,0.15,0.55) * sunset * hz * 0.3;
  vec2 np = d.xz / (abs(d.y) + 0.5);
  float neb = fbm2(np*1.1 + vec2(uTime*0.003, 0.0));
  float neb2 = fbm2(np*2.4 - 7.0);
  vec3 nebCol = mix(vec3(0.38,0.12,0.58), vec3(0.03,0.55,0.48), neb2) * smoothstep(0.48, 0.9, neb);
  float clear = 1.0 - uCloud*0.85;
  col += nebCol * uNight * clear * 0.75 * smoothstep(-0.05, 0.35, y);
  vec3 sp = d * 320.0; vec3 cell = floor(sp); float hs = h3(cell);
  float st = step(0.9965, hs) * smoothstep(0.45, 0.0, length(fract(sp) - 0.5));
  st *= 0.55 + 0.45*sin(uTime*2.5 + hs*300.0);
  col += vec3(0.9,0.93,1.0) * st * uNight * clear * smoothstep(0.0, 0.12, y) * 1.8;
  float sd = dot(d, uSun);
  col += vec3(1.0,0.92,0.75) * smoothstep(0.9993, 0.9997, sd) * 4.0 * clear;
  col += vec3(1.0,0.65,0.35) * pow(max(sd,0.0), 48.0) * 0.45 * clear;
  float md = dot(d, uMoon);
  float moon = smoothstep(0.99905, 0.9993, md);
  float crater = fbm2(d.xy*900.0);
  col = mix(col, vec3(0.8,0.84,0.95)*(0.75+0.35*crater), moon * clear * (0.35 + 0.65*uNight));
  col += vec3(0.45,0.55,0.95) * pow(max(md,0.0), 180.0) * 0.4 * uNight * clear;
  vec3 grey = mix(vec3(0.045,0.05,0.07), vec3(0.42,0.46,0.5), uDay);
  col = mix(col, grey, uCloud*0.7);
  vec3 low = mix(vec3(0.05,0.04,0.1), vec3(0.62,0.7,0.78), uDay);
  col = mix(col, low, smoothstep(0.0, -0.3, y));
  col += uFlash * vec3(0.55,0.5,0.8);
  gl_FragColor = vec4(col, 1.0);
}`;

const CLOUD_FRAG = `
uniform float uTime; uniform float uDay; uniform vec3 uTint; varying vec3 vW;
${GLSL_NOISE}
void main(){
  vec2 p = vW.xz*0.0016;
  float n = fbm2(p + vec2(uTime*0.004, uTime*0.002));
  float n2 = fbm2(p*3.0 - uTime*0.006);
  float c = smoothstep(0.35, 0.8, n*0.7+n2*0.4);
  vec3 dayC = mix(vec3(0.55,0.62,0.72), vec3(0.95,0.96,1.0), c);
  vec3 nightC = mix(vec3(0.03,0.03,0.08), vec3(0.16,0.13,0.28), c);
  vec3 col = mix(nightC, dayC, uDay) + uTint * c;
  float a = smoothstep(4400.0, 2500.0, length(vW.xz));
  gl_FragColor = vec4(col, a);
}`;

function bandTexture() {
  const c = document.createElement('canvas');
  c.width = 16; c.height = 256;
  const g = c.getContext('2d');
  for (let y = 0; y < 256; y++) {
    const t = y / 256, v = Math.sin(t * 40) * 0.5 + Math.sin(t * 13 + 1) * 0.5;
    g.fillStyle = `rgb(${(110 + v * 40) | 0},${(70 + v * 30 + t * 50) | 0},${(160 + v * 50) | 0})`;
    g.fillRect(0, y, 16, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const sphDir = (az, el) => new V(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));

export class Sky {
  constructor(scene) {
    const rng = mulberry32(99);
    this.uniforms = {
      uSun: { value: new V(0, 1, 0) }, uMoon: { value: new V(0, -1, 0) }, uDay: { value: 1 }, uTime: U.time,
      uCloud: { value: 0 }, uFlash: { value: 0 }, uNight: { value: 0 },
    };
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(3000, 48, 24),
      new THREE.ShaderMaterial({
        uniforms: this.uniforms, side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: SKY_FRAG,
      }),
    );
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.cloudUniforms = { uTime: U.time, uDay: { value: 1 }, uTint: { value: new THREE.Color(0, 0, 0) } };
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(9000, 9000).rotateX(-Math.PI / 2),
      new THREE.ShaderMaterial({
        uniforms: this.cloudUniforms, transparent: true, depthWrite: false, fog: false,
        vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
        fragmentShader: CLOUD_FRAG,
      }),
    );
    sea.position.y = -178;
    scene.add(sea);

    this.puffMat = new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.9, fog: false });
    this.clusters = [];
    for (let i = 0; i < 36; i++) {
      const near = i < 10;
      this.clusters.push({
        a: rng() * Math.PI * 2, r: near ? 240 + rng() * 90 : 400 + rng() * 1100, y: near ? -40 - rng() * 90 : -120 + rng() * 260,
        sp: (0.004 + rng() * 0.006) * (rng() < 0.5 ? 1 : -1),
        parts: Array.from({ length: 7 }, () => [(rng() - 0.5) * 60, (rng() - 0.5) * 12, (rng() - 0.5) * 30, 10 + rng() * 22]),
      });
    }
    this.puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), this.puffMat, 36 * 7);
    this.puffs.frustumCulled = false;
    scene.add(this.puffs);

    this.intro = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), this.puffMat, 46);
    this.introBase = Array.from({ length: 46 }, () => {
      const t = rng();
      const base = new V(420, 250, 800).lerp(new V(300, 180, 580), t);
      const side = new V(rng() - 0.5, (rng() - 0.5) * 0.4, rng() - 0.5).normalize();
      return { base: base.add(side.clone().multiplyScalar(10 + rng() * 40)), side, s: 25 + rng() * 30 };
    });
    this.intro.frustumCulled = false;
    scene.add(this.intro);
    this.setIntroSpread(0);

    this.islands = [];
    for (let i = 0; i < 13; i++) {
      const g = new THREE.Group();
      const top = new THREE.MeshLambertMaterial({ color: rng() < 0.3 ? '#3a3066' : '#2c5a3a', fog: false, flatShading: true });
      const rock = new THREE.MeshLambertMaterial({ color: '#2d2836', fog: false, flatShading: true });
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(1, 0.85, 0.25, 9), top));
      const cn = new THREE.Mesh(new THREE.ConeGeometry(0.85, 2.4, 9), rock);
      cn.rotation.x = Math.PI; cn.position.y = -1.3; g.add(cn);
      for (let k = 0; k < 5; k++) {
        const t = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.3, 5), top);
        t.position.set((rng() - 0.5) * 1.2, 0.25, (rng() - 0.5) * 1.2); g.add(t);
      }
      if (rng() < 0.5) {
        const wf = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 2.5), new THREE.MeshBasicMaterial({ color: '#9fe8f0', transparent: true, opacity: 0.5, fog: false }));
        wf.position.set(0.9, -1.2, 0); wf.rotation.y = Math.PI / 2; g.add(wf);
      }
      const a = rng() * Math.PI * 2, r = 650 + rng() * 900, s = 25 + rng() * 80;
      g.position.set(Math.cos(a) * r, -60 + rng() * 220, Math.sin(a) * r);
      g.scale.setScalar(s);
      g.userData = { by: g.position.y, ph: rng() * 6 };
      scene.add(g);
      this.islands.push(g);
    }
    const silMat = new THREE.MeshLambertMaterial({ color: '#1b1830', fog: false, flatShading: true });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rng() * 0.3, r = 2300 + rng() * 400, h = 400 + rng() * 600;
      const m = new THREE.Mesh(new THREE.ConeGeometry(200 + rng() * 250, h, 6), silMat);
      m.position.set(Math.cos(a) * r, -380 + h / 2, Math.sin(a) * r);
      scene.add(m);
    }

    this.celestial = new THREE.Group();
    scene.add(this.celestial);
    this.planetMat = new THREE.MeshBasicMaterial({ map: bandTexture(), fog: false, transparent: true });
    const planet = new THREE.Mesh(new THREE.SphereGeometry(220, 48, 32), this.planetMat);
    planet.position.copy(sphDir(0.6, 0.38).multiplyScalar(2600));
    planet.rotation.z = 0.35;
    this.ringMat = new THREE.MeshBasicMaterial({ color: '#c9b3ff', transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(300, 440, 96), this.ringMat);
    ring.position.copy(planet.position);
    ring.lookAt(0, 0, 0); ring.rotateX(1.2);
    this.moon2Mat = new THREE.MeshBasicMaterial({ color: '#7fe0c8', transparent: true, fog: false });
    const moon2 = new THREE.Mesh(new THREE.SphereGeometry(45, 24, 16), this.moon2Mat);
    moon2.position.copy(sphDir(2.4, 0.55).multiplyScalar(2500));
    this.celestial.add(planet, ring, moon2);

    const P = [[-3, 2.4], [-3.3, 1.6], [-3.1, 0.8], [-2.4, 1.6], [-1.2, 1.0], [-0.4, 0.6], [0.3, 0], [0.8, -0.8], [1, -1.8], [1.6, -2.6], [2.6, -3], [3.4, -2.7], [3.8, -1.9], [3.4, -1.3], [3.0, -1.6]];
    const L = [[0, 3], [1, 3], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 13], [13, 14]];
    const toV = ([x, y]) => sphDir(3.6 + x * 0.06, 0.62 + y * 0.06).multiplyScalar(2800);
    this.starMat = new THREE.PointsMaterial({ color: '#dbe7ff', size: 5, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false });
    this.celestial.add(new THREE.Points(new THREE.BufferGeometry().setFromPoints(P.map(toV)), this.starMat));
    this.lineMat = new THREE.LineBasicMaterial({ color: '#05ce91', transparent: true, opacity: 0.2, fog: false, depthWrite: false });
    this.celestial.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(L.flatMap(([a, b]) => [toV(P[a]), toV(P[b])])), this.lineMat));

    this.shootGeo = new THREE.BufferGeometry().setFromPoints([new V(), new V()]);
    this.shootMat = new THREE.LineBasicMaterial({ color: '#f3f6ff', transparent: true, opacity: 0, fog: false, blending: THREE.AdditiveBlending, depthWrite: false });
    const line = new THREE.Line(this.shootGeo, this.shootMat);
    line.frustumCulled = false;
    this.celestial.add(line);
    this.shoot = null;
    this.nextShoot = 8;
    this.rng = rng;
    this.o = new THREE.Object3D();
  }

  setIntroSpread(s) {
    const o = this.o;
    this.introBase.forEach((c, i) => {
      o.position.copy(c.base).addScaledVector(c.side, s * 260);
      o.scale.set(c.s * 1.6, c.s * 0.7, c.s);
      o.updateMatrix();
      this.intro.setMatrixAt(i, o.matrix);
    });
    this.intro.instanceMatrix.needsUpdate = true;
    this.intro.visible = s < 0.99;
  }

  shootingStar() {
    const a = this.rng() * Math.PI * 2, el = 0.5 + this.rng() * 0.6;
    this.shoot = { start: sphDir(a, el).multiplyScalar(2700), dir: new V(this.rng() - 0.5, -0.4, this.rng() - 0.5).normalize(), t: 0 };
  }

  update(dt, env, camera) {
    const u = this.uniforms;
    u.uSun.value.copy(env.sunDir); u.uMoon.value.copy(env.moonDir);
    u.uDay.value = env.day; u.uNight.value = env.night; u.uCloud.value = env.p.cloud; u.uFlash.value = env.flash;
    this.dome.position.copy(camera.position);
    this.celestial.position.copy(camera.position);
    this.celestial.rotation.y += dt * 0.002;
    this.cloudUniforms.uDay.value = env.day;
    this.cloudUniforms.uTint.value.setRGB(1, 0.45, 0.25).multiplyScalar(env.sunset * 0.35);
    this.puffMat.emissive.setRGB(0.08, 0.05, 0.14).multiplyScalar(env.night);
    this.puffMat.opacity = 0.75 + env.p.cloud * 0.2;
    const o = this.o;
    let k = 0;
    for (const c of this.clusters) {
      c.a += c.sp * dt * (0.5 + env.p.wind);
      const cx = Math.cos(c.a) * c.r, cz = Math.sin(c.a) * c.r;
      for (const [dx, dy, dz, s] of c.parts) {
        o.position.set(cx + dx, c.y + dy, cz + dz);
        o.scale.set(s * 1.5, s * 0.6, s);
        o.updateMatrix();
        this.puffs.setMatrixAt(k++, o.matrix);
      }
    }
    this.puffs.instanceMatrix.needsUpdate = true;
    const t = U.time.value;
    for (const g of this.islands) { g.position.y = g.userData.by + Math.sin(t * 0.1 + g.userData.ph) * 6; g.rotation.y += dt * 0.003; }
    const n = env.night, clr = 1 - env.p.cloud;
    this.planetMat.opacity = 0.25 + 0.75 * n * clr;
    this.ringMat.opacity = (0.1 + 0.3 * n) * clr;
    this.moon2Mat.opacity = (0.2 + 0.8 * n) * clr;
    this.starMat.opacity = n * clr;
    this.lineMat.opacity = n * clr * 0.22;
    this.nextShoot -= dt;
    if (this.nextShoot < 0 && n > 0.6) { this.shootingStar(); this.nextShoot = 10 + this.rng() * 25; }
    if (this.shoot) {
      const s = this.shoot;
      s.t += dt;
      const head = s.start.clone().addScaledVector(s.dir, s.t * 900);
      const tail = head.clone().addScaledVector(s.dir, -140);
      const p = this.shootGeo.attributes.position;
      p.setXYZ(0, head.x, head.y, head.z); p.setXYZ(1, tail.x, tail.y, tail.z); p.needsUpdate = true;
      this.shootMat.opacity = Math.sin(Math.min(1, s.t / 0.9) * Math.PI) * clr;
      if (s.t > 0.9) { this.shoot = null; this.shootMat.opacity = 0; }
    }
  }
}