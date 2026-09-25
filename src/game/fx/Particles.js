import * as THREE from 'three';
import { U, glowTexture } from '../core/shared';
import { LAGOON } from '../world/layout';

export class Particles {
  constructor(e) {
    this.e = e;
    // fireflies
    const N = (this.ffN = 600);
    const pos = new Float32Array(N * 3), seed = new Float32Array(N);
    const src = [...e.veg.forestPoints, ...e.terrain.shorePoints.filter((p) => Math.hypot(p.x - LAGOON.x, p.z - LAGOON.z) < 70)];
    for (let i = 0; i < N; i++) {
      const p = src[Math.floor(Math.random() * src.length)] || { x: 0, z: 0 };
      const x = p.x + (Math.random() - 0.5) * 20, z = p.z + (Math.random() - 0.5) * 20;
      pos.set([x, e.groundAt(x, z) + 0.5 + Math.random() * 2.5, z], i * 3);
      seed[i] = Math.random();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
    this.ffMat = new THREE.ShaderMaterial({
      uniforms: { uTime: U.time, uNight: { value: 0 }, uMap: { value: glowTexture() }, uPR: { value: 1 } },
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `uniform float uTime; uniform float uNight; uniform float uPR; attribute float seed; varying float vA; varying float vS;
        void main(){ vec3 p = position; p.x += sin(uTime*0.5 + seed*10.0)*1.5; p.y += sin(uTime*0.8 + seed*7.0)*0.6; p.z += cos(uTime*0.45 + seed*13.0)*1.5;
          vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv;
          float blink = 0.5+0.5*sin(uTime*2.0+seed*40.0); vA = uNight*smoothstep(0.2,1.0,blink); vS = seed;
          gl_PointSize = 14.0 * uPR * (0.6+blink*0.4) * (30.0 / -mv.z); }`,
      fragmentShader: `uniform sampler2D uMap; varying float vA; varying float vS;
        void main(){ vec4 t = texture2D(uMap, gl_PointCoord); vec3 c = mix(vec3(0.75,1.0,0.35), vec3(0.3,1.0,0.8), step(0.6, vS)); gl_FragColor = vec4(c, t.a*vA); }`,
    });
    this.ff = new THREE.Points(g, this.ffMat);
    this.ff.frustumCulled = false;
    e.scene.add(this.ff);

    // rain (wraps around the camera on the GPU)
    const R = (this.rainN = 5000);
    const off = new Float32Array(R * 6), end = new Float32Array(R * 2);
    for (let i = 0; i < R; i++) { const a = [Math.random(), Math.random(), Math.random()]; off.set([...a, ...a], i * 6); end[i * 2 + 1] = 1; }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(R * 6), 3));
    rg.setAttribute('aOff', new THREE.BufferAttribute(off, 3));
    rg.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    this.rainMat = new THREE.ShaderMaterial({
      uniforms: { uCam: { value: new THREE.Vector3() }, uTime: U.time, uRain: { value: 0 }, uWind: { value: 0 }, uColor: { value: new THREE.Color('#b8d4ee') } },
      transparent: true, depthWrite: false,
      vertexShader: `uniform vec3 uCam; uniform float uTime; uniform float uRain; uniform float uWind; attribute vec3 aOff; attribute float aEnd; varying float vA;
        void main(){ vec3 box = vec3(70.0, 40.0, 70.0); vec3 p;
          p.x = uCam.x + mod(aOff.x*box.x - uCam.x + uTime*uWind*6.0, box.x) - box.x*0.5;
          p.z = uCam.z + mod(aOff.z*box.z - uCam.z, box.z) - box.z*0.5;
          p.y = uCam.y + mod(aOff.y*box.y - uTime*24.0, box.y) - box.y*0.5;
          p.y += aEnd*0.8; p.x -= aEnd*uWind*0.3;
          vA = step(fract(aOff.x*37.0 + aOff.z*11.0), uRain);
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.0); }`,
      fragmentShader: `uniform vec3 uColor; varying float vA; void main(){ if (vA < 0.5) discard; gl_FragColor = vec4(uColor, 0.35); }`,
    });
    this.rain = new THREE.LineSegments(rg, this.rainMat);
    this.rain.frustumCulled = false;
    e.scene.add(this.rain);
  }

  update(env, cam, Q) {
    this.ffMat.uniforms.uNight.value = env.night * (1 - env.p.rain * 0.8);
    this.ffMat.uniforms.uPR.value = this.e.renderer.getPixelRatio();
    this.ff.geometry.setDrawRange(0, Math.floor(this.ffN * Q.particles));
    const u = this.rainMat.uniforms;
    u.uCam.value.copy(cam);
    u.uRain.value = env.p.rain;
    u.uWind.value = env.p.wind;
    u.uColor.value.set(env.p.magic > 0.5 ? '#c4a5ff' : '#b8d4ee');
    this.rain.visible = env.p.rain > 0.02;
    this.rain.geometry.setDrawRange(0, Math.floor(this.rainN * Q.particles) * 2);
  }
}

export class FX {
  constructor(scene) {
    const N = (this.N = 500);
    this.pos = new Float32Array(N * 3); this.col = new Float32Array(N * 3); this.al = new Float32Array(N);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N).fill(1);
    this.i = 0;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.al, 1));
    this.g = g;
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'attribute vec3 color; attribute float alpha; varying vec3 vC; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*mv; gl_PointSize = 220.0 / -mv.z; vC = color; vA = alpha; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vC, vA*smoothstep(0.5,0.0,d)); }',
    }));
    pts.frustumCulled = false;
    scene.add(pts);
    this.c = new THREE.Color();
  }

  emit(p, { count = 10, color = '#ffffff', up = 1, spread = 0.5, life = 1 } = {}) {
    this.c.set(color);
    for (let k = 0; k < count; k++) {
      const i = this.i++ % this.N;
      this.pos.set([p.x + (Math.random() - 0.5) * spread, p.y + Math.random() * spread * 0.5, p.z + (Math.random() - 0.5) * spread], i * 3);
      this.vel.set([(Math.random() - 0.5) * spread * 2, up * (0.5 + Math.random()), (Math.random() - 0.5) * spread * 2], i * 3);
      this.life[i] = this.max[i] = life * (0.6 + Math.random() * 0.6);
      this.col.set([this.c.r, this.c.g, this.c.b], i * 3);
    }
  }

  update(dt) {
    for (let i = 0; i < this.N; i++) {
      if (this.life[i] <= 0) { this.al[i] = 0; continue; }
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 1.5 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt; this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt; this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.al[i] = Math.max(0, this.life[i] / this.max[i]);
    }
    this.g.attributes.position.needsUpdate = true;
    this.g.attributes.alpha.needsUpdate = true;
    this.g.attributes.color.needsUpdate = true;
  }
}