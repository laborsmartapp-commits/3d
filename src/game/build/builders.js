import * as THREE from 'three';
import { glowTexture } from '../core/shared';

const S = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...o });
export const MAT = {
  stone: S('#76707c'), darkStone: S('#3b3744'), obsidian: S('#1c1a24', { roughness: 0.35 }),
  plaster: S('#d8cdbb'), plasterViolet: S('#b3a3cc'), wood: S('#7a5436'), darkWood: S('#3f2a1d'),
  roofTeal: S('#1d5b61'), roofViolet: S('#4a2e70'), roofSlate: S('#2a2f3f'), roofTerra: S('#8c4a35'),
  gold: S('#caa24c', { metalness: 0.6, roughness: 0.35 }), cloth: S('#8b2f5a', { side: THREE.DoubleSide }), clothTeal: S('#17806f', { side: THREE.DoubleSide }),
  glass: new THREE.MeshStandardMaterial({ color: '#a8e6ff', transparent: true, opacity: 0.32, roughness: 0.05 }),
  leaf: S('#2b6a3a', { flatShading: true }), leafViolet: S('#5b3d8f', { flatShading: true }), hedge: S('#24552f', { flatShading: true }), soil: S('#4a3526'),
  water: new THREE.MeshStandardMaterial({ color: '#1aa3b0', transparent: true, opacity: 0.82, roughness: 0.08, emissive: '#0a5560', emissiveIntensity: 0.4 }),
  window: S('#2a1c10', { emissive: '#ffb040', emissiveIntensity: 0.2 }),
  lamp: S('#fff2c8', { emissive: '#ffc46b', emissiveIntensity: 1 }),
  crystal: S('#b57bff', { emissive: '#7c3aed', emissiveIntensity: 0.9, roughness: 0.2 }),
  crystalTeal: S('#48f0c0', { emissive: '#05ce91', emissiveIntensity: 0.9, roughness: 0.2 }),
  flame: new THREE.MeshBasicMaterial({ color: '#ffae42', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
  portal: new THREE.MeshBasicMaterial({ color: '#a855f7', transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
  metal: S('#565a64', { metalness: 0.7, roughness: 0.4 }), bark: S('#4a3528'), crop: S('#5f9a3a', { flatShading: true }),
  flowerA: S('#d946ef', { emissive: '#a21caf', emissiveIntensity: 0.4 }), flowerB: S('#fbbf24', { emissive: '#b45309', emissiveIntensity: 0.3 }), flowerC: S('#34e0c4', { emissive: '#05ce91', emissiveIntensity: 0.4 }),
};
MAT.portal.map = glowTexture();

const nightGlow = new Map();
export function glowMat(color, always = false) {
  const key = color + always;
  if (!nightGlow.has(key)) nightGlow.set(key, { always, m: new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: always ? 0.8 : 0.3 }) });
  return nightGlow.get(key).m;
}
export function updateNightMaterials(night) {
  MAT.window.emissiveIntensity = 0.15 + night * 2.4;
  MAT.lamp.emissiveIntensity = 0.3 + night * 2.6;
  MAT.crystal.emissiveIntensity = 0.6 + night * 1.6;
  MAT.crystalTeal.emissiveIntensity = 0.6 + night * 1.6;
  for (const g of nightGlow.values()) if (!g.always) g.m.opacity = 0.08 + night * 0.9;
}

export const CTX = { win: MAT.window };

export function mesh(geo, mat, x = 0, y = 0, z = 0) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; return m; }
export const box = (w, h, d, mat, x, y, z) => mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
export const cyl = (rt, rb, h, mat, x, y, z, seg = 12) => mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y, z);
export const cone = (r, h, mat, x, y, z, seg = 12) => mesh(new THREE.ConeGeometry(r, h, seg), mat, x, y, z);
export const sph = (r, mat, x, y, z, ws = 14, hs = 10) => mesh(new THREE.SphereGeometry(r, ws, hs), mat, x, y, z);
export function anim(g, fn) { (g.userData.anim ||= []).push(fn); }
export function addLight(g, x, y, z, color = '#ffb45a', intensity = 6, dist = 16, always = false) { (g.userData.lights ||= []).push({ p: [x, y, z], color, intensity, dist, always }); }
export function glow(g, x, y, z, color, size, always = false) { const s = new THREE.Sprite(glowMat(color, always)); s.position.set(x, y, z); s.scale.setScalar(size); g.add(s); return s; }
export function seat(g, x, y, z, rot = 0) { (g.userData.seats ||= []).push([x, y, z, rot]); }

