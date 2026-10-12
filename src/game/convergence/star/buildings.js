import * as THREE from 'three';
import { LOTS, CURB } from './layout';
import { G, U, lotFace, sideFace, exposed, windowRows, groundFloor, signAt, awning, terrace, winMat, windowAt } from './frontage';
import { SIGN } from './signs';
import { buildInterior } from './interiors';

// Thirteen-plus archetypes chosen per neighbourhood; no silhouette repeats three lots running.
const POOL = {
  south: [['row', 4], ['brickMid', 3], ['sandstone', 2], ['diner', 1], ['garage', 1], ['stuccoLow', 1]],
  core: [['tower', 4], ['masonry', 3], ['flagship', 1], ['noir', 1], ['white', 1], ['entertainment', 1], ['sandstone', 1]],
  palm: [['decoHotel', 4], ['streamline', 3], ['budget', 2], ['stuccoLow', 2]],
};
const SHOPS = { south: ['VINYL & VINE', 'MOTH BOUTIQUE', 'BODEGA 9', 'LUNA CUTS', 'THRIFT COMET', 'HOT WAX', 'PAWN & PLANET', 'KILN CERAMICS', 'THE BIKE HUB', 'NIGHT OWL BOOKS', 'LUCKY NOODLE', 'GRIT & GOLD'], core: ['MERIDIAN', 'SOLENNE', 'MAISON LYRA', 'VÉGA', 'ORBITAL CAFÉ', 'ELARA', 'KAIROS', 'LUMEN'], palm: ['SEA GLASS', 'PALMETTO', 'CORAL COVE', 'TIDE POOL', 'SUNDOWN', 'MARIPOSA', 'LAGUNA'] };
const KINDS = { south: ['records', 'boutique', 'comics', 'tattoo', 'bar', 'pizza', 'closed', 'gallery'], core: ['boutique', 'jewel', 'cafe', 'gallery', 'boutique'], palm: ['cafe', 'bar', 'boutique', 'cafe', 'lobby'] };
const LIGHT = { south: '#ffb56b', core: '#fff0d8', palm: '#ffc6d8' };
const pickW = (R, list) => { const tot = list.reduce((a, x) => a + x[1], 0); let r = R() * tot; for (const [k, w] of list) if ((r -= w) < 0) return k; return list[0][0]; };
const one = (R, a) => a[Math.floor(R() * a.length)];

export function buildBuildings(K) {
  const last = {};
  for (const l of LOTS) {
    const key = `${l.street}${Math.round(l.n[0] * 9)}${Math.round(l.n[1] * 9)}`, prev = last[key] || [];
    let a = l.venue?.arch || pickW(K.R, POOL[l.hood]);
    for (let i = 0; i < 6 && !l.venue && prev[0] === a && prev[1] === a; i++) a = pickW(K.R, POOL[l.hood]);
    last[key] = [a, prev[0]];
    K.stats.arch[a] = (K.stats.arch[a] || 0) + 1;
    (ARCH[a] || ARCH.row)(K, l, lotFace(K, l), K.R);
  }
}

// Shell: ground floor recessed 0.7 m for glazing depth (or a real interior), upper floors flush.
function body(K, l, c, mat, H, tile = 2.5) {
  const p0 = c.at(0, -l.d / 2 - 0.35), p1 = c.at(0, -l.d / 2);
  if (l.venue?.enter) buildInterior(K, l, c, mat);
  else { K.occ.box(mat, p0.x, G / 2, p0.z, l.w, G, l.d - 0.7, l.yaw, tile); K.e.colliders.addBox(l.x, l.z, l.w / 2, l.d / 2, l.yaw); }
  if (H > G) K.occ.box(mat, p1.x, G + (H - G) / 2, p1.z, l.w, H - G, l.d, l.yaw, tile);
  roof(K, c, l, H);
}
function roof(K, c, l, H) {
  const M = K.M, r = K.R();
  c.put(M.trimDark, 0, H + 0.4, -0.15, l.w, 0.8, 0.3);
  if (r < 0.5) c.put(M.steel, (K.R() - 0.5) * l.w * 0.5, H + 0.8, -l.d * 0.5, 2.2, 1.6, 1.6, 0);
  if (l.hood === 'south' && r > 0.7) { const p = c.at(l.w * 0.2, -l.d * 0.6); K.mg.add(M.wood, new THREE.CylinderGeometry(1.4, 1.4, 2.6, 10), p.x, H + 3.4, p.z); K.mg.add(M.wood, new THREE.ConeGeometry(1.5, 0.9, 10), p.x, H + 5.1, p.z); for (const s of [-1, 1]) c.put(M.iron, l.w * 0.2 + s, H + 1, -l.d * 0.6, 0.12, 2, 0.12, 0); }
}
// Side walls where the lot is open: upper windows, a wall light, and sometimes an old painted sign.
function sides(K, l, H, floors, style, seed) {
  for (const s of [-1, 1]) if (exposed(l, s)) {
    const c = sideFace(K, l, s);
    windowRows(K, c, l.d, G, floors, U, style, seed + s, l.hood, { gap: 3.4 });
    c.put(K.M.sconce, 0, 3.2, 0.05, 0.25, 0.35, 0.2, 0);
    const p = c.at(0, 0.06); K.spill.wash(p.x, 3, p.z, c.F.yaw, 4, 4, LIGHT[l.hood], 0.45);
    K.spill.pool(c.at(0, 2).x, CURB, c.at(0, 2).z, 4, LIGHT[l.hood], 0.35);
    if (l.hood === 'south' && K.R() < 0.35 && floors > 2) c.plane(K.signs.mat, 0, G + U * 1.2, 0.04, l.d * 0.7, 1.6, K.signs.quad(K.signs.text(one(K.R, ['GROCERY 1931', 'TAILOR', 'FURS · HATS', 'HARDWARE']), SIGN.board('rgba(0,0,0,0)', 'rgba(235,225,200,0.45)')), l.d * 0.7, 1.6));
  }
}
const shopName = (K, l) => l.venue?.name || one(K.R, SHOPS[l.hood]);
function shopBays(K, l, bigDoor) {
  const k = one(K.R, KINDS[l.hood]);
  if (l.w < 8) return [{ t: 'pier', w: 0.5 }, { t: 'shop', w: l.w - 2.6, kind: k }, { t: 'door', w: 1.6, kind: k }, { t: 'pier', w: 0.5 }];
  const b = [{ t: 'pier', w: 0.6 }, { t: 'shop', w: (l.w - 4) * 0.5, kind: k }, { t: 'door', w: bigDoor ? 2.6 : 1.8, kind: k }, { t: 'shop', w: (l.w - 4) * 0.5, kind: k }, { t: 'pier', w: 0.6 }];
  if (l.w > 16 && K.R() < 0.5) b.splice(4, 0, { t: 'blank', w: 1.6, poster: Math.floor(K.R() * 16) });
  return b;
}

