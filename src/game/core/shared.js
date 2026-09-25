import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { noise2 } from './noise';

export const U = {
  time: { value: 0 },
  wind: { value: 0.3 },
  player: { value: new THREE.Vector3() },
  night: { value: 0 },
  light: { value: 1 },
};

let _glow;
export function glowTexture() {
  if (_glow) return _glow;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)');
  gr.addColorStop(0.3, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  _glow = new THREE.CanvasTexture(c);
  return _glow;
}

export function mergeGeo(list) {
  return mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));
}

export function jitter(geo, amt, seed = 0) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = noise2(x * 2.7 + z * 1.3 + seed, y * 2.1 - z * 0.7 + seed * 3) - 0.5;
    const k = 1 + n * amt;
    p.setXYZ(i, x * k, y * (1 + n * amt * 0.5), z * k);
  }
  g.computeVertexNormals();
  return g;
}

export const GLSL_NOISE = `
float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1.0,0.0)),u.x), mix(hash12(i+vec2(0.0,1.0)),hash12(i+vec2(1.0,1.0)),u.x), u.y); }
float fbm2(vec2 p){ float s=0.0,a=0.5; for(int i=0;i<5;i++){ s+=a*vnoise(p); p*=2.03; a*=0.5; } return s; }
`;

// Wind sway, player push and night glow injected into standard materials
export function patchMaterial(mat, { wind = null, glow = 0, key = 'p' } = {}) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.time;
    sh.uniforms.uWind = U.wind;
    sh.uniforms.uPlayer = U.player;
    sh.uniforms.uNight = U.night;
    sh.vertexShader = 'uniform float uTime;\nuniform float uWind;\nuniform vec3 uPlayer;\n' + sh.vertexShader;
    if (wind) {
      const a = (wind.amp || 0.05).toFixed(3);
      const minY = (wind.minY || 0).toFixed(2);
      sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 ipos = vec3(0.0);
        #ifdef USE_INSTANCING
          ipos = instanceMatrix[3].xyz;
        #endif
        float hf = max(position.y - ${minY}, 0.0);
        float ph = ipos.x * 0.21 + ipos.z * 0.17;
        float gust = 0.6 + 0.4 * sin(uTime * 0.35 + ipos.x * 0.01);
        transformed.x += (sin(uTime * 1.9 + ph) + 0.4 * sin(uTime * 4.3 + ph * 2.1)) * uWind * gust * ${a} * hf;
        transformed.z += cos(uTime * 1.4 + ph * 1.3) * uWind * gust * ${a} * 0.6 * hf;
        ${wind.push ? `vec2 dp = (ipos.xz + transformed.xz) - uPlayer.xz; float dd = length(dp);
        float pw = (1.0 - smoothstep(0.0, 1.3, dd)) * hf * 1.1;
        transformed.xz += normalize(dp + 0.0001) * pw; transformed.y -= pw * 0.35;` : ''}
      `);
    }
    if (glow) {
      sh.fragmentShader = 'uniform float uNight;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
      #ifdef USE_COLOR
        totalEmissiveRadiance += vColor.rgb * uNight * ${glow.toFixed(2)};
      #endif`);
    }
  };
  mat.customProgramCacheKey = () => 'patch_' + key;
  return mat;
}