export function lampBox(g, x, y, z, s = 0.25) { g.add(box(s, s * 1.3, s, MAT.lamp, x, y, z)); glow(g, x, y, z, '#ffc46b', s * 8); addLight(g, x, y, z, '#ffb45a', 4, 12); }

export function fire(g, x, y, z, s = 1) {
  const f = new THREE.Group();
  f.position.set(x, y, z);
  g.add(f);
  const cs = [0, 1, 2].map((i) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.28 * s * (1 - i * 0.2), 0.9 * s * (1 - i * 0.15), 7), MAT.flame);
    c.position.set((i - 1) * 0.12 * s, 0.4 * s, (i % 2) * 0.1 * s);
    f.add(c);
    return c;
  });
  const gl = glow(f, 0, 0.5 * s, 0, '#ff9a3c', 3.5 * s, true);
  anim(g, (t) => {
    cs.forEach((c, i) => { c.scale.set(1, 1 + Math.sin(t * 14 + i * 2.1) * 0.18 + Math.sin(t * 23 + i) * 0.1, 1); c.rotation.y = t * 2 + i; });
    gl.scale.setScalar(3.5 * s * (0.9 + Math.sin(t * 17) * 0.1));
  });
  (g.userData.fires ||= []).push([x, y + 0.5 * s, z]);
  addLight(g, x, y + 0.8 * s, z, '#ff8c3a', 7 * s, 14 * s, true);
}

function gable(w, d, h, mat) {
  const o = 0.45, s = new THREE.Shape();
  s.moveTo(-w / 2 - o, 0); s.lineTo(w / 2 + o, 0); s.lineTo(0, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d + o * 2, bevelEnabled: false });
  g.translate(0, 0, -(d + o * 2) / 2);
  return mesh(g, mat);
}

function addWindows(g, w, d, y, front) {
  const nx = Math.max(1, Math.floor(w / 2.6)), nz = Math.max(1, Math.floor(d / 2.6));
  for (let i = 0; i < nx; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / nx;
    if (!(front && Math.abs(x) < 1)) g.add(box(0.75, 1, 0.1, CTX.win, x, y, d / 2 + 0.03));
    g.add(box(0.75, 1, 0.1, CTX.win, x, y, -d / 2 - 0.03));
  }
  for (let i = 0; i < nz; i++) {
    const z = -d / 2 + ((i + 0.5) * d) / nz;
    g.add(box(0.1, 1, 0.75, CTX.win, w / 2 + 0.03, y, z));
    g.add(box(0.1, 1, 0.75, CTX.win, -w / 2 - 0.03, y, z));
  }
}

export function tower({ r = 1.8, h = 9, wall = MAT.stone, roofMat = MAT.roofViolet, roofH = null, crystal = false, flat = false } = {}) {
  const g = new THREE.Group();
  const rh = roofH ?? r * 2.2;
  g.add(cyl(r, r * 1.08, h, wall, 0, h / 2, 0, 14));
  g.add(cyl(r + 0.25, r + 0.25, 0.3, MAT.darkStone, 0, h, 0, 14));
  if (flat) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(box(0.6, 0.8, 0.4, MAT.stone, Math.sin(a) * r, h + 0.5, Math.cos(a) * r)); }
  else g.add(cone(r + 0.5, rh, roofMat, 0, h + rh / 2 + 0.15, 0, 14));
  for (let y = 3; y < h - 1; y += 3) for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + y;
    const wdw = box(0.5, 0.85, 0.12, CTX.win, Math.sin(a) * (r + 0.02), y, Math.cos(a) * (r + 0.02));
    wdw.rotation.y = a;
    g.add(wdw);
  }
  if (crystal) {
    const cy = h + rh + 1.4;
    const c = mesh(new THREE.OctahedronGeometry(0.7), MAT.crystal, 0, cy, 0);
    g.add(c);
    glow(g, 0, cy, 0, '#a855f7', 5, true);
    anim(g, (t) => { c.rotation.y = t; c.position.y = cy + Math.sin(t * 1.5) * 0.3; });
  }
  return g;
}

