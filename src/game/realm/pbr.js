import * as THREE from 'three';

// Real PBR texture sets from the Asset Library (signed map urls) as physical materials.
// Slot -> material property. Height drives a bump map (true displacement needs dense geometry).
export const PBR_SLOTS = { base_color: 'map', roughness: 'roughnessMap', metallic: 'metalnessMap', normal: 'normalMap', ao: 'aoMap', height: 'bumpMap' };
const loader = new THREE.TextureLoader(), cache = new Map();

const tex = (url, srgb, repeat) => {
  const t = loader.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

// set = { id, urls: {slot: url}, tile_m }. When a map is present its scalar is 1 so the map is authoritative.
// color tints the albedo only when the set has no base colour map.
export function pbrMaterial(set, { color, repeat = 1, extra } = {}) {
  const k = `${set.id}|${color || ''}|${repeat}|${extra ? JSON.stringify(extra) : ''}`;
  if (cache.has(k)) return cache.get(k);
  const u = set.urls, o = { color: new THREE.Color(!u.base_color && color ? color : '#ffffff'), roughness: u.roughness ? 1 : 0.6, metalness: u.metallic ? 1 : 0 };
  for (const [slot, prop] of Object.entries(PBR_SLOTS)) if (u[slot]) o[prop] = tex(u[slot], slot === 'base_color', repeat);
  if (o.bumpMap) o.bumpScale = 1.2;
  const m = new THREE.MeshPhysicalMaterial({ ...o, ...extra });
  m.userData.pbrSet = set.id;
  cache.set(k, m);
  return m;
}