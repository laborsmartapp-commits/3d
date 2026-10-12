import * as THREE from 'three';
import { CURB } from './layout';
import { G } from './frontage';
import { SIGN } from './signs';

// Enterable venues: a real room behind the storefront — walls, a doorway with open leaves, floor,
// ceiling lights and furnishings — walled with colliders and camera occluders so nothing clips.
export function buildInterior(K, l, c, wall) {
  const M = K.M, W = l.w, D = l.d, t = 0.3, door = 2.4, side = (W - door) / 2, kind = l.venue.enter, name = l.venue.name;
  const solid = (mat, u, d, w, dd, h = G, y = h / 2) => { const p = c.at(u, d); K.occ.box(mat, p.x, y, p.z, w, h, dd, l.yaw, 2.5); K.e.colliders.addBox(p.x, p.z, w / 2, dd / 2, l.yaw); };
  const box = (mat, u, d, y, w, h, dd, tile = 0) => { const p = c.at(u, d); K.mg.box(mat, p.x, y, p.z, w, h, dd, l.yaw, tile); };
  const flat = (mat, u, d, y, w, dd) => { const p = c.at(u, d); K.mg.add(mat, new THREE.PlaneGeometry(w, dd).rotateX(-Math.PI / 2), p.x, y, p.z, 0, l.yaw); };
  const back = (mat, u, y, w, h) => c.plane(mat, u, y, -D + t + 0.02, w, h);
  solid(wall, 0, -D + t / 2, W, t); solid(wall, -W / 2 + t / 2, -D / 2, t, D); solid(wall, W / 2 - t / 2, -D / 2, t, D);
  for (const s of [-1, 1]) {
    const u = s * (door / 2 + side / 2), p = c.at(u, -t / 2);
    box(M.trimDark, u, -t / 2, CURB + 0.3, side, 0.6, t); K.e.colliders.addBox(p.x, p.z, side / 2, t / 2, l.yaw);
    c.plane(M.storeGlass, u, CURB + 2.2, -0.05, side - 0.2, 3.2);
    box(M.iron, u, -0.05, CURB + 2.2, 0.1, 3.2, 0.12); box(M.iron, s * (door / 2), -0.05, CURB + 2.2, 0.14, 3.3, 0.16);
    box(M.bronze, s * (door / 2 - 0.05), -0.55, CURB + 1.3, 0.05, 2.5, 0.95);
  }
  const hp = c.at(0, -t / 2); K.occ.box(wall, hp.x, (G + CURB + 3.8) / 2, hp.z, W, G - CURB - 3.8, t, l.yaw, 2.5);
  K.occ.box(M.trimDark, c.at(0, -D / 2).x, G - 0.1, c.at(0, -D / 2).z, W, 0.2, D, l.yaw, 0);
  for (const f of [0.3, 0.7]) {
    const p = c.at(0, -D * f); box(M.downlight, 0, -D * f, G - 0.22, W * 0.5, 0.04, 0.5);
    K.pool.add(p.x, G - 0.8, p.z, kind === 'arcade' ? '#b388ff' : '#ffe2b8', 6, 11); K.spill.pool(p.x, CURB, p.z, W * 0.35, kind === 'arcade' ? '#b388ff' : '#ffe2b8', 0.35);
  }
  const out = c.at(0, 2), inn = c.at(0, -2.2);
  K.interact.push({ x: out.x, z: out.z, verb: 'Enter', label: name, action: (e) => e.player.teleport(inn.x, inn.z) });
  K.interact.push({ x: inn.x, z: inn.z, verb: 'Exit', label: 'to the street', action: (e) => e.player.teleport(out.x, out.z) });
  const spot = (u, d, verb, label, text, action) => { const p = c.at(u, d); K.interact.push({ x: p.x, z: p.z, verb, label, text, action }); };
  const seat = (u, d, yawOff, y, label) => { const p = c.at(u, d); spot(u, d, 'Sit', label, null, (e) => e.player.sitAt({ x: p.x, y, z: p.z, rot: l.yaw + yawOff })); };
  const U0 = -W / 2 + 1.2, U1 = W / 2 - 1.2;
  if (kind === 'arcade') {
    flat(M.paint[4], 0, -D / 2, CURB + 0.01, W - 0.6, D - 0.6);
    const scr = K.screens.ch.arts.mat;
    for (let i = 0; i < Math.floor((D - 4) / 1.3); i++) for (const s of [-1, 1]) {
      const d = -3.2 - i * 1.3, u = s * (W / 2 - 0.9), p = c.at(u, d);
      K.mg.box(M.iron, p.x, CURB + 0.95, p.z, 0.8, 1.9, 0.9, l.yaw + s * Math.PI / 2, 0);
      K.mg.add(scr, new THREE.PlaneGeometry(0.6, 0.45), c.at(u - s * 0.46, d).x, CURB + 1.4, c.at(u - s * 0.46, d).z, -0.2, l.yaw - s * Math.PI / 2);
      K.mg.box([M.neon.pink, M.neon.cyan, M.neon.violet][i % 3], c.at(u - s * 0.3, d).x, CURB + 1.85, c.at(u - s * 0.3, d).z, 0.3, 0.12, 0.8, l.yaw + s * Math.PI / 2, 0);
    }
    for (let i = 0; i < 3; i++) box([M.neon.cyan, M.neon.pink, M.neon.violet][i], 0, -2.5 - i * (D - 4) / 3, G - 0.3, W - 1.2, 0.06, 0.06);
    spot(U1 - 0.4, -4.5, 'Watch', 'Starfall Racer attract mode', 'The cabinet cycles its fictional attract screen. Coin slots are decorative — nothing is charged.');
  } else if (kind === 'records') {
    flat(M.wood, 0, -D / 2, CURB + 0.01, W - 0.6, D - 0.6);
    back(M.interiors.records, 0, 2.6, W - 0.8, 3.6);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 2; i++) {
      const u = -W / 4 + i * W / 2, d = -3.4 - r * 2.4;
      box(M.wood, u, d, CURB + 0.45, W * 0.32, 0.9, 1);
      for (let k = 0; k < 14; k++) box(M.paint[(k + r) % 5], u - W * 0.14 + k * W * 0.02, d, CURB + 1, 0.04, 0.32, 0.32);
    }
    box(M.wood, U1 - 0.6, -D + 2, CURB + 0.55, 1.6, 1.1, 0.7); box(M.iron, U1 - 0.6, -D + 2, CURB + 1.2, 0.5, 0.2, 0.4);
    const hp2 = c.at(U1 - 0.6, -D + 2); K.mg.add(M.iron, new THREE.TorusGeometry(0.12, 0.025, 6, 12, Math.PI), hp2.x, CURB + 1.3, hp2.z, 0, l.yaw);
    spot(U1 - 0.6, -D + 3.2, 'Listen', 'listening station', 'A fictional B-side crackles through the headphones: "Neon Harbor (demo)".');
    spot(-W / 4, -4.6, 'Browse', 'the vinyl bins', 'Crates of fictional LPs — Southstar jazz, city pop and hip-hop pressings.');
  } else if (kind === 'lobby') {
    flat(M.plaza, 0, -D / 2, CURB + 0.01, W - 0.6, D - 0.6);
    back(M.interiors.lobby, 0, 2.4, W - 0.8, 3.8);
    box(M.wood, 0, -D + 2.2, CURB + 0.55, 4, 1.1, 0.9); box(M.stonePale, 0, -D + 2.2, CURB + 1.13, 4.2, 0.06, 1);
    for (const s of [-1, 1]) { box(M.paint[2], s * (W / 2 - 1.6), -D / 2, CURB + 0.25, 1, 0.5, 2.4); box(M.paint[2], s * (W / 2 - 1.2), -D / 2, CURB + 0.7, 0.3, 0.6, 2.4); seat(s * (W / 2 - 1.6), -D / 2, -s * Math.PI / 2, CURB + 0.5, 'lobby sofa'); }
    const cp = c.at(0, -D / 2);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; K.mg.add(M.bulbs, new THREE.SphereGeometry(0.08, 6, 4), cp.x + Math.cos(a) * 0.9, G - 1, cp.z + Math.sin(a) * 0.9); }
    K.mg.add(M.gold, new THREE.TorusGeometry(0.9, 0.04, 6, 24), cp.x, G - 0.95, cp.z, Math.PI / 2);
    for (const u of [U0, U1]) { const p = c.at(u, -1.5); K.mg.add(M.terracotta, new THREE.CylinderGeometry(0.35, 0.28, 0.6, 8), p.x, CURB + 0.3, p.z); K.mg.add(M.frond, new THREE.ConeGeometry(0.8, 1.6, 7), p.x, CURB + 1.4, p.z); }
    c.plane(K.signs.mat, 0, 3.4, -D + t + 0.05, 5, 0.9, K.signs.quad(K.signs.text('RECEPTION', SIGN.lux('#d9b36a')), 5, 0.9));
    spot(0, -D + 3.4, 'View', 'reception desk', 'A small brass bell and a guest book. The desk is decorative — no rooms are sold here.');
  } else if (kind === 'showroom') {
    flat(M.stoneWhite, 0, -D / 2, CURB + 0.01, W - 0.6, D - 0.6);
    for (let i = 0; i < 16; i++) { const a = i * 0.42, p = c.at(U1 - 2 + Math.cos(a) * 1.4, -D + 3 + Math.sin(a) * 1.4); K.mg.add(M.stoneWhite, new THREE.BoxGeometry(1.4, 0.14, 0.45), p.x, CURB + 0.2 + i * 0.26, p.z, 0, l.yaw + a); }
    K.mg.add(M.stoneWhite, new THREE.CylinderGeometry(0.25, 0.25, 4.4, 12), c.at(U1 - 2, -D + 3).x, CURB + 2.2, c.at(U1 - 2, -D + 3).z);
    for (let i = 0; i < 4; i++) { const u = U0 + 1 + i * ((W - 6) / 3); mannequinAt(K, c, u, -D / 2 + (i % 2) * 1.5); spot(u, -D / 2 + (i % 2) * 1.5 + 1.2, 'View', 'Celeste Atelier gown', 'A sculpted white gown under a single spotlight. Display only.'); }
    back(M.interiors.gallery, -W / 4, 2.4, W / 2, 3.2);
  } else if (kind === 'diner') {
    flat(M.plazaDark, 0, -D / 2, CURB + 0.01, W - 0.6, D - 0.6);
    box(M.chrome, 0, -D + 2.4, CURB + 0.55, W - 3, 1.1, 0.8); box(M.paint[1], 0, -D + 2.4, CURB + 1.12, W - 2.8, 0.06, 1);
    back(M.interiors.cafe, 0, 2.6, W - 0.8, 3);
    c.plane(K.signs.mat, 0, 3.9, -D + t + 0.06, 6, 0.8, K.signs.quad(K.signs.text('PANCAKES · PIE · COFFEE', SIGN.board('#1b1b1b', '#ffe6a0')), 6, 0.8));
    for (let i = 0; i < Math.floor((W - 3) / 1.2); i++) { const u = -W / 2 + 2 + i * 1.2, p = c.at(u, -D + 3.4); K.mg.add(M.chrome, new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), p.x, CURB + 0.35, p.z); K.mg.add(M.paint[1], new THREE.CylinderGeometry(0.22, 0.22, 0.1, 10), p.x, CURB + 0.75, p.z); if (i % 2 === 0) seat(u, -D + 3.4, Math.PI, CURB + 0.8, 'counter stool'); }
    for (let i = 0; i < Math.floor((D - 7) / 2.2); i++) { const d = -2.2 - i * 2.2; box(M.paint[1], U0 + 0.1, d - 0.7, CURB + 0.6, 1, 1.2, 0.4); box(M.paint[1], U0 + 0.1, d + 0.7, CURB + 0.6, 1, 1.2, 0.4); box(M.stoneWhite, U0 + 0.1, d, CURB + 0.75, 1, 0.06, 0.9); seat(U0 + 0.1, d - 0.45, 0, CURB + 0.5, 'booth'); }
  }
}
function mannequinAt(K, c, u, d) {
  const p = c.at(u, d), M = K.M;
  K.mg.add(M.stonePale, new THREE.CylinderGeometry(0.5, 0.55, 0.4, 14), p.x, CURB + 0.2, p.z);
  K.mg.add(M.stoneWhite, new THREE.CylinderGeometry(0.16, 0.24, 1.1, 10), p.x, CURB + 1.3, p.z);
  K.mg.add(M.stoneWhite, new THREE.SphereGeometry(0.12, 10, 8), p.x, CURB + 2, p.z);
  K.mg.add(M.stoneWhite, new THREE.ConeGeometry(0.46, 1.2, 14, 1, true), p.x, CURB + 1, p.z);
  K.pool.add(p.x, G - 0.5, p.z, '#fffaf0', 3, 6);
}