const ARCH = {
  row(K, l, c, R) {
    const floors = 3 + Math.floor(R() * 3), H = G + U * (floors - 1), wall = one(R, [K.M.brickDark, K.M.brickRed, K.M.brickPaint]), seed = l.id;
    body(K, l, c, wall, H);
    groundFloor(K, c, l.w, wall, shopBays(K, l), { light: LIGHT.south, sign: { text: shopName(K, l), style: one(R, [SIGN.board('#1c2a3a', '#f0e2c0'), SIGN.neon('#ff5aa0'), SIGN.board('#7a2a22', '#fff'), SIGN.channel('#ffe6b0')]) } });
    windowRows(K, c, l.w, G, floors, U, 'iron', seed, 'south', { gap: l.w < 8 ? 2.4 : 2.8, ww: 1.1 });
    c.put(K.M.trimDark, 0, H - 0.1, 0.35, l.w + 0.3, 0.6, 0.7);
    if (l.w >= 6) fireEscape(K, c, l.w * 0.72, floors);
    for (let k = 1; k < floors; k++) if (R() < 0.35) c.put(K.M.steel, (R() - 0.5) * l.w * 0.6, G + U * (k - 1) + 1.1, 0.3, 0.7, 0.45, 0.55, 0);
    c.put(K.M.steel, l.w / 2 - 0.3, H / 2, 0.12, 0.1, H, 0.1, 0);
    if (R() < 0.5) awning(K, c, 0, l.w - 1.2, one(R, K.M.awnings));
    sides(K, l, H, floors, 'iron', seed);
  },
  brickMid(K, l, c, R) {
    const floors = 3 + Math.floor(R() * 3), H = G + U * (floors - 1), wall = one(R, [K.M.brickRed, K.M.brickDark]), seed = l.id + 5;
    body(K, l, c, wall, H);
    groundFloor(K, c, l.w, wall, shopBays(K, l), { light: LIGHT.south, frame: one(R, K.M.paint), sign: { text: shopName(K, l), style: one(R, [SIGN.board('#2f5d50', '#f4ead0'), SIGN.neon('#6dffc2'), SIGN.board('#e9dcc0', '#3a2a22')]) } });
    const shut = one(R, K.M.paint);
    for (let k = 1; k < floors; k++) {
      const y = G + U * (k - 1) + U * 0.52;
      if (l.w > 7 && k < floors - 1) {
        c.put(wall, 0, y, 0.45, 3.6, U - 0.4, 0.9); for (const u of [-1.1, 0, 1.1]) windowAt(K, c, u, y, 0.9, 1.8, 'band', winMat(K, seed, k, u + 2, 'south'));
        c.plane(winMat(K, seed, k, 9, 'south'), 0, y, 0.92, 2.8, 1.8);
      }
      for (const u of l.w > 7 ? [-l.w / 2 + 1.4, l.w / 2 - 1.4] : [0]) { windowAt(K, c, u, y, 1.1, 1.9, 'sash', winMat(K, seed, k, u, 'south')); for (const s of [-1, 1]) c.put(shut, u + s * 0.9, y, 0.08, 0.5, 1.9, 0.05, 0); }
    }
    c.put(K.M.trim, 0, H - 0.3, 0.3, l.w + 0.3, 0.5, 0.6);
    sides(K, l, H, floors, 'sash', seed);
  },
  sandstone(K, l, c, R) {
    const floors = l.hood === 'core' ? 6 + Math.floor(R() * 4) : 3 + Math.floor(R() * 3), H = G + U * (floors - 1), seed = l.id + 9;
    body(K, l, c, K.M.sandstone, H);
    const room = l.venue?.name === 'THE CONSTELLATION ROOM';
    groundFloor(K, c, l.w, K.M.granite, shopBays(K, l, room), { light: room ? '#c77dff' : LIGHT[l.hood], door: room ? K.M.neon.violet : K.M.bronze, sign: { text: shopName(K, l), style: room ? SIGN.neon('#e7a6ff') : SIGN.lux('#f4e3c0') } });
    windowRows(K, c, l.w, G, floors, U, 'carved', seed, l.hood, { gap: 2.9 });
    for (let k = 2; k < floors; k += 2) c.put(K.M.sandstone, 0, G + U * (k - 1), 0.15, l.w + 0.2, 0.25, 0.3);
    c.put(K.M.sandstone, 0, H - 0.2, 0.55, l.w + 0.6, 0.7, 1.1);
    for (const s of [-1, 1]) c.put(K.M.limestone, s * (l.w / 2 - 0.3), H / 2, 0.1, 0.7, H, 0.2);
    if (room) { c.put(K.M.neon.violet, 0, 3.9, 0.3, 3.4, 0.08, 0.08, 0); K.pool.add(c.at(0, 2).x, 3, c.at(0, 2).z, '#c77dff', 6, 12); }
    sides(K, l, H, floors, 'carved', seed);
  },
  theater(K, l, c, R) {
    const floors = 3 + Math.floor(R() * 3), H = G + U * (floors - 1) + 2, M = K.M, seed = l.id + 3, name = shopName(K, l);
    body(K, l, c, l.hood === 'core' ? M.brickRed : one(R, [M.brickRed, M.brickDark]), H);
    const bays = [{ t: 'pier', w: 0.8 }, { t: 'blank', w: 1.6, poster: seed % 16 }, { t: 'door', w: 2.2, kind: 'lobby' }, { t: 'door', w: 2.2, kind: 'lobby' }, { t: 'door', w: 2.2, kind: 'lobby' }, { t: 'blank', w: 1.6, poster: (seed + 5) % 16 }, { t: 'pier', w: 0.8 }];
    groundFloor(K, c, l.w, M.brickRed, bays, { light: '#ffcf8a' });
    marquee(K, c, Math.min(l.w - 2, 14), name, 'ribbon' in K && false);
    windowRows(K, c, l.w, G + 1.5, floors, U, 'sash', seed, l.hood, { gap: 3.2, ww: 1.4, wh: 2.4 });
    const bp = c.at(l.w / 2 - 1.2, 1.1); K.mg.add(M.signs || K.signs.mat, K.signs.quad(K.signs.blade(name.replace(/^THE /, ''), '#ffe7b0', '#7a1b1b'), 1.1, Math.min(8, H - G - 1)), bp.x, G + Math.min(8, H - G - 1) / 2 + 2.5, bp.z, 0, l.yaw + Math.PI / 2);
    c.put(M.bulbs, l.w / 2 - 1.2, G + 2.5 + Math.min(8, H - G - 1) / 2, 1.1, 0.08, Math.min(8, H - G - 1), 1.2, 0);
    if (l.venue?.name === 'THE NOVA GRAND') { const p = c.at(-l.w / 2 + 2.4, 1.2); K.mg.box(M.bronze, p.x, CURB + 1.3, p.z, 1.6, 2.6, 1.4, l.yaw, 0); c.plane(M.interiors.lobby, -l.w / 2 + 2.4, CURB + 1.6, 1.92, 1.1, 0.9); }
    K.interact.push({ x: c.at(-l.w / 2 + 1.2, 1).x, z: c.at(-l.w / 2 + 1.2, 1).z, verb: 'Inspect', label: `${name} poster`, text: `${name}: tonight's show — a fictional production. Tickets are decorative only.` });
    sides(K, l, H, floors, 'sash', seed);
  },
  cinema(K, l, c, R) {
    ARCH.theater(K, l, c, R);
    const H = G + U * 3;
    K.screens.add(c.at(0, 0.3).x, G + 4.2, c.at(0, 0.3).z, l.yaw, Math.min(8, l.w - 3), 3.4, 'arts', '#b99bff');
    c.put(K.M.neon.cyan, 0, H - 0.3, 0.3, l.w - 1, 0.1, 0.1, 0);
  },
  flagship(K, l, c, R) {
    const M = K.M, floors = 6 + Math.floor(R() * 4), H = G + U * (floors - 1), name = shopName(K, l), glassH = G + U * 2;
    const p = c.at(0, -l.d / 2 - 1.5);
    K.occ.box(M.stonePale, p.x, glassH / 2, p.z, l.w, glassH, l.d - 3, l.yaw, 3);
    K.occ.box(M.stonePale, c.at(0, -l.d / 2).x, glassH + (H - glassH) / 2, c.at(0, -l.d / 2).z, l.w, H - glassH, l.d, l.yaw, 3);
    K.e.colliders.addBox(l.x, l.z, l.w / 2, l.d / 2, l.yaw);
    c.plane(M.interiors.boutique, 0, glassH / 2 + 0.2, -2.96, l.w - 1.4, glassH - 0.6);
    c.plane(M.storeGlass, 0, glassH / 2 + 0.1, -0.15, l.w - 1.2, glassH - 0.4);
    for (let i = 0; i <= 6; i++) c.put(M.bronze, -l.w / 2 + 0.6 + (i * (l.w - 1.2)) / 6, glassH / 2, 0.05, 0.14, glassH, 0.5, 0);
    for (const s of [-1, 1]) c.put(M.stonePale, s * (l.w / 2 - 0.3), glassH / 2, -0.1, 0.6, glassH, 0.6);
    c.put(M.stonePale, 0, G + 0.2, -1.5, l.w - 0.6, 0.35, 2.8);
    for (let i = 0; i < 5; i++) mannequin(K, c, -l.w / 2 + 2.2 + i * ((l.w - 4.4) / 4), -1.6, i % 2 ? CURB : G + 0.4);
    for (let i = 0; i < 4; i++) { K.pool.add(c.at(-l.w / 3 + i * l.w / 4.5, -1).x, 3.4, c.at(-l.w / 3 + i * l.w / 4.5, -1).z, '#fff2dc', 5, 12); }
    K.spill.pool(c.at(0, 3).x, CURB, c.at(0, 3).z, l.w * 0.45, '#fff0d8', 0.5);
    signAt(K, c, 0, glassH + 1.2, 0.2, Math.min(12, l.w * 0.6), 1.4, name, SIGN.lux('#f6e7c8'));
    windowRows(K, c, l.w, glassH, floors - 2, U, 'band', l.id, 'core', { from: 0, ww: 2.4, wh: 2.4, gap: 3.2 });
    K.interact.push({ x: c.at(0, 1.5).x, z: c.at(0, 1.5).z, verb: 'View', label: `${name} display`, text: `${name}: sculpted couture on bronze plinths — the window is display only.` });
    roof(K, c, l, H);
  },
  noir(K, l, c, R) {
    const M = K.M, floors = 6 + Math.floor(R() * 3), H = G + U * (floors - 1), name = shopName(K, l), seed = l.id + 11;
    body(K, l, c, M.marbleBlack, H, 3);
    const kind = name === 'PRISM VAULT' ? 'jewel' : 'boutique';
    groundFloor(K, c, l.w, M.marbleBlack, [{ t: 'pier', w: 1 }, { t: 'shop', w: l.w * 0.3, kind, light: '#fff6e0' }, { t: 'door', w: 2, kind }, { t: 'shop', w: l.w * 0.3, kind, light: '#fff6e0' }, { t: 'pier', w: 1 }], { frame: M.bronze, door: M.gold, light: '#fff6e0', sign: { text: name, style: SIGN.lux('#e8c27a') } });
    for (let k = 1; k < floors; k++) for (let i = 0; i < Math.floor(l.w / 2.2); i++) { const u = -l.w / 2 + 1.1 + i * 2.2; c.plane(winMat(K, seed, k, i, 'core'), u, G + U * (k - 1) + U / 2, 0.06, 0.5, U - 0.6); c.put(M.bronze, u + 0.35, G + U * (k - 1) + U / 2, 0.08, 0.06, U - 0.4, 0.1, 0); }
    if (name === 'PRISM VAULT') { const p = c.at(0, 0.9); const gem = new THREE.OctahedronGeometry(1.1, 0); K.mg.add(M.storeGlass, gem, p.x, G + 1.8, p.z); K.mg.add(M.neon.cyan, new THREE.OctahedronGeometry(0.35, 0), p.x, G + 1.8, p.z); K.pool.add(p.x, G + 1.8, p.z, '#bfefff', 6, 12); }
    c.put(M.bronze, 0, H - 0.2, 0.2, l.w, 0.3, 0.4);
    sides(K, l, H, floors, 'band', seed);
  },
  white(K, l, c, R) {
    const M = K.M, floors = 5 + Math.floor(R() * 3), H = G + U * (floors - 1), name = shopName(K, l), seed = l.id + 13;
    body(K, l, c, M.stoneWhite, H, 3);
    if (!l.venue?.enter) {
      groundFloor(K, c, l.w, M.stoneWhite, [{ t: 'pier', w: 1 }, { t: 'shop', w: l.w - 5, kind: 'boutique', light: '#fffaf0' }, { t: 'door', w: 2, kind: 'boutique' }, { t: 'pier', w: 1 }], { frame: M.chrome, light: '#fffaf0' });
      for (let i = 0; i < 9; i++) { const p = c.at(-l.w / 4 + Math.cos(i * 0.7) * 1.2, -0.5 + Math.sin(i * 0.7) * 0.15); K.mg.add(M.stoneWhite, new THREE.BoxGeometry(1.2, 0.12, 0.4), p.x, CURB + 0.3 + i * 0.36, p.z, 0, l.yaw + i * 0.35); }
    }
    signAt(K, c, 0, G - 0.45, 0.12, Math.min(9, l.w * 0.7), 1, name, SIGN.lux('#9a8a6a'));
    for (let k = 1; k < floors; k++) for (let i = 0; i < Math.floor((l.w - 1) / 3.2); i++) {
      const u = -((Math.floor((l.w - 1) / 3.2) - 1) * 3.2) / 2 + i * 3.2, y = G + U * (k - 1) + U * 0.45;
      windowAt(K, c, u, y, 1.6, 1.8, 'band', winMat(K, seed, k, i, 'core'));
      const p = c.at(u, 0.1); K.mg.add(M.stoneWhite, new THREE.TorusGeometry(0.8, 0.12, 6, 14, Math.PI), p.x, y + 0.9, p.z, 0, l.yaw);
    }
    sides(K, l, H, floors, 'band', seed);
  },
  tower(K, l, c, R) {
    const M = K.M, floors = 10 + Math.floor(R() * 16), H = G + U * (floors - 1), cur = one(R, [M.curtainCool, M.curtainWarm, M.curtainMix]), podium = G + U;
    body(K, l, c, one(R, [M.limestone, M.granite]), podium);
    groundFloor(K, c, l.w, M.granite, shopBays(K, l, true), { light: LIGHT.core, frame: M.steel, sign: { text: shopName(K, l), style: SIGN.channel('#ffffff') } });
    windowRows(K, c, l.w, G, 2, U, 'band', l.id, 'core', { ww: 2.6, wh: 2.2, gap: 3.2 });
    const set = Math.floor(floors * (0.55 + R() * 0.25)), h1 = U * set, h2 = H - podium - h1, inset = 2 + R() * 2;
    const a = c.at(0, -l.d / 2 - 1), b = c.at(0, -l.d / 2 - 1 - inset / 2);
    K.occ.box(cur, a.x, podium + h1 / 2, a.z, l.w - 2, h1, l.d - 2, l.yaw, 24);
    if (h2 > 3) K.occ.box(cur, b.x, podium + h1 + h2 / 2, b.z, l.w - 2 - inset, h2, l.d - 2 - inset, l.yaw, 24);
    for (let k = 0; k < set; k += 3) c.put(M.steel, 0, podium + k * U, -1, l.w - 1.8, 0.2, 0.3, 0);
    c.put(M.neon.white, 0, H - 0.4, -1 - inset + 0.1, l.w - 2 - inset, 0.25, 0.08, 0);
    const q = c.at(0, -l.d / 2 - 1 - inset / 2);
    K.mg.box(M.steel, q.x, H + 1, q.z, (l.w - 2 - inset) * 0.5, 2, (l.d - 2 - inset) * 0.5, l.yaw, 0);
    K.pool.add(c.at(0, 2).x, 4, c.at(0, 2).z, '#e8f0ff', 5, 14);
  },
  masonry(K, l, c, R) {
    const M = K.M, floors = 6 + Math.floor(R() * 6), H = G + U * (floors - 1), wall = one(R, [M.limestone, M.brickRed, M.limestone]), seed = l.id + 17;
    body(K, l, c, wall, H);
    groundFloor(K, c, l.w, M.granite, shopBays(K, l), { light: LIGHT.core, frame: M.bronze, sign: { text: shopName(K, l), style: one(R, [SIGN.lux('#f2e1bd'), SIGN.channel('#fff4dd')]) } });
    windowRows(K, c, l.w, G, floors, U, 'sash', seed, 'core', { gap: 2.6, ww: 1.2, wh: 2.1 });
    c.put(M.trim, 0, G + U * (floors - 2), 0.35, l.w + 0.4, 0.4, 0.7);
    c.put(M.trim, 0, H - 0.2, 0.45, l.w + 0.8, 0.6, 0.9);
    if (K.R() < 0.4) awning(K, c, 0, l.w * 0.6, K.M.canvas);
    sides(K, l, H, floors, 'sash', seed);
  },
  entertainment(K, l, c, R) {
    const M = K.M, floors = 7 + Math.floor(R() * 3), H = G + U * (floors - 1), name = shopName(K, l);
    body(K, l, c, M.brickDark, H);
    groundFloor(K, c, l.w, M.steel, [{ t: 'pier', w: 0.6 }, { t: 'roll', w: 3.4 }, { t: 'door', w: 2.4, kind: 'bar' }, { t: 'door', w: 2.4, kind: 'bar' }, { t: 'shop', w: 4, kind: 'bar', light: '#ff9ad8' }, { t: 'blank', w: 1.6, poster: 13 }, { t: 'pier', w: 0.6 }], { light: '#ff9ad8' });
    const p = c.at(0, 2.2); K.mg.box(M.iron, p.x, G - 0.6, p.z, l.w - 1, 0.5, 4.4, l.yaw, 0);
    for (let i = 0; i < Math.floor(l.w / 1.6); i++) for (const d of [0.8, 2.2, 3.6]) c.put(M.downlight, -l.w / 2 + 1 + i * 1.6, G - 0.88, d, 0.2, 0.04, 0.2, 0);
    K.screens.add(c.at(0, 4.45).x, G - 0.6, c.at(0, 4.45).z, l.yaw, l.w - 1.2, 0.5, 'ribbon', '#ffcc4a');
    K.screens.add(c.at(-l.w * 0.2, 0.25).x, G + 5.5, c.at(-l.w * 0.2, 0.25).z, l.yaw, l.w * 0.5, l.w * 0.28, 'live', '#6ff0ff');
    K.screens.add(c.at(l.w * 0.3, 0.45).x, G + 9, c.at(l.w * 0.3, 0.45).z, l.yaw, l.w * 0.3, l.w * 0.3 * 0.56, 'music', '#ff7ae0');
    signAt(K, c, 0, G + 1.4, 0.3, Math.min(12, l.w * 0.8), 1.5, name, SIGN.neon('#ff4fa3'));
    for (let i = 0; i < 6; i++) { const q = c.at(-l.w / 2 + 2 + i * 1.6, 3.8); K.mg.add(M.chrome, new THREE.CylinderGeometry(0.04, 0.05, 1, 6), q.x, CURB + 0.5, q.z); if (i < 5) c.put(M.neon.red, -l.w / 2 + 2.8 + i * 1.6, CURB + 0.9, 3.8, 1.6, 0.06, 0.03, 0); }
    windowRows(K, c, l.w, G, floors, U, 'band', l.id, 'core', { from: 4, gap: 3.4, ww: 2.4 });
    K.interact.push({ x: c.at(0, 2).x, z: c.at(0, 2).z, verb: 'Inspect', label: `${name} line-up`, text: `${name}: tonight — Luna Vex, The Comet Kids (fictional acts).` });
    sides(K, l, H, floors, 'band', l.id);
  },
  decoHotel(K, l, c, R) {
    const M = K.M, floors = 3 + Math.floor(R() * 4), fh = 3.1, H = G + fh * (floors - 1), name = shopName(K, l), seed = l.id + 21;
    const wall = name === 'HOTEL AFTERGLOW' ? M.stuccoPeach : name === 'THE PEARL CURRENT' ? M.stuccoWhite : one(R, [M.stuccoPeach, M.stuccoMint, M.stuccoBlue, M.stuccoPink, M.stuccoWhite]);
    const neon = one(R, [M.neon.pink, M.neon.cyan, M.neon.mint]), col = neon.color.getStyle();
    body(K, l, c, wall, H);
    groundFloor(K, c, l.w, wall, [{ t: 'pier', w: 0.6 }, { t: 'shop', w: l.w * 0.35, kind: 'cafe', light: '#ffd6a8' }, { t: 'door', w: 2.4, kind: 'lobby' }, { t: 'shop', w: l.w * 0.35, kind: 'bar', light: '#ffc6d8' }, { t: 'pier', w: 0.6 }], { light: '#ffd0c0', frame: M.chrome });
    for (let k = 1; k < floors; k++) for (const u of [-l.w * 0.32, -l.w * 0.18, l.w * 0.18, l.w * 0.32]) windowAt(K, c, u, G + fh * (k - 1) + fh * 0.5, 1.2, 1.6, k === floors - 1 && Math.abs(u) < l.w * 0.2 ? 'port' : 'deco', winMat(K, seed, k, u, 'palm'));
    c.put(wall, 0, H + 1.2, 0, l.w * 0.5, 2.4, 0.3); c.put(wall, 0, H + 2.8, 0, l.w * 0.25, 1.2, 0.3);
    c.put(neon, 0, H + 3.45, 0.2, l.w * 0.25, 0.08, 0.08, 0); c.put(neon, 0, H + 2.45, 0.2, l.w * 0.5, 0.08, 0.08, 0);
    const fin = Math.min(H - 1, 9), fp = c.at(0, 0.7);
    K.mg.box(wall, fp.x, G + fin / 2, fp.z, 0.4, fin, 1.2, l.yaw, 0);
    for (const s of [-1, 1]) { const q = c.at(s * 0.21, 0.9); K.mg.add(K.signs.mat, K.signs.quad(K.signs.blade('HOTEL', col, '#1b1420'), 1, fin * 0.9), q.x, G + fin / 2, q.z, 0, l.yaw + s * Math.PI / 2); }
    c.plane(M.winHome, l.w * 0.08 + 0.6, G + fin / 2, 0.06, 0.6, fin);
    K.pool.add(c.at(0, 2).x, G + 2, c.at(0, 2).z, col, 7, 16); K.spill.pool(c.at(0, 3).x, CURB, c.at(0, 3).z, 5, col, 0.45);
    signAt(K, c, 0, G - 0.45, 0.14, Math.min(l.w * 0.7, 10), 1, name, SIGN.neon(col === '#6dffc2' ? '#aaffe0' : col));
    awning(K, c, -l.w * 0.3, l.w * 0.3, one(R, K.M.awnings)); awning(K, c, l.w * 0.3, l.w * 0.3, one(R, K.M.awnings));
    if (l.cafe) terrace(K, c, 0, l.w - 2, l.id);
    sides(K, l, H, floors, 'deco', seed);
  },
  streamline(K, l, c, R) {
    const M = K.M, floors = 3 + Math.floor(R() * 3), fh = 3.1, H = G + fh * (floors - 1), name = shopName(K, l), wall = one(R, [M.stuccoWhite, M.stuccoBlue, M.stuccoMint]), seed = l.id + 23;
    body(K, l, c, wall, H);
    for (const s of [-1, 1]) { const p = c.at(s * (l.w / 2 - 1.4), -1.4); K.mg.add(wall, new THREE.CylinderGeometry(1.5, 1.5, H, 18), p.x, H / 2, p.z); }
    groundFloor(K, c, l.w - 3, wall, [{ t: 'shop', w: 4, kind: name === 'SUNSET SODA' ? 'cafe' : 'bar', light: '#9ee8ff' }, { t: 'door', w: 2, kind: 'lobby' }, { t: 'shop', w: 4, kind: 'cafe', light: '#ffd6a8' }], { frame: M.chrome, light: '#bfefff' });
    for (let k = 1; k < floors; k++) { const y = G + fh * (k - 1); c.put(M.trim, 0, y + 0.1, 0.25, l.w - 2.6, 0.18, 0.5); for (let i = 0; i < 3; i++) windowAt(K, c, -l.w * 0.28 + i * l.w * 0.28, y + fh * 0.55, l.w * 0.22, 1.2, 'band', winMat(K, seed, k, i, 'palm')); c.put(M.chrome, 0, y + fh * 0.2, 0.55, l.w - 3, 0.05, 0.05, 0); }
    c.put(M.neon.cyan, 0, H - 0.2, 0.3, l.w - 3, 0.1, 0.1, 0);
    signAt(K, c, 0, G - 0.5, 0.15, Math.min(l.w * 0.6, 9), 1, name, SIGN.neon(one(R, ['#3ff0ff', '#ff4fa3', '#ffb03a'])));
    if (l.cafe) terrace(K, c, 0, l.w - 3, l.id + 1);
    sides(K, l, H, floors, 'band', seed);
  },
  budget(K, l, c, R) {
    const M = K.M, floors = 2 + Math.floor(R() * 3), fh = 3, H = G + fh * (floors - 1), name = shopName(K, l), wall = one(R, [M.stuccoWorn, M.stuccoGrey, M.stuccoPink]), seed = l.id + 29;
    body(K, l, c, wall, H);
    groundFloor(K, c, l.w, wall, [{ t: 'pier', w: 0.5 }, { t: 'shop', w: l.w * 0.45, kind: 'cafe', light: '#ffcf94' }, { t: 'door', w: 1.8, kind: 'lobby' }, { t: 'blank', w: 1.4 }, { t: 'pier', w: 0.5 }], { light: '#ffcf94' });
    for (let k = 1; k < floors; k++) {
      const y = G + fh * (k - 1);
      c.put(M.concreteWorn, 0, y + 0.1, 0.8, l.w, 0.2, 1.6); c.put(M.iron, 0, y + 1.1, 1.55, l.w, 0.06, 0.06, 0);
      for (let i = 0; i < l.w / 1.2; i++) c.put(M.iron, -l.w / 2 + i * 1.2, y + 0.6, 1.55, 0.04, 1, 0.04, 0);
      for (let i = 0; i < Math.floor(l.w / 3.4); i++) { const u = -l.w / 2 + 1.7 + i * 3.4; c.plane(one(R, M.paint), u - 0.6, y + 1.2, 0.05, 0.9, 2.1); windowAt(K, c, u + 0.6, y + 1.5, 1, 1, 'band', winMat(K, seed, k, i, 'palm')); c.put(M.sconce, u, y + 2.3, 0.1, 0.18, 0.18, 0.12, 0); }
      K.spill.pool(c.at(0, 0.8).x, y + 0.2, c.at(0, 0.8).z, 3, '#ffc27a', 0.2);
    }
    const uv = K.signs.text(name, SIGN.neon(one(R, ['#ff5a5a', '#ff9ad8', '#6dffc2'])));
    c.plane(K.signs.mat, 0, H + 1, 0.2, Math.min(l.w * 0.8, 9), 1.3, K.signs.quad([uv[0], uv[1], uv[0] + (uv[2] - uv[0]) * 0.72, uv[3]], Math.min(l.w * 0.8, 9) * 0.72, 1.3));
    c.put(M.stuccoGrey, l.w * 0.3, H + 1, 0.12, 2, 1.1, 0.1);
    awning(K, c, -l.w * 0.2, l.w * 0.45, M.awnings[5]);
    if (l.cafe) terrace(K, c, -l.w * 0.2, l.w * 0.5, l.id + 2);
    sides(K, l, H, floors, 'band', seed);
  },
  stuccoLow(K, l, c, R) {
    const M = K.M, floors = 2, H = G + U, wall = l.hood === 'palm' ? one(R, [M.stuccoPink, M.stuccoMint, M.stuccoPeach]) : one(R, [M.stuccoWorn, M.stuccoGrey]), seed = l.id + 31;
    body(K, l, c, wall, H);
    groundFloor(K, c, l.w, wall, shopBays(K, l), { light: LIGHT[l.hood], sign: { text: shopName(K, l), style: SIGN.board(one(R, ['#2e7a5a', '#1f5f8a', '#b8323a']), '#fff6e0') } });
    windowRows(K, c, l.w, G, floors, U, 'deco', seed, l.hood);
    awning(K, c, 0, l.w - 1, one(R, M.awnings));
    if (l.cafe) terrace(K, c, 0, l.w - 2, l.id + 3);
    sides(K, l, H, floors, 'deco', seed);
  },
  diner(K, l, c, R) {
    const M = K.M, floors = 2 + Math.floor(R() * 2), H = G + U * (floors - 1), name = shopName(K, l), seed = l.id + 37;
    body(K, l, c, M.brickRed, H);
    const pizza = name === 'SOLAR SLICE';
    if (!l.venue?.enter) groundFloor(K, c, l.w, M.chrome, [{ t: 'pier', w: 0.3 }, { t: 'shop', w: l.w - 2.2, kind: pizza ? 'pizza' : 'cafe', light: '#ffe0b0' }, { t: 'door', w: 1.6, kind: 'cafe' }, { t: 'pier', w: 0.3 }], { light: '#ffe0b0', frame: M.chrome, base: M.paint[1] });
    for (const y of [CURB + 0.55, G - 0.95]) c.put(M.chrome, 0, y, 0.1, l.w, 0.14, 0.2, 0);
    signAt(K, c, 0, G + 0.9, 0.3, Math.min(l.w * 0.8, 8), 1.2, name, SIGN.neon(pizza ? '#ffb03a' : '#ff4f6a'));
    windowRows(K, c, l.w, G, floors, U, 'iron', seed, 'south', { gap: 2.6 });
    if (pizza) { K.amb.add('vapor', c.at(-0.8, 0.4).x, 3.2, c.at(-0.8, 0.4).z, '#e6e0da', 2); for (let i = 0; i < 3; i++) { const q = c.at(-l.w / 2 + 1 + i, 0.9); K.mg.add(M.chrome, new THREE.CylinderGeometry(0.2, 0.05, 0.75, 8), q.x, CURB + 0.38, q.z); K.seats.push({ x: q.x, z: q.z, yaw: l.yaw + Math.PI, y: CURB + 0.78 }); } }
    sides(K, l, H, floors, 'iron', seed);
  },
  garage(K, l, c, R) {
    const M = K.M, floors = 2 + Math.floor(R() * 2), H = G + U * (floors - 1), name = shopName(K, l), wall = one(R, [M.brickPaint, M.stuccoGrey, M.brickDark]), arcade = name === 'SIDEQUEST ARCADE';
    body(K, l, c, wall, H);
    if (!l.venue?.enter) groundFloor(K, c, l.w, wall, [{ t: 'pier', w: 0.5 }, { t: 'roll', w: 3.6 }, { t: 'roll', w: 3.6 }, { t: 'door', w: 1.2, kind: 'closed' }, { t: 'pier', w: 0.5 }], { light: '#dfe6ff' });
    c.put(M.concrete, 0, CURB + 0.35, 0.6, l.w * 0.6, 0.7, 1.2);
    windowRows(K, c, l.w, G, floors, U, 'iron', l.id, 'south', { gap: 3 });
    if (arcade) { signAt(K, c, 0, G + 0.7, 0.3, Math.min(10, l.w * 0.8), 1.4, name, SIGN.neon('#b06bff')); K.screens.add(c.at(0, 0.2).x, G + 3.2, c.at(0, 0.2).z, l.yaw, 4.2, 2.36, 'arts', '#b06bff'); }
    else if (K.R() < 0.6) c.plane(K.signs.mat, 0, G + 0.6, 0.1, 5, 0.9, K.signs.quad(K.signs.text(one(K.R, ['LOADING ZONE', 'NO PARKING', 'SERVICE ONLY']), SIGN.board('#d8b43a', '#1a1a1a')), 5, 0.9));
    sides(K, l, H, floors, 'iron', l.id);
  },
};

