import * as THREE from 'three';
import { MAT, house, tower, box, cyl, cone, sph, mesh, anim, fire, glow, lampBox, addLight, bench, fountain, scorpionStatue } from './builders';

export const CATEGORIES = [
  { id: 'homes', label: 'Homes' }, { id: 'shops', label: 'Shops' }, { id: 'civic', label: 'Civic' }, { id: 'culture', label: 'Culture' },
  { id: 'leisure', label: 'Leisure' }, { id: 'farm', label: 'Farm' }, { id: 'magical', label: 'Magical' }, { id: 'decor', label: 'Decor' }, { id: 'lights', label: 'Lights' },
];

const withG = (fn) => () => { const g = new THREE.Group(); fn(g); return g; };
const add = (g, o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); g.add(o); return o; };
const FL = [MAT.flowerA, MAT.flowerB, MAT.flowerC];

function columnsRing(g, n, r, h, mat = MAT.stone, y = 0) { for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; g.add(cyl(0.3, 0.35, h, mat, Math.sin(a) * r, y + h / 2, Math.cos(a) * r, 10)); } }
function tree(g, x, z, s = 1, mat = MAT.leaf) { g.add(cyl(0.15 * s, 0.25 * s, 2.5 * s, MAT.bark, x, 1.25 * s, z, 6)); g.add(mesh(new THREE.IcosahedronGeometry(1.3 * s, 1), mat, x, 3 * s, z)); }
function hedgeRect(g, w, d, gap = 2) {
  g.add(box(w, 1, 0.6, MAT.hedge, 0, 0.5, -d / 2));
  g.add(box(0.6, 1, d, MAT.hedge, -w / 2, 0.5, 0));
  g.add(box(0.6, 1, d, MAT.hedge, w / 2, 0.5, 0));
  const s = (w - gap) / 2;
  g.add(box(s, 1, 0.6, MAT.hedge, -w / 2 + s / 2, 0.5, d / 2));
  g.add(box(s, 1, 0.6, MAT.hedge, w / 2 - s / 2, 0.5, d / 2));
}
function fenceLine(g, x0, z0, x1, z1) {
  const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(L / 2)), rot = Math.atan2(x1 - x0, z1 - z0);
  for (let i = 0; i <= n; i++) g.add(box(0.15, 1.1, 0.15, MAT.darkWood, x0 + ((x1 - x0) * i) / n, 0.55, z0 + ((z1 - z0) * i) / n));
  for (const y of [0.45, 0.9]) { const r = box(0.08, 0.1, L, MAT.wood, (x0 + x1) / 2, y, (z0 + z1) / 2); r.rotation.y = rot; g.add(r); }
}
function stall(g, x, z, cloth) {
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.08, 0.08, 2.4, MAT.darkWood, x + sx * 1.1, 1.2, z + sz * 0.8, 5));
  g.add(box(2.2, 0.8, 1.4, MAT.wood, x, 0.4, z));
  const r = box(2.6, 0.08, 2, cloth, x, 2.45, z); r.rotation.x = 0.15; g.add(r);
  for (let i = 0; i < 4; i++) g.add(sph(0.14, FL[i % 3], x - 0.7 + i * 0.45, 0.95, z));
}
function crates(g, x, z) { g.add(box(0.8, 0.8, 0.8, MAT.wood, x, 0.4, z)); g.add(box(0.7, 0.7, 0.7, MAT.wood, x + 0.9, 0.35, z + 0.2)); g.add(box(0.6, 0.6, 0.6, MAT.darkWood, x + 0.4, 1.1, z)); }
function orb(g, y, color = '#a855f7', mat = MAT.crystal) {
  const o = sph(0.35, mat, 0, y, 0, 12, 10); g.add(o);
  const gl = glow(g, 0, y, 0, color, 3, true);
  anim(g, (t) => { o.position.y = y + Math.sin(t * 1.8) * 0.25; gl.position.y = o.position.y; });
  addLight(g, 0, y, 0, color, 4, 12, true);
}

function cottage(tier = 1) {
  if (tier === 1) return house({ w: 6, d: 5, roofMat: MAT.roofTeal, chimney: true });
  if (tier === 2) return house({ w: 8, d: 6.5, floors: 2, wall2: MAT.plasterViolet, roofMat: MAT.roofTeal, chimney: true, porch: true });
  if (tier === 3) return house({ w: 11, d: 8, floors: 2, roofMat: MAT.roofViolet, towers: [{ x: 5.5, z: -4, r: 1.6, h: 4 }], porch: true, chimney: true });
  return house({ w: 14, d: 10, floors: 3, roofMat: MAT.roofViolet, towers: [{ x: 7, z: -5, r: 2, h: 5 }, { x: -7, z: -5, r: 2, h: 5 }], porch: true });
}

const D = (id, name, cat, cost, fp, build, extra = {}) => ({ id, name, cat, cost, fp, build, collide: 'box', ...extra });

export const CATALOG = [
  D('cottage', 'Cottage', 'homes', 250, [6.7, 5.7], cottage, { tiers: ['Cottage', 'Large Cottage', 'Manor', 'Estate'], fpTier: [[6.7, 5.7], [8.7, 7.2], [11.7, 8.7], [15, 11]], upgradeCost: [0, 400, 900, 1800] }),
  D('treehouse', 'Tree House', 'homes', 420, [4, 4], withG((g) => {
    g.add(cyl(1.1, 1.5, 7, MAT.bark, 0, 3.5, 0, 10));
    for (const [x, y, z, r] of [[0, 12, 0, 3.4], [2.4, 10.8, 1, 2.4], [-2.2, 11, -1, 2.5]]) g.add(mesh(new THREE.IcosahedronGeometry(r, 1), MAT.leaf, x, y, z));
    g.add(cyl(3.4, 3.4, 0.35, MAT.wood, 0, 6.6, 0, 16));
    add(g, house({ w: 3.6, d: 3.2, fh: 2.6, roofMat: MAT.roofViolet, noBase: true }), 0, 6.6, 0.3);
    for (let y = 0.4; y < 6.5; y += 0.5) g.add(box(0.9, 0.08, 0.08, MAT.darkWood, 0, y, 3.5));
  }), { collide: 'circle' }),
  D('villa', 'Fantasy Villa', 'homes', 900, [11, 8], withG((g) => {
    add(g, house({ w: 10, d: 7, floors: 2, roof: 'flat', roofMat: MAT.stone, wall2: MAT.plasterViolet }));
    for (let i = -2; i <= 2; i++) g.add(cyl(0.25, 0.3, 5.5, MAT.plaster, i * 2.2, 3, 4.2, 10));
    g.add(mesh(new THREE.SphereGeometry(1.8, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.roofTeal, 0, 6.8, 0));
  })),
  D('tower_home', 'Spire Tower', 'homes', 600, [5, 5], withG((g) => { add(g, tower({ r: 2.4, h: 12, wall: MAT.plasterViolet, roofMat: MAT.roofTeal })); g.add(box(1.1, 2.1, 0.2, MAT.darkWood, 0, 1.05, 2.45)); lampBox(g, 0.9, 2, 2.6); })),
  D('mansion', 'Mansion', 'homes', 1600, [16, 9.5], withG((g) => {
    add(g, house({ w: 12, d: 8.5, floors: 2, roofMat: MAT.roofSlate, chimney: true, porch: true }));
    add(g, house({ w: 4, d: 7, roofMat: MAT.roofSlate }), -8, 0, -0.5);
    add(g, house({ w: 4, d: 7, roofMat: MAT.roofSlate }), 8, 0, -0.5);
  })),
  D('cliff_house', 'Cliffside House', 'homes', 700, [8.6, 8.6], () => house({ w: 7, d: 6, floors: 2, stilts: 1.6, roofMat: MAT.roofViolet, wall2: MAT.plasterViolet, chimney: true }), { slopeTol: 3.2 }),
  D('waterfront', 'Waterfront Home', 'homes', 650, [8.6, 10], withG((g) => { add(g, house({ w: 7, d: 6, stilts: 0.8, roofMat: MAT.roofTeal })); g.add(box(2.5, 0.2, 6, MAT.wood, 0, 0.9, 6)); }), { water: true, slopeTol: 3 }),
  D('cabin', 'Cabin', 'homes', 180, [6.2, 5.2], () => house({ w: 5.5, d: 4.5, wall: MAT.wood, roofMat: MAT.roofSlate, chimney: true })),
  D('palace', 'Celestial Palace', 'homes', 5000, [20, 16], withG((g) => {
    add(g, house({ w: 16, d: 12, floors: 3, roof: 'dome', roofMat: MAT.gold }));
    for (const [x, z] of [[-8, -6], [8, -6], [-8, 6], [8, 6]]) add(g, tower({ r: 2.2, h: 15, wall: MAT.plaster, roofMat: MAT.roofViolet, crystal: true }), x, 0, z);
  })),
  D('blacksmith', 'Blacksmith', 'shops', 500, [9, 7], withG((g) => {
    add(g, house({ w: 6, d: 6, roofMat: MAT.roofSlate, chimney: true }), -1.5);
    for (const z of [-2.5, 2.5]) g.add(cyl(0.15, 0.15, 3, MAT.darkWood, 3.8, 1.5, z, 6));
    const r = box(3.2, 0.2, 6.4, MAT.roofSlate, 3, 3.1, 0); r.rotation.z = -0.15; g.add(r);
    g.add(box(1.4, 1, 1.4, MAT.darkStone, 3, 0.5, -1.4)); fire(g, 3, 1, -1.4, 0.8);
    g.add(box(0.8, 0.5, 0.4, MAT.metal, 3, 0.75, 1.2));
  })),
  D('potion_shop', 'Potion Shop', 'shops', 450, [7, 6], withG((g) => {
    add(g, house({ w: 6, d: 5, roofMat: MAT.roofViolet, awning: MAT.clothTeal, towers: [{ x: 3, z: -2.5, r: 1.3, h: 3, roofMat: MAT.roofTeal }] }));
    for (let i = 0; i < 4; i++) g.add(sph(0.14, i % 2 ? MAT.crystalTeal : MAT.crystal, -1.8 + i * 0.4, 1.6, 2.7));
  })),
  D('bakery', 'Bakery', 'shops', 400, [7.7, 6.7], () => house({ w: 7, d: 6, roofMat: MAT.roofTerra, chimney: true, awning: MAT.cloth })),
  D('market', 'Market Stalls', 'shops', 350, [10, 6], withG((g) => { stall(g, -3.4, 0, MAT.cloth); stall(g, 0, 0.4, MAT.clothTeal); stall(g, 3.4, 0, MAT.cloth); crates(g, 4.5, -2); })),
  D('tavern', 'Tavern', 'shops', 900, [10.7, 8.7], withG((g) => {
    add(g, house({ w: 10, d: 8, floors: 2, wall2: MAT.plasterViolet, roofMat: MAT.roofViolet, chimney: true, porch: true }));
    g.add(box(1.4, 0.9, 0.08, MAT.wood, 2.4, 3, 4.6)); lampBox(g, -2.2, 2.2, 4.3);
  })),
  D('general_store', 'General Store', 'shops', 400, [8.7, 6.7], withG((g) => { add(g, house({ w: 8, d: 6, roofMat: MAT.roofTeal, awning: MAT.clothTeal })); crates(g, 3, 4); })),
  D('mystic_shop', 'Mystic Shop', 'shops', 650, [6.7, 6.7], withG((g) => { add(g, house({ w: 6, d: 6, wall: MAT.plasterViolet, roof: 'dome', roofMat: MAT.roofViolet })); orb(g, 7.2); })),
  D('florist', 'Florist', 'shops', 380, [6.7, 6], withG((g) => { add(g, house({ w: 6, d: 5, roofMat: MAT.roofTerra, awning: MAT.cloth })); for (let i = 0; i < 6; i++) g.add(sph(0.25, FL[i % 3], -2.5 + i, 0.35, 3.3)); })),
  D('town_hall', 'Town Hall', 'civic', 1800, [12.7, 10], withG((g) => {
    add(g, house({ w: 12, d: 9, floors: 2, roofMat: MAT.roofSlate }));
    add(g, tower({ r: 2, h: 15, wall: MAT.stone, roofMat: MAT.roofTeal }), 0, 0, -2);
    for (const i of [-2, -1, 1, 2]) g.add(cyl(0.3, 0.35, 5.8, MAT.plaster, i * 2.2, 3.1, 5, 10));
  })),
  D('library', 'Library', 'civic', 1100, [10.7, 8.7], withG((g) => { add(g, house({ w: 10, d: 8, roof: 'dome', roofMat: MAT.roofTeal })); for (const x of [-3, 3]) g.add(cyl(0.3, 0.35, 3.3, MAT.plaster, x, 1.9, 4.5, 10)); })),
  D('school', 'School', 'civic', 900, [10.7, 7.7], withG((g) => { add(g, house({ w: 10, d: 7, roofMat: MAT.roofTerra })); add(g, tower({ r: 1, h: 7, wall: MAT.plaster, roofMat: MAT.roofTerra }), 4, 0, -2.5); })),
  D('community_hall', 'Community Hall', 'civic', 1000, [12.7, 7.7], () => house({ w: 12, d: 7, fh: 4, roofMat: MAT.roofTeal, porch: true })),
  D('guard_house', 'Guard House', 'civic', 700, [6.4, 6.4], withG((g) => { add(g, tower({ r: 3, h: 8, wall: MAT.stone, flat: true })); g.add(box(1.2, 2.2, 0.3, MAT.darkWood, 0, 1.1, 3.05)); fire(g, 0, 8.3, 0, 0.7); })),
  D('temple', 'Temple of the Tide', 'culture', 2200, [14, 14], withG((g) => {
    for (let i = 0; i < 3; i++) g.add(box(14 - i * 2, 0.6, 14 - i * 2, MAT.stone, 0, 0.3 + i * 0.6, 0));
    columnsRing(g, 10, 5, 6, MAT.stone, 1.8);
    g.add(mesh(new THREE.SphereGeometry(5.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), MAT.gold, 0, 7.8, 0));
    orb(g, 3.5, '#05ce91', MAT.crystalTeal);
  }), { collide: 'none' }),
  D('shrine', 'Shrine', 'culture', 300, [4, 4], withG((g) => {
    g.add(box(3, 0.5, 3, MAT.darkStone, 0, 0.25, 0));
    g.add(box(0.4, 3.2, 0.4, MAT.obsidian, -1.2, 1.9, 0)); g.add(box(0.4, 3.2, 0.4, MAT.obsidian, 1.2, 1.9, 0)); g.add(box(3.2, 0.4, 0.5, MAT.obsidian, 0, 3.5, 0));
    orb(g, 2);
  }), { collide: 'circle', interact: 'shrine' }),
  D('observatory', 'Observatory', 'culture', 1400, [9, 9], withG((g) => {
    g.add(cyl(4, 4.3, 5, MAT.stone, 0, 2.5, 0, 20));
    g.add(mesh(new THREE.SphereGeometry(4, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.roofSlate, 0, 5, 0));
    const tel = cyl(0.4, 0.6, 5, MAT.gold, 1.5, 8, 0, 10); tel.rotation.z = -0.8; g.add(tel);
  }), { collide: 'circle' }),
  D('theater', 'Moon Theater', 'culture', 1500, [16, 12], withG((g) => {
    for (let i = 0; i < 4; i++) g.add(mesh(new THREE.CylinderGeometry(8 - i * 1.3, 8 - i * 1.3, 0.6 + i * 0.6, 24, 1, false, Math.PI / 2, Math.PI), MAT.stone, 0, (0.6 + i * 0.6) / 2, -2));
    g.add(box(8, 0.8, 4, MAT.wood, 0, 0.4, 3.5));
    g.add(box(8, 4, 0.2, MAT.cloth, 0, 2.8, 5.4));
  }), { collide: 'none' }),
  D('museum', 'Museum', 'culture', 1300, [12.7, 8.7], withG((g) => { add(g, house({ w: 12, d: 8, roofMat: MAT.stone })); for (let i = -2.5; i <= 2.5; i++) g.add(cyl(0.3, 0.35, 3.3, MAT.plaster, i * 2.2, 1.9, 4.6, 10)); })),
  D('gallery', 'Glass Gallery', 'culture', 1000, [11, 8], withG((g) => { g.add(box(11, 0.4, 8, MAT.stone, 0, 0.2, 0)); g.add(box(10, 4, 7, MAT.glass, 0, 2.4, 0)); g.add(box(10.6, 0.4, 7.6, MAT.plaster, 0, 4.6, 0)); scorpionStatue(g, 0.6); })),
  D('garden', 'Moon Garden', 'leisure', 300, [10, 10], withG((g) => {
    hedgeRect(g, 10, 10, 2.4);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.add(sph(0.35, FL[i % 3], Math.cos(a) * 3.2, 0.3, Math.sin(a) * 3.2)); }
    tree(g, -3, -3, 1, MAT.leafViolet); tree(g, 3, -3, 0.9); fountain(g, 1.3); bench(g, 0, -3.8, 0);
  }), { collide: 'none' }),
  D('bathhouse', 'Bathhouse', 'leisure', 1200, [12, 10], withG((g) => { g.add(box(12, 0.5, 10, MAT.stone, 0, 0.25, 0)); g.add(box(7, 0.15, 5, MAT.water, 0, 0.55, 0)); columnsRing(g, 8, 4.6, 4); g.add(box(11, 0.4, 9, MAT.roofTeal, 0, 4.2, 0)); }), { collide: 'none' }),
  D('arena', 'Star Arena', 'leisure', 2500, [20, 20], withG((g) => {
    for (let i = 0; i < 3; i++) g.add(mesh(new THREE.CylinderGeometry(10 - i * 0.2, 10, 1.2 + i * 1.2, 32, 1, true), MAT.stone, 0, (1.2 + i * 1.2) / 2, 0));
    g.add(cyl(8.5, 8.5, 0.1, MAT.soil, 0, 0.05, 0, 32));
  }), { collide: 'none' }),
  D('fishing_dock', 'Fishing Dock', 'leisure', 200, [3, 9], withG((g) => {
    g.add(box(2.6, 0.2, 9, MAT.wood, 0, 0.6, 4.5));
    for (let z = 0; z <= 9; z += 3) for (const x of [-1.2, 1.2]) g.add(cyl(0.12, 0.12, 3, MAT.darkWood, x, -0.8, z, 6));
    crates(g, 0.6, 1); lampBox(g, -1.1, 1.6, 8.5);
  }), { collide: 'none', water: true, slopeTol: 6 }),
  D('pavilion', 'Park Pavilion', 'leisure', 500, [9, 9], withG((g) => { g.add(cyl(4.5, 4.6, 0.4, MAT.stone, 0, 0.2, 0, 8)); columnsRing(g, 8, 4, 3.4, MAT.plaster); g.add(cone(5.2, 2.6, MAT.roofTeal, 0, 4.7, 0, 8)); bench(g, 0, 0, 0); }), { collide: 'none' }),
  D('tea_house', 'Tea House', 'leisure', 800, [8.7, 8.7], () => house({ w: 8, d: 8, roof: 'pagoda', roofMat: MAT.roofTeal, wall: MAT.darkWood })),
  D('farm', 'Moon Farm', 'farm', 600, [14, 12], withG((g) => {
    for (let i = 0; i < 6; i++) { g.add(box(1.4, 0.3, 8, MAT.soil, -5 + i * 1.8, 0.15, 1.5)); for (let k = 0; k < 6; k++) g.add(cone(0.3, 0.8, MAT.crop, -5 + i * 1.8, 0.7, -2 + k * 1.4, 5)); }
    add(g, house({ w: 5, d: 4, roofMat: MAT.roofTerra, wall: MAT.roofTerra }), 4.5, 0, -4);
  }), { collide: 'none' }),
  D('greenhouse', 'Greenhouse', 'farm', 550, [9, 7], withG((g) => { g.add(box(9, 0.3, 7, MAT.stone, 0, 0.15, 0)); g.add(box(8.6, 3.2, 6.6, MAT.glass, 0, 1.9, 0)); for (let i = 0; i < 5; i++) g.add(sph(0.6, MAT.leaf, -3 + i * 1.5, 0.9, 0)); })),
  D('orchard', 'Orchard', 'farm', 450, [14, 14], withG((g) => { for (let i = -1; i <= 1; i++) for (let k = -1; k <= 1; k++) tree(g, i * 4.5, k * 4.5, 1.1); }), { collide: 'none' }),
  D('enclosure', 'Animal Enclosure', 'farm', 300, [12, 12], withG((g) => {
    fenceLine(g, -6, -6, 6, -6); fenceLine(g, -6, -6, -6, 6); fenceLine(g, 6, -6, 6, 6); fenceLine(g, -6, 6, -1.5, 6); fenceLine(g, 1.5, 6, 6, 6);
    g.add(box(2, 0.5, 0.8, MAT.wood, -3, 0.25, -4));
  }), { collide: 'none' }),
  D('herb_garden', 'Herb Garden', 'farm', 200, [8, 6], withG((g) => { for (let i = 0; i < 3; i++) { g.add(box(2, 0.5, 5, MAT.wood, -2.6 + i * 2.6, 0.25, 0)); for (let k = 0; k < 4; k++) g.add(sph(0.3, i === 1 ? MAT.crystalTeal : MAT.crop, -2.6 + i * 2.6, 0.7, -1.8 + k * 1.2)); } }), { collide: 'none' }),
  D('portal', 'Star Portal', 'magical', 1500, [5, 3], withG((g) => {
    g.add(box(4, 0.4, 2, MAT.darkStone, 0, 0.2, 0));
    g.add(mesh(new THREE.TorusGeometry(2, 0.35, 10, 32), MAT.obsidian, 0, 2.6, 0));
    const d1 = mesh(new THREE.CircleGeometry(1.8, 32), MAT.portal, 0, 2.6, 0); g.add(d1);
    const d2 = mesh(new THREE.CircleGeometry(1.4, 32), MAT.portal, 0, 2.6, 0.02); g.add(d2);
    glow(g, 0, 2.6, 0, '#a855f7', 6, true); addLight(g, 0, 2.6, 1, '#a855f7', 6, 14, true);
    anim(g, (t) => { d1.rotation.z = t * 0.8; d2.rotation.z = -t * 1.3; d2.scale.setScalar(1 + Math.sin(t * 2) * 0.08); });
  }), { interact: 'portal' }),
  D('crystal_lab', 'Crystal Laboratory', 'magical', 1300, [9, 8], withG((g) => {
    add(g, house({ w: 8, d: 7, roofMat: MAT.roofViolet, wall: MAT.darkStone }));
    g.add(mesh(new THREE.SphereGeometry(2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.glass, 0, 6.2, 0));
    for (const x of [-3.8, 3.8]) { const c = mesh(new THREE.OctahedronGeometry(0.8), MAT.crystal, x, 1.2, 3); c.scale.y = 2; g.add(c); }
  })),
  D('wizard_tower', 'Wizard Tower', 'magical', 1700, [6.4, 6.4], withG((g) => {
    add(g, tower({ r: 2.6, h: 16, wall: MAT.darkStone, roofMat: MAT.roofViolet, crystal: true }));
    g.add(box(1.1, 2.1, 0.2, MAT.darkWood, 0, 1.05, 2.65));
    const rocks = [0, 1, 2].map(() => { const r = mesh(new THREE.DodecahedronGeometry(0.6), MAT.darkStone); g.add(r); return r; });
    anim(g, (t) => rocks.forEach((r, i) => { const a = t * 0.6 + (i * Math.PI * 2) / 3; r.position.set(Math.cos(a) * 4, 10 + Math.sin(t + i) * 0.6, Math.sin(a) * 4); r.rotation.y = t; }));
  })),
  D('summoning_circle', 'Summoning Circle', 'magical', 800, [9, 9], withG((g) => {
    g.add(mesh(new THREE.RingGeometry(3.4, 3.8, 48).rotateX(-Math.PI / 2), MAT.portal, 0, 0.08, 0));
    const inner = mesh(new THREE.RingGeometry(1.8, 2, 5).rotateX(-Math.PI / 2), MAT.portal, 0, 0.09, 0); g.add(inner);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.add(box(0.6, 2.2 + (i % 2), 0.4, MAT.obsidian, Math.sin(a) * 4.3, 1.1, Math.cos(a) * 4.3)); }
    orb(g, 1.8); anim(g, (t) => { inner.rotation.y = t * 0.4; });
  }), { collide: 'none' }),
  D('astral_observatory', 'Astral Observatory', 'magical', 2000, [8, 8], withG((g) => {
    add(g, tower({ r: 3, h: 11, wall: MAT.stone, flat: true }));
    const rings = [0, 1, 2].map((i) => { const r = mesh(new THREE.TorusGeometry(2.4 - i * 0.4, 0.08, 6, 40), MAT.gold, 0, 14, 0); g.add(r); return r; });
    orb(g, 14, '#05ce91', MAT.crystalTeal);
    anim(g, (t) => { rings[0].rotation.x = t * 0.5; rings[1].rotation.y = t * 0.7; rings[2].rotation.z = t * 0.9; });
  })),
  D('mystic_fountain', 'Mystic Fountain', 'magical', 600, [6, 6], withG((g) => fountain(g, 2.6, true)), { collide: 'circle' }),
  D('scorpion_statue', 'Scorpion Statue', 'decor', 250, [3, 4], withG((g) => scorpionStatue(g, 1)), { collide: 'circle' }),
  D('fountain', 'Fountain', 'decor', 200, [5.4, 5.4], withG((g) => fountain(g, 2.5)), { collide: 'circle' }),
  D('archway', 'Moon Archway', 'decor', 150, [6, 1.4], withG((g) => { g.add(box(1, 4, 1, MAT.stone, -2.5, 2, 0)); g.add(box(1, 4, 1, MAT.stone, 2.5, 2, 0)); g.add(mesh(new THREE.TorusGeometry(2.5, 0.5, 8, 16, Math.PI), MAT.stone, 0, 4, 0)); }), { collide: 'none' }),
  D('gazebo', 'Gazebo', 'decor', 300, [6, 6], withG((g) => { g.add(cyl(3, 3, 0.3, MAT.wood, 0, 0.15, 0, 6)); columnsRing(g, 6, 2.7, 3, MAT.plaster); g.add(cone(3.5, 2, MAT.roofViolet, 0, 4, 0, 6)); bench(g, 0, -1, 0); }), { collide: 'none' }),
  D('ruin_pillar', 'Ruined Pillar', 'decor', 60, [1.6, 1.6], withG((g) => { g.add(cyl(0.5, 0.6, 2.6, MAT.stone, 0, 1.3, 0, 10)); g.add(box(0.8, 0.5, 0.6, MAT.stone, 1, 0.25, 0.4)); }), { collide: 'circle' }),
  D('wall_segment', 'Stone Wall', 'decor', 40, [6, 0.8], withG((g) => { g.add(box(6, 2.2, 0.8, MAT.stone, 0, 1.1, 0)); for (let i = 0; i < 4; i++) g.add(box(0.8, 0.5, 0.9, MAT.stone, -2.4 + i * 1.6, 2.45, 0)); })),
  D('column', 'Column', 'decor', 40, [1.2, 1.2], withG((g) => { g.add(cyl(0.4, 0.45, 5, MAT.plaster, 0, 2.5, 0, 12)); g.add(box(1.1, 0.4, 1.1, MAT.plaster, 0, 5.2, 0)); }), { collide: 'circle' }),
  D('bench', 'Bench', 'decor', 25, [1.8, 0.6], withG((g) => bench(g, 0, 0, 0)), { collide: 'none' }),
  D('fence', 'Fence', 'decor', 15, [4, 0.3], withG((g) => fenceLine(g, -2, 0, 2, 0))),
  D('flag', 'Banner Flag', 'decor', 30, [0.6, 0.6], withG((g) => {
    g.add(cyl(0.06, 0.08, 5, MAT.darkWood, 0, 2.5, 0, 6));
    const f = new THREE.Group(); f.position.set(0, 4.4, 0); g.add(f);
    f.add(box(0.05, 1, 1.6, MAT.clothTeal, 0, 0, 0.8));
    anim(g, (t, n, w) => { f.rotation.y = Math.sin(t * 2.5) * 0.25 * (0.4 + w); });
  }), { collide: 'none' }),
  D('sign', 'Signpost', 'decor', 20, [0.8, 0.4], withG((g) => { g.add(cyl(0.07, 0.07, 1.8, MAT.darkWood, 0, 0.9, 0, 6)); g.add(box(1.2, 0.6, 0.08, MAT.wood, 0, 1.5, 0)); }), { collide: 'none', interact: 'sign' }),
  D('fire_pit', 'Fire Pit', 'decor', 60, [2.4, 2.4], withG((g) => {
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; g.add(mesh(new THREE.DodecahedronGeometry(0.28), MAT.darkStone, Math.cos(a) * 0.9, 0.15, Math.sin(a) * 0.9)); }
    const lg = box(1, 0.15, 0.15, MAT.darkWood, 0, 0.15, 0); lg.rotation.y = 0.7; g.add(lg);
    fire(g, 0, 0.1, 0, 0.9);
  }), { collide: 'circle' }),
  D('crystal_cluster', 'Crystal Cluster', 'decor', 80, [2, 2], withG((g) => { for (let i = 0; i < 5; i++) { const c = mesh(new THREE.OctahedronGeometry(0.4 + (i % 3) * 0.2), i % 2 ? MAT.crystal : MAT.crystalTeal, Math.sin(i * 2) * 0.6, 0.6, Math.cos(i * 2) * 0.6); c.scale.y = 2.4; c.rotation.z = (i - 2) * 0.2; g.add(c); } glow(g, 0, 1, 0, '#a855f7', 3); }), { collide: 'circle' }),
  D('tree', 'Duskleaf Tree', 'decor', 35, [2, 2], withG((g) => tree(g, 0, 0, 1.6, MAT.leafViolet)), { collide: 'circle' }),
  D('flower_bed', 'Flower Bed', 'decor', 20, [3, 1.6], withG((g) => { g.add(box(3, 0.4, 1.4, MAT.soil, 0, 0.2, 0)); for (let i = 0; i < 6; i++) g.add(sph(0.22, FL[i % 3], -1.2 + i * 0.48, 0.55, (i % 2) * 0.4 - 0.2)); }), { collide: 'none' }),
  D('rock_formation', 'Rock Formation', 'decor', 30, [3, 3], withG((g) => { g.add(mesh(new THREE.DodecahedronGeometry(1.4), MAT.darkStone, 0, 1, 0)); g.add(mesh(new THREE.DodecahedronGeometry(0.8), MAT.stone, 1.2, 0.5, 0.6)); }), { collide: 'circle' }),
  D('lantern', 'Lantern Post', 'lights', 30, [0.6, 0.6], withG((g) => { g.add(cyl(0.06, 0.08, 1.8, MAT.metal, 0, 0.9, 0, 6)); lampBox(g, 0, 1.95, 0, 0.3); }), { collide: 'none' }),
  D('torch', 'Torch', 'lights', 20, [0.4, 0.4], withG((g) => { g.add(cyl(0.05, 0.07, 1.6, MAT.darkWood, 0, 0.8, 0, 6)); fire(g, 0, 1.6, 0, 0.45); }), { collide: 'none' }),
  D('streetlamp', 'Streetlamp', 'lights', 60, [0.8, 0.8], withG((g) => { g.add(cyl(0.08, 0.12, 4, MAT.metal, 0, 2, 0, 8)); g.add(box(0.9, 0.08, 0.08, MAT.metal, 0.35, 3.9, 0)); lampBox(g, 0.7, 3.65, 0, 0.35); }), { collide: 'none' }),
  D('crystal_light', 'Crystal Light', 'lights', 70, [0.8, 0.8], withG((g) => { const c = mesh(new THREE.OctahedronGeometry(0.4), MAT.crystalTeal, 0, 0.9, 0); c.scale.y = 2; g.add(c); glow(g, 0, 0.9, 0, '#05ce91', 4); addLight(g, 0, 1, 0, '#05ce91', 4, 12); }), { collide: 'none' }),
  D('floating_orb', 'Floating Orb', 'lights', 90, [0.8, 0.8], withG((g) => orb(g, 2.2)), { collide: 'none' }),
  D('fire_basin', 'Fire Basin', 'lights', 80, [1.2, 1.2], withG((g) => { g.add(cyl(0.2, 0.3, 1, MAT.darkStone, 0, 0.5, 0, 8)); g.add(cyl(0.7, 0.3, 0.4, MAT.metal, 0, 1.2, 0, 12)); fire(g, 0, 1.3, 0, 0.7); }), { collide: 'circle' }),
];

export const DEFS = Object.fromEntries(CATALOG.map((d) => [d.id, d]));
export const footprint = (def, tier = 1) => (def.fpTier ? def.fpTier[tier - 1] : def.fp);