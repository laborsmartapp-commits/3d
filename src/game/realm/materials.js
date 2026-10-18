import * as THREE from 'three';
import { T } from './textures';
import { ROOMS } from './layout';

let M = null;
export const getMaterials = () => M || (M = make());

// One shared material per (kind, colour): furniture instances reuse geometry and materials.
function make() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  const phys = (o) => new THREE.MeshPhysicalMaterial(o);
  const glow = {
    lamp: std({ color: '#fff3df', emissive: '#ffc982', emissiveIntensity: 1.2, roughness: 0.9, side: THREE.DoubleSide }),
    accent: std({ color: '#141418', emissive: '#ffb070', emissiveIntensity: 2.2, roughness: 0.4 }),
    bulb: std({ color: '#fff2cc', emissive: '#ffc46b', emissiveIntensity: 2.6 }),
    xmas: std({ color: '#fff7e0', emissive: '#ffd27a', emissiveIntensity: 2.4 }),
    flame: std({ color: '#ff9a3c', emissive: '#ff6a10', emissiveIntensity: 3, transparent: true, opacity: 0.85, depthWrite: false }),
    led: std({ color: '#0d0d10', emissive: '#ffb070', emissiveMap: T.led(), emissiveIntensity: 1.8, roughness: 0.3 }),
    beam: new THREE.MeshBasicMaterial({ color: '#ffb070', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }),
    window: std({ color: '#262a30', emissive: '#ffcf8f', emissiveIntensity: 0, roughness: 0.15, metalness: 0.2 }),
    street: std({ color: '#fff4dc', emissive: '#ffd59a', emissiveIntensity: 0 }),
  };
  const map = (t, r = 1) => { const c = t.clone(); c.repeat.set(r, r); c.needsUpdate = true; return c; };
  const K = {
    fabric: (c) => phys({ color: c, map: T.fabric(), roughness: 0.92, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color(c).lerp(new THREE.Color('#ffffff'), 0.35) }),
    leather: (c) => std({ color: c, roughness: 0.42 }),
    wood: (c) => std({ color: c, map: T.wood(), roughness: 0.5 }),
    paint: (c) => std({ color: c, roughness: 0.55 }),
    wallpaint: (c) => std({ color: c, roughness: 0.92 }),
    gloss: (c) => std({ color: c, roughness: 0.18 }),
    matte: (c) => std({ color: c, roughness: 0.9 }),
    metal: (c) => std({ color: c, metalness: 0.9, roughness: 0.32 }),
    chrome: (c) => std({ color: c === '#ffffff' ? '#e8ecef' : c, metalness: 1, roughness: 0.08 }),
    brass: (c) => std({ color: c === '#ffffff' ? '#c9a24f' : c, metalness: 1, roughness: 0.28 }),
    ceramic: (c) => std({ color: c, roughness: 0.14 }),
    plastic: (c) => std({ color: c, roughness: 0.45 }),
    rubber: (c) => std({ color: c, roughness: 0.95 }),
    glass: (c) => phys({ color: c, transparent: true, opacity: 0.22, roughness: 0.04, envMapIntensity: 1.6, depthWrite: false }),
    mirror: () => std({ color: '#dfe7ec', metalness: 1, roughness: 0.02 }),
    leaf: (c) => std({ color: c, roughness: 0.68, side: THREE.DoubleSide }),
    marble: (c) => std({ color: c, map: T.marble(), roughness: 0.2 }),
    stone: (c) => std({ color: c, map: T.stone(), roughness: 0.9 }),
    wicker: (c) => std({ color: c, map: T.wicker(), roughness: 0.85 }),
    foam: (c) => std({ color: c, map: T.foam(), roughness: 1 }),
    carpet: (c) => std({ color: c, map: T.carpet(), roughness: 1 }),
    emit: (c) => std({ color: c, emissive: c, emissiveIntensity: 2 }),
    screen: (k) => std({ color: '#ffffff', map: T.screen(k), emissive: '#ffffff', emissiveMap: T.screen(k), emissiveIntensity: 0.75, roughness: 0.12 }),
    rug: (c) => std({ map: T.rug(c), roughness: 1 }),
    art: (c) => std({ map: T.art(c), roughness: 0.8 }),
    poster: (c) => std({ map: T.poster(c), roughness: 0.6 }),
    photo: (c) => std({ map: T.photo(c), roughness: 0.35 }),
    console: () => std({ color: '#ffffff', map: T.console(), emissive: '#ffffff', emissiveMap: T.console(), emissiveIntensity: 0.6, roughness: 0.4 }),
    keys: () => std({ map: T.keys(), roughness: 0.3 }),
    sheet: () => std({ map: T.sheet(), roughness: 0.9, side: THREE.DoubleSide }),
    vinyl: () => std({ map: T.vinyl(), roughness: 0.3 }),
    neon: (spec) => { const [text, c] = spec.split('|'); return new THREE.MeshBasicMaterial({ map: T.neon(text, c), transparent: true, depthWrite: false, toneMapped: false }); },
    grille: (c) => std({ color: c, metalness: 0.6, roughness: 0.6 }),
    net: () => std({ color: '#f5f5f5', wireframe: true }),
    siding: (c) => std({ color: c, map: T.siding(), roughness: 0.8 }),
    shingle: () => std({ map: T.shingles(), roughness: 0.95 }),
    brick: () => std({ map: T.brick(), roughness: 0.95 }),
    pavers: () => std({ map: T.pavers(), roughness: 0.95 }),
    concrete: () => std({ map: T.concrete(), roughness: 0.95 }),
    asphalt: () => std({ map: T.asphalt(), roughness: 0.9 }),
    mulch: () => std({ map: T.mulch(), roughness: 1 }),
    fence: () => std({ map: T.fence(), roughness: 0.85 }),
    beadboard: (c) => std({ color: c, map: T.beadboard(), roughness: 0.7 }),
    oakFloor: () => std({ map: T.oak(), roughness: 0.38 }),
    walnutFloor: () => std({ map: T.walnut(), roughness: 0.38 }),
    tileFloor: () => std({ map: T.tile(), roughness: 0.25 }),
    mosaicFloor: () => std({ map: T.mosaic(), roughness: 0.25 }),
    marbleFloor: () => std({ map: map(T.marble(), 0.5), roughness: 0.15 }),
    porchFloor: () => std({ map: T.porch(), roughness: 0.7 }),
    grass: () => std({ map: T.grass(), roughness: 0.95, vertexColors: true }),
  };
  const cache = new Map();
  const tint = (kind, color = '#ffffff') => {
    if (glow[kind]) return glow[kind];
    const key = `${kind}|${color}`;
    if (!cache.has(key)) cache.set(key, (K[kind] || K.paint)(color));
    return cache.get(key);
  };
  const roomWall = Object.fromEntries(ROOMS.map((r) => [r.id, r.wall]));
  return {
    glow, tint,
    trim: tint('paint', '#f7f4ec'), siding: tint('siding', '#e6dcc6'), ceiling: tint('wallpaint', '#f6f3ee'), roof: tint('shingle'),
    foundation: tint('stone', '#ffffff'), glass: tint('glass', '#cfe6f2'), porch: tint('porchFloor'), beadboard: tint('beadboard', '#cfe4e6'),
    shutter: tint('paint', '#2f4a4f'), brick: tint('brick'),
    wall: (room) => tint('wallpaint', roomWall[room] || '#efe8dc'),
    floor: (spec) => (spec.startsWith('carpet:') ? tint('carpet', spec.slice(7)) : tint(`${spec}Floor`)),
  };
}