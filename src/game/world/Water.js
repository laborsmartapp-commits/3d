import * as THREE from 'three';
import { R, WATER } from './layout';
import { HALF, SIZE } from './Terrain';
import { GLSL_NOISE, U } from '../core/shared';

export function createWater(terrain) {
  const uniforms = {
    uTime: U.time, uDepth: { value: terrain.depthTex }, uKeyDir: { value: new THREE.Vector3(0, 1, 0) },
    uKeyCol: { value: new THREE.Color(1, 1, 1) }, uSky: { value: new THREE.Color('#6fa3b8') },
    uDeep: { value: new THREE.Color('#05263f') }, uShallow: { value: new THREE.Color('#1aa89a') },
    uFogColor: { value: new THREE.Color() }, uFogDensity: { value: 0.003 }, uRain: { value: 0 }, uLight: U.light, uRough: { value: 0 },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms, transparent: true,
    vertexShader: `uniform float uTime; varying vec3 vW; varying vec2 vUv;
      void main(){ vec4 w = modelMatrix*vec4(position,1.0);
        w.y += sin(w.x*0.2+uTime*1.2)*0.04 + cos(w.z*0.25+uTime)*0.04;
        vW=w.xyz; vUv=(w.xz+${HALF.toFixed(1)})/${SIZE.toFixed(1)}; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime; uniform sampler2D uDepth; uniform vec3 uKeyDir; uniform vec3 uKeyCol; uniform vec3 uSky;
      uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uFogColor; uniform float uFogDensity; uniform float uRain; uniform float uLight; uniform float uRough;
      varying vec3 vW; varying vec2 vUv;
      void main(){
        float depth = texture2D(uDepth, vUv).r * 8.0;
        vec2 p = vW.xz; float t = uTime; float rough = 1.0 + uRough*2.0;
        vec2 g = vec2(cos(p.x*0.35 + t*1.1), cos(p.y*0.31 - t*0.9))*0.12*rough;
        g += vec2(cos(p.x*0.9 + p.y*0.4 + t*2.1), cos(p.y*1.1 - p.x*0.3 + t*1.7))*0.06*rough;
        g += vec2(cos(p.x*2.4 - t*3.0 + p.y), cos(p.y*2.7 + t*2.6))*0.03*(1.0+uRain*3.0);
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
        vec3 v = normalize(cameraPosition - vW);
        float fres = pow(1.0 - max(dot(n,v),0.0), 3.0);
        vec3 col = mix(uShallow, uDeep, smoothstep(0.0, 5.0, depth)) * uLight;
        col = mix(col, uSky, fres*0.55);
        vec3 r = reflect(-v, n);
        col += uKeyCol * pow(max(dot(r, uKeyDir),0.0), 90.0) * 1.8;
        float foam = smoothstep(0.7, 0.0, depth) * (0.55 + 0.45*sin(t*2.0 + p.x*0.8 + p.y*0.6));
        col = mix(col, vec3(0.75,0.92,0.92)*max(uLight,0.35), foam*0.55);
        vec2 cell = fract(p*0.5)-0.5;
        col += uRain * smoothstep(0.9,1.0, sin(length(cell)*40.0 - t*9.0)) * 0.1;
        float alpha = mix(0.55, 0.93, smoothstep(0.0,3.0,depth));
        float dist = length(cameraPosition - vW);
        col = mix(col, uFogColor, 1.0 - exp(-uFogDensity*uFogDensity*dist*dist));
        gl_FragColor = vec4(col, alpha);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(R * 0.925, 160).rotateX(-Math.PI / 2), mat);
  mesh.position.y = WATER;
  mesh.renderOrder = 1;
  return { mesh, uniforms };
}

const FALL_FRAG = `uniform float uTime; uniform float uLight; uniform float uLen; uniform float uFade; varying vec2 vUv;
${GLSL_NOISE}
void main(){
  float y = vUv.y;
  float s = fbm2(vec2(vUv.x*5.0, y*0.35 - uTime*2.2));
  float streak = vnoise(vec2(vUv.x*22.0, y*0.12 - uTime*3.0));
  vec3 c = mix(vec3(0.2,0.62,0.7), vec3(0.92,0.98,1.0), smoothstep(0.35,0.75,s*0.7+streak*0.5));
  float a = (0.5 + 0.45*s) * smoothstep(0.0,0.18,vUv.x)*smoothstep(1.0,0.82,vUv.x);
  a *= mix(1.0, smoothstep(uLen, uLen*0.5, y), uFade);
  gl_FragColor = vec4(c*max(uLight,0.3), a);
}`;

export function createWaterfall(points, width, side, fadeBottom) {
  const n = points.length;
  const pos = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx = [];
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    if (i > 0) acc += p.distanceTo(points[i - 1]);
    const w = width * (1 + (i / n) * 0.3);
    pos.set([p.x - (side.x * w) / 2, p.y, p.z - (side.z * w) / 2, p.x + (side.x * w) / 2, p.y, p.z + (side.z * w) / 2], i * 6);
    uv.set([0, acc, 1, acc], i * 4);
    if (i < n - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uLight: U.light, uLen: { value: acc }, uFade: { value: fadeBottom ? 1 : 0 } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: FALL_FRAG,
  });
  return new THREE.Mesh(g, mat);
}

export function createMist(center, spread, count, height = 6) {
  const pos = new Float32Array(count * 3), seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos.set([center.x + (Math.random() - 0.5) * spread, center.y, center.z + (Math.random() - 0.5) * spread], i * 3);
    seed[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: U.time, uLight: U.light, uH: { value: height } },
    transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime; uniform float uH; attribute float seed; varying float vA;
      void main(){ float t = fract(uTime*0.12 + seed); vec3 p = position; p.y += t*uH; p.x += sin(seed*40.0+uTime*0.5)*1.5*t;
        vec4 mv = modelViewMatrix*vec4(p,1.0); gl_Position = projectionMatrix*mv; vA = sin(t*3.1416)*0.35; gl_PointSize = (900.0*(0.5+t)) / -mv.z; }`,
    fragmentShader: `uniform float uLight; varying float vA; void main(){ float d = length(gl_PointCoord-0.5); gl_FragColor = vec4(vec3(0.85,0.95,1.0)*max(uLight,0.35), vA*smoothstep(0.5,0.0,d)); }`,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  return pts;
}