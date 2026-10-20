import * as THREE from 'three';
import { T } from '../realm/textures';
import { styleOf } from './styles';

// Material inventory (matches the server capability registry). A material = procedural texture + PBR values.
// [texture, colour over texture, flat colour, roughness, metalness, metres per texture repeat, extras]
export const MAT_DEF = {
  polished_stone: ['marble', '#ffffff', '#e9e4dc', 0.08, 0, 3, { clearcoat: 0.8, env: 1.5 }],
  marble: ['marble', '#ffffff', '#f2efe9', 0.18, 0, 3, { clearcoat: 0.35 }],
  rough_stone: ['stone', '#ffffff', '#9c9486', 0.95, 0, 2],
  sandstone: ['stone', '#e8c79a', '#cfae7f', 0.9, 0, 2.5],
  brick: ['brick', '#ffffff', '#9c4a36', 0.92, 0, 1.6],
  concrete: ['concrete', '#ffffff', '#b9b7b2', 0.92, 0, 3],
  polished_concrete: ['concrete', '#e2e0dc', '#c9c7c2', 0.32, 0, 4, { clearcoat: 0.3 }],
  asphalt: ['asphalt', '#ffffff', '#3b3d42', 0.88, 0, 4],
  pavers: ['pavers', '#ffffff', '#b9ab94', 0.9, 0, 3],
  cobblestone: ['stone', '#c8c0b4', '#8f877c', 0.9, 0, 1.2],
  oak_wood: ['oak', '#ffffff', '#c49a6c', 0.42, 0, 2.4],
  walnut_wood: ['walnut', '#ffffff', '#6e4a33', 0.38, 0, 2.4],
  painted_wood: ['wood', '#ffffff', '#e9e2d6', 0.55, 0, 2],
  weathered_wood: ['fence', '#c9c1b5', '#9a8f80', 0.85, 0, 2],
  plaster: [null, null, '#efe8dc', 0.92, 0, 2],
  painted_wall: [null, null, '#e9e2d6', 0.8, 0, 2],
  siding: ['siding', '#ffffff', '#e6dcc6', 0.8, 0, 2.5],
  roof_shingle: ['shingles', '#ffffff', '#3a3d44', 0.95, 0, 3],
  tile: ['tile', '#ffffff', '#ece7de', 0.25, 0, 1.8],
  mosaic: ['mosaic', '#ffffff', '#cfdde0', 0.25, 0, 1],
  carpet: ['carpet', '#8a7a6a', '#8a7a6a', 1, 0, 2],
  grass: ['grass', '#ffffff', '#5f8f3e', 0.95, 0, 4],
  dirt: ['mulch', '#d4b08a', '#8a6a4a', 1, 0, 3],
  sand: ['concrete', '#ecd9a8', '#e0c88f', 1, 0, 4],
  gravel: ['stone', '#d6d0c6', '#a9a297', 1, 0, 1.5],
  moss: ['grass', '#9cb87a', '#6f8f4f', 1, 0, 3],
  water: [null, null, '#3f7f9f', 0.05, 0.1, 4, { transparent: true, opacity: 0.8, env: 1.6 }],
  glass: [null, null, '#cfe6f2', 0.03, 0, 2, { transparent: true, opacity: 0.22, env: 1.6 }],
  frosted_glass: [null, null, '#e8f1f5', 0.4, 0, 2, { transparent: true, opacity: 0.55 }],
  brushed_metal: [null, null, '#a7adb4', 0.35, 0.9, 2],
  chrome: [null, null, '#e8ecef', 0.06, 1, 2],
  brass: [null, null, '#c9a24f', 0.28, 1, 2],
  gold: [null, null, '#d4a63a', 0.22, 1, 2],
  iron: [null, null, '#2b2f36', 0.5, 0.7, 2],
  copper: [null, null, '#b87333', 0.3, 1, 2],
  fabric: ['fabric', null, '#8a7a9a', 0.92, 0, 1, { sheen: true }],
  leather: [null, null, '#5a3a28', 0.42, 0, 1],
  velvet: ['fabric', null, '#4a2a5a', 0.8, 0, 1, { sheen: true }],
  crystal: [null, null, '#9fe8ff', 0.05, 0, 1, { transparent: true, opacity: 0.75, emissive: 0.6 }],
  emissive: [null, null, '#ffd9a8', 0.5, 0, 1, { emissive: 1.6 }],
  neon: [null, null, '#ff3b8a', 0.4, 0, 1, { emissive: 3 }],
};

const sat = (c, k) => { if (k === 1) return c; const h = {}; c.getHSL(h); return c.setHSL(h.h, Math.min(1, h.s * k), h.l); };

// One shared material per (name, tint, finish) for a style. Returns { m, tile }.
// fin = the blueprint object; its optional rough / metal (0-1) override the material's own PBR finish.
export function genMaterials(styleKey) {
  const S = styleOf(styleKey), cache = new Map();
  return (name, color, fin) => {
    const k = `${name}|${color || ''}|${fin?.rough ?? ''}|${fin?.metal ?? ''}`;
    if (cache.has(k)) return cache.get(k);
    const [tex, mul, flat, r0, m0, tile, x = {}] = MAT_DEF[name] || MAT_DEF.concrete;
    const rough = fin?.rough ?? r0, metal = fin?.metal ?? m0;
    const useTex = S.tex && tex;
    const c = sat(new THREE.Color(color || (useTex ? mul || flat : flat)), S.sat);
    const o = { color: c, roughness: Math.min(1, Math.max(S.minRough, rough * S.rough)), metalness: S.flat ? metal * 0.4 : metal, flatShading: S.flat, envMapIntensity: (x.env || 1) * S.env };
    if (useTex) { o.map = T[tex](); if (S.bump) { o.bumpMap = o.map; o.bumpScale = S.bump; } }
    if (x.transparent) Object.assign(o, { transparent: true, opacity: x.opacity, depthWrite: false });
    if (x.emissive) Object.assign(o, { emissive: c.clone(), emissiveIntensity: x.emissive * S.emit });
    const physical = !S.flat && ((x.clearcoat || S.clear) && metal < 0.5 && rough < 0.6 || x.sheen);
    if (physical) {
      if (x.sheen) Object.assign(o, { sheen: 0.6, sheenRoughness: 0.5, sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.35) });
      else Object.assign(o, { clearcoat: Math.max(x.clearcoat || 0, S.clear), clearcoatRoughness: 0.08 });
    }
    const m = physical ? new THREE.MeshPhysicalMaterial(o) : new THREE.MeshStandardMaterial(o);
    const r = { m, tile };
    cache.set(k, r);
    return r;
  };
}