export function house(o = {}) {
  const { w = 6, d = 5, floors = 1, fh = 3.1, wall = MAT.plaster, wall2 = null, roof = 'gable', roofMat = MAT.roofTeal, roofH = null, chimney = false, towers = [], porch = false, stilts = 0, base = MAT.stone, trim = MAT.darkWood, awning = null, noBase = false } = o;
  const g = new THREE.Group();
  if (stilts > 0) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.2, 0.25, stilts + 3, MAT.darkWood, sx * (w / 2 - 0.3), stilts / 2 - 1.5, sz * (d / 2 - 0.3), 6));
    g.add(box(w + 1.6, 0.25, d + 2.6, MAT.wood, 0, stilts + 0.08, 0.5));
  } else if (!noBase) g.add(box(w + 0.7, 2.6, d + 0.7, base, 0, -1.1, 0));
  const y0 = stilts + 0.2;
  for (let f = 0; f < floors; f++) {
    const inset = f * 0.15, fw = w - inset, fd = d - inset;
    g.add(box(fw, fh, fd, f > 0 && wall2 ? wall2 : wall, 0, y0 + fh * (f + 0.5), 0));
    g.add(box(fw + 0.12, 0.22, fd + 0.12, trim, 0, y0 + fh * (f + 1), 0));
    addWindows(g, fw, fd, y0 + fh * f + fh * 0.55, f === 0);
  }
  const top = y0 + fh * floors, iw = w - (floors - 1) * 0.15, id = d - (floors - 1) * 0.15;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.22, top - y0, 0.22, trim, sx * (w / 2), y0 + (top - y0) / 2, sz * (d / 2)));
  const rh = roofH ?? Math.max(iw, id) * 0.42;
  if (roof === 'gable') { const r = gable(iw, id, rh, roofMat); r.position.y = top; g.add(r); }
  else if (roof === 'dome') { g.add(mesh(new THREE.SphereGeometry(Math.min(iw, id) * 0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), roofMat, 0, top, 0)); g.add(box(iw + 0.3, 0.4, id + 0.3, trim, 0, top + 0.2, 0)); }
  else if (roof === 'flat') g.add(box(iw + 0.4, 0.4, id + 0.4, roofMat, 0, top + 0.2, 0));
  else if (roof === 'pagoda') {
    const r1 = cone(Math.max(iw, id) * 0.95, rh * 0.6, roofMat, 0, top + rh * 0.3, 0, 4); r1.rotation.y = Math.PI / 4; g.add(r1);
    g.add(box(iw * 0.5, 1.4, id * 0.5, wall, 0, top + rh * 0.6 + 0.4, 0));
    const r2 = cone(Math.max(iw, id) * 0.55, rh * 0.6, roofMat, 0, top + rh * 0.9 + 0.9, 0, 4); r2.rotation.y = Math.PI / 4; g.add(r2);
  }
  const door = new THREE.Group();
  door.position.set(-0.55, y0, d / 2 + 0.06);
  door.add(box(1.1, 2.15, 0.1, MAT.darkWood, 0.55, 1.075, 0));
  g.add(door);
  g.add(box(1.5, 0.2, 0.2, trim, 0, y0 + 2.25, d / 2 + 0.08));
  g.userData.door = door;
  g.userData.doorLocal = [0, 0, d / 2 + 1.3];
  lampBox(g, 1.0, y0 + 1.9, d / 2 + 0.25, 0.22);
  if (chimney) g.add(box(0.7, rh + 1.4, 0.7, MAT.stone, iw * 0.25, top + rh * 0.5, -id * 0.15));
  for (const t of towers) { const tg = tower({ r: t.r, h: top + t.h, roofMat: t.roofMat || roofMat, wall: t.wall || wall }); tg.position.set(t.x, 0, t.z); g.add(tg); }
  if (porch) {
    g.add(cyl(0.12, 0.12, 2.6, trim, -1.3, y0 + 1.3, d / 2 + 1.6, 6));
    g.add(cyl(0.12, 0.12, 2.6, trim, 1.3, y0 + 1.3, d / 2 + 1.6, 6));
    const pr = box(3.2, 0.18, 2, roofMat, 0, y0 + 2.7, d / 2 + 0.9); pr.rotation.x = 0.2; g.add(pr);
  }
  if (awning) { const a = box(w * 0.8, 0.08, 1.4, awning, 0, y0 + 2.6, d / 2 + 0.7); a.rotation.x = 0.35; g.add(a); }
  return g;
}

export function bench(g, x = 0, z = 0, rot = 0) {
  const b = new THREE.Group();
  b.position.set(x, 0, z); b.rotation.y = rot;
  b.add(box(1.8, 0.1, 0.5, MAT.wood, 0, 0.45, 0));
  b.add(box(1.8, 0.5, 0.08, MAT.wood, 0, 0.75, -0.25));
  b.add(box(0.1, 0.45, 0.45, MAT.darkWood, -0.8, 0.22, 0));
  b.add(box(0.1, 0.45, 0.45, MAT.darkWood, 0.8, 0.22, 0));
  g.add(b);
  seat(g, x, 0.45, z, rot);
}

export function fountain(g, r = 2.5, glowing = false) {
  g.add(cyl(r, r + 0.2, 0.7, MAT.stone, 0, 0.35, 0, 20));
  g.add(cyl(r - 0.25, r - 0.25, 0.1, glowing ? MAT.crystalTeal : MAT.water, 0, 0.62, 0, 20));
  g.add(cyl(0.3, 0.45, 1.8, MAT.stone, 0, 1.2, 0, 10));
  g.add(cyl(r * 0.45, 0.25, 0.3, MAT.stone, 0, 2.1, 0, 14));
  const jet = cyl(0.08, 0.2, 1.2, MAT.water, 0, 2.7, 0, 8);
  g.add(jet);
  const drops = mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.5, 1.4, 16, 1, true), new THREE.MeshStandardMaterial({ color: '#9ee7ef', transparent: true, opacity: 0.35, side: THREE.DoubleSide }), 0, 1.45, 0);
  g.add(drops);
  anim(g, (t) => { jet.scale.y = 1 + Math.sin(t * 6) * 0.15; drops.material.opacity = 0.28 + Math.sin(t * 9) * 0.06; });
  if (glowing) {
    glow(g, 0, 1.2, 0, '#05ce91', 6, true);
    const c = mesh(new THREE.OctahedronGeometry(0.5), MAT.crystalTeal, 0, 3.8, 0);
    g.add(c);
    anim(g, (t) => { c.rotation.y = t; c.position.y = 3.8 + Math.sin(t * 2) * 0.25; });
  }
}

export function scorpionStatue(g, s = 1, broken = false) {
  const st = new THREE.Group();
  st.scale.setScalar(s);
  st.add(box(3, 0.8, 4, MAT.darkStone, 0, 0.4, 0));
  st.add(mesh(new THREE.SphereGeometry(0.9, 12, 8).scale(1, 0.5, 1.4), MAT.obsidian, 0, 1.3, 0.3));
  st.add(mesh(new THREE.SphereGeometry(0.55, 10, 8).scale(1, 0.55, 1), MAT.obsidian, 0, 1.25, 1.6));
  for (const sx of [-1, 1]) {
    const claw = mesh(new THREE.CapsuleGeometry(0.14, 0.9, 3, 6), MAT.obsidian, sx * 0.9, 1.25, 2.2);
    claw.rotation.set(Math.PI / 2, 0, sx * 0.5);
    st.add(claw);
    st.add(mesh(new THREE.SphereGeometry(0.3, 8, 6).scale(1, 0.6, 1.4), MAT.obsidian, sx * 1.2, 1.25, 2.9));
    for (let k = 0; k < 3; k++) { const l = mesh(new THREE.CapsuleGeometry(0.06, 0.8, 2, 5), MAT.obsidian, sx * 0.9, 1.0, 0.8 - k * 0.5); l.rotation.z = sx * 1.1; st.add(l); }
  }
  const n = broken ? 3 : 7;
  let last = null;
  for (let i = 0; i < n; i++) {
    const th = -1.27 - (i / 6) * 4;
    last = sph(0.42 - i * 0.03, MAT.obsidian, 0, 2.6 + Math.sin(th) * 1.3, -1.4 + Math.cos(th) * 1.3);
    st.add(last);
  }
  if (!broken) {
    const sting = mesh(new THREE.ConeGeometry(0.22, 0.8, 8), MAT.crystal, 0, last.position.y - 0.3, last.position.z + 0.4);
    sting.rotation.x = 2.2;
    st.add(sting);
    glow(st, 0, sting.position.y, sting.position.z, '#a855f7', 2.5);
  }
  g.add(st);
}