// An iron fire escape zig-zagging up a Southstar façade.
function fireEscape(K, c, w, floors) {
  const M = K.M;
  for (let k = 1; k < floors; k++) {
    const y = G + U * (k - 1) + 0.05;
    c.put(M.iron, 0, y, 0.7, w, 0.06, 1.3, 0);
    c.put(M.iron, 0, y + 1, 1.33, w, 0.05, 0.05, 0);
    for (let i = 0; i <= w / 0.6; i++) c.put(M.iron, -w / 2 + i * 0.6, y + 0.5, 1.33, 0.03, 1, 0.03, 0);
    if (k < floors - 1) { const p = c.at(0, 0.7); K.mg.box(M.iron, p.x, y + U / 2, p.z, Math.hypot(w * 0.5, U), 0.06, 0.6, c.F.yaw, 0, 0, (k % 2 ? 1 : -1) * Math.atan2(U, w * 0.5)); }
  }
}
function marquee(K, c, w, name) {
  const M = K.M, p = c.at(0, 1.8);
  K.mg.box(M.bronze, p.x, G + 0.4, p.z, w, 1.5, 3.6, c.F.yaw, 0);
  for (let i = 0; i < Math.floor(w / 0.8); i++) for (const d of [0.6, 1.6, 2.6]) c.put(M.bulbs, -w / 2 + 0.4 + i * 0.8, G - 0.38, d, 0.16, 0.08, 0.16, 0);
  c.put(M.bulbs, 0, G + 1.18, 3.62, w, 0.1, 0.06, 0); c.put(M.bulbs, 0, G - 0.32, 3.62, w, 0.1, 0.06, 0);
  c.plane(K.signs.mat, 0, G + 0.42, 3.63, w - 0.4, 1.2, K.signs.quad(K.signs.text(name, SIGN.marquee()), w - 0.4, 1.2));
  K.pool.add(c.at(0, 3).x, G - 0.8, c.at(0, 3).z, '#ffd58a', 9, 16);
  K.spill.pool(c.at(0, 2.5).x, CURB, c.at(0, 2.5).z, w * 0.5 + 1, '#ffd58a', 0.7);
  K.spill.wash(c.at(0, 0.08).x, G + 2.2, c.at(0, 0.08).z, c.F.yaw, w, 4, '#ffcf8a', 0.4);
}
function mannequin(K, c, u, d, y) {
  const p = c.at(u, d), M = K.M;
  K.mg.add(M.stonePale, new THREE.CylinderGeometry(0.5, 0.55, 0.4, 14), p.x, y + 0.2, p.z);
  K.mg.add(M.stoneWhite, new THREE.CylinderGeometry(0.16, 0.24, 1.1, 10), p.x, y + 1.3, p.z);
  K.mg.add(M.stoneWhite, new THREE.SphereGeometry(0.12, 10, 8), p.x, y + 2, p.z);
  K.mg.add(one(K.R, [M.paint[1], M.paint[4], M.gold, M.paint[2]]), new THREE.ConeGeometry(0.42, 1.1, 12, 1, true), p.x, y + 1.05, p.z);
}
export { mannequin };