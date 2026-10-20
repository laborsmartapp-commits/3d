import { shade } from '../kit';

const sit = (l, x, y, z, ry = 0) => ['sit', l, x, y, z, ry];
export const S = Math.PI;

export function sofaBody(k, c, W, n, D = 0.95, kind = 'fabric') {
  const F = k.mm(kind, c), F2 = k.m(kind, shade(c, 1.07)), L = k.m('wood', '#5a3b28');
  k.b(F, 0, 0.12, -0.02, W, 0.28, D - 0.04, 0.06);
  k.b(F, 0, 0.3, -D / 2 + 0.12, W, 0.52, 0.24, 0.09);
  for (const s of [-1, 1]) k.b(F, s * (W / 2 - 0.1), 0.12, 0, 0.2, 0.5, D, 0.09);
  const cw = (W - 0.4) / n;
  for (let i = 0; i < n; i++) {
    const x = -W / 2 + 0.2 + cw * (i + 0.5);
    k.b(F2, x, 0.38, 0.06, cw - 0.02, 0.16, D - 0.3, 0.07);
    k.b(F2, x, 0.48, -D / 2 + 0.31, cw - 0.03, 0.44, 0.18, 0.08, -0.14);
  }
  if (W > 1.2) {
    k.b(k.m('fabric', '#efe2c8'), -W / 2 + 0.42, 0.5, -D / 2 + 0.44, 0.42, 0.4, 0.13, 0.06, -0.25, 0.25, 0.08);
    k.b(k.m('fabric', '#c98b5c'), W / 2 - 0.42, 0.5, -D / 2 + 0.44, 0.42, 0.4, 0.13, 0.06, -0.25, -0.25, -0.08);
  }
  for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(L, x * (W / 2 - 0.08), 0, z * (D / 2 - 0.08), 0.025, 0.018, 0.12, 12);
}

export function books(k, x0, x1, y, z, depth, seed) {
  let r = seed; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
  const cols = ['#7b2d26', '#2f4858', '#d9a441', '#33658a', '#86bbd8', '#c9cba3', '#5c4033', '#9e2a2b', '#3a5a40'];
  let x = x0;
  while (x < x1 - 0.05) {
    const w = 0.025 + rnd() * 0.03, h = 0.17 + rnd() * 0.12;
    k.b(k.m('paint', cols[(rnd() * cols.length) | 0]), x + w / 2, y, z, w, h, depth * (0.75 + rnd() * 0.2), 0.004);
    x += w + 0.003; if (rnd() < 0.07) x += 0.14;
  }
}

function frame(k, w, h, face, frameColor = '#2b2420') {
  const F = k.m('wood', frameColor);
  k.b(F, 0, 0, 0.02, w, h, 0.04, 0.008);
  k.b(k.m('paint', '#f4efe6'), 0, 0.04, 0.041, w - 0.08, h - 0.08, 0.004, 0.001);
  k.b(face, 0, 0.07, 0.044, w - 0.14, h - 0.14, 0.003, 0.001);
}

export default {
  sofa: { name: 'Sofa', cat: 'Living Room', color: '#8193a6', anchors: [sit('Sit Left', -0.7, 0.5, 0.15), sit('Sit Center', 0, 0.5, 0.15), sit('Sit Right', 0.7, 0.5, 0.15)], build: (k, c) => sofaBody(k, c, 2.3, 3) },
  loveseat: { name: 'Loveseat', cat: 'Living Room', color: '#a7b49b', anchors: [sit('Sit Left', -0.38, 0.5, 0.15), sit('Sit Right', 0.38, 0.5, 0.15)], build: (k, c) => sofaBody(k, c, 1.6, 2) },
  armchair: { name: 'Armchair', cat: 'Living Room', color: '#c98b5c', anchors: [sit('Sit', 0, 0.5, 0.12)], build: (k, c) => sofaBody(k, c, 0.95, 1, 0.9) },
  sectional: {
    name: 'Sectional Sofa', cat: 'Living Room', color: '#7d8b99',
    // Compound collision (local metres, scale 1): the main seat run + the chaise, so the open inside of the L stays walkable.
    cols: [[0, 0, 1.45, 0.475], [0.97, 0.85, 0.48, 0.45]],
    anchors: [sit('Sit Left', -1.0, 0.5, 0.15), sit('Sit Center', -0.1, 0.5, 0.15), sit('Sit Right', 0.8, 0.5, 0.15), sit('Lounge on Chaise', 0.97, 0.5, 0.95)],
    build(k, c) {
      sofaBody(k, c, 2.9, 3);
      const F = k.main, F2 = k.m('fabric', shade(c, 1.07));
      k.b(F, 0.97, 0.12, 0.85, 0.96, 0.28, 0.9, 0.06);
      k.b(F2, 0.92, 0.38, 0.85, 0.82, 0.16, 0.86, 0.07);
      k.b(F, 1.35, 0.12, 0.85, 0.2, 0.5, 0.9, 0.09);
      for (const x of [0.6, 1.35]) k.c(k.m('wood', '#5a3b28'), x, 0, 1.22, 0.025, 0.018, 0.12, 12);
    },
  },
  ottoman: { name: 'Ottoman', cat: 'Living Room', color: '#d9a441', anchors: [sit('Sit', 0, 0.42, 0)], build(k, c) { const F = k.mm('fabric', c); k.c(F, 0, 0.04, 0, 0.32, 0.3, 0.36, 32); k.s(k.m('fabric', shade(c, 0.8)), 0, 0.4, 0, 0.025); k.c(k.m('wood', '#4a3020'), 0, 0, 0, 0.26, 0.26, 0.04, 24); } },
  coffee_table: {
    name: 'Coffee Table', cat: 'Living Room', color: '#b88a5a',
    build(k, c) { const W = k.mm('wood', c), B = k.m('metal', '#2a2a2e'); k.b(W, 0, 0.36, 0, 1.2, 0.05, 0.65, 0.02); k.b(W, 0, 0.1, 0, 1.08, 0.03, 0.54, 0.01); for (const x of [-1, 1]) for (const z of [-1, 1]) k.b(B, x * 0.55, 0, z * 0.28, 0.04, 0.36, 0.04, 0.008); },
  },
  side_table: { name: 'Side Table', cat: 'Living Room', color: '#e8e2d8', build(k, c) { const B = k.m('brass'); k.c(B, 0, 0, 0, 0.16, 0.19, 0.03); k.c(B, 0, 0.03, 0, 0.02, 0.02, 0.5, 12); k.c(k.mm('marble', c), 0, 0.53, 0, 0.26, 0.26, 0.03, 36); } },
  console_table: { name: 'Console Table', cat: 'Living Room', color: '#7a5239', build(k, c) { const W = k.mm('wood', c); k.b(W, 0, 0.76, 0, 1.1, 0.04, 0.35, 0.01); k.b(W, 0, 0.18, 0, 1.0, 0.03, 0.3, 0.01); for (const x of [-1, 1]) for (const z of [-1, 1]) k.b(W, x * 0.52, 0, z * 0.15, 0.04, 0.76, 0.04, 0.006); } },
  tv_console: {
    name: 'TV Console', cat: 'Living Room', color: '#6b4630',
    build(k, c) { const W = k.mm('wood', c), Ca = k.m('wicker', '#d8bf94'), B = k.m('brass'); k.b(W, 0, 0.12, 0, 1.9, 0.42, 0.45, 0.02); for (const x of [-0.62, 0, 0.62]) { k.b(Ca, x, 0.15, 0.226, 0.58, 0.36, 0.01, 0.004); k.b(B, x + 0.24, 0.3, 0.235, 0.012, 0.08, 0.012, 0.004); } for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(B, x * 0.85, 0, z * 0.17, 0.016, 0.01, 0.12, 10); },
  },
  tv: {
    name: 'Flat Screen TV', cat: 'Electronics', place: 'surface', color: '#16171b',
    build(k, c) { const B = k.mm('plastic', c); k.b(B, 0, 0, 0, 0.5, 0.02, 0.22, 0.008); k.b(B, 0, 0.02, -0.02, 0.07, 0.07, 0.03, 0.006); k.b(B, 0, 0.08, -0.02, 1.46, 0.85, 0.04, 0.012); k.b(k.m('screen', 'tv'), 0, 0.095, 0.001, 1.41, 0.81, 0.002, 0.001); },
  },
  bookshelf: {
    name: 'Bookshelf', cat: 'Living Room', color: '#6e4a33',
    build(k, c) {
      const W = k.mm('wood', c);
      for (const s of [-1, 1]) k.b(W, s * 0.48, 0, 0, 0.04, 2.0, 0.35, 0.006);
      k.b(k.m('wood', shade(c, 0.8)), 0, 0, -0.165, 0.94, 2.0, 0.02, 0.004);
      const ys = [0.04, 0.46, 0.88, 1.3, 1.72, 1.96];
      for (const y of ys) k.b(W, 0, y, 0, 0.96, 0.03, 0.35, 0.004);
      ys.slice(0, 4).forEach((y, i) => books(k, -0.44, i === 2 ? 0.1 : 0.44, y + 0.03, 0, 0.26, 17 + i * 5));
      k.lathe(k.m('ceramic', '#e9e4da'), 'shelfvase', [[0, 0], [0.06, 0], [0.08, 0.1], [0.04, 0.2], [0.05, 0.24], [0, 0.24]], 0.28, 0.91, 0);
      books(k, -0.44, 0.0, 1.75, 0, 0.26, 41);
    },
  },
  rug_large: { name: 'Area Rug', cat: 'Living Room', color: '#c9b79c', solid: false, build(k, c) { k.b(k.mm('rug', c), 0, 0, 0, 3.0, 0.012, 2.0, 0.004); } },
  rug_round: { name: 'Round Rug', cat: 'Living Room', color: '#8a7ca8', solid: false, build(k, c) { k.c(k.mm('rug', c), 0, 0, 0, 1.1, 1.1, 0.012, 48); } },
  rug_runner: { name: 'Runner Rug', cat: 'Living Room', color: '#a8665a', solid: false, build(k, c) { k.b(k.mm('rug', c), 0, 0, 0, 0.85, 0.012, 3.0, 0.004); } },
  wall_art: { name: 'Framed Art', cat: 'Decorations', place: 'wall', color: '#d97a5a', build(k, c) { frame(k, 1.0, 0.72, k.mm('art', c)); } },
  poster: { name: 'Poster', cat: 'Decorations', place: 'wall', color: '#7c3aed', build(k, c) { k.b(k.mm('poster', c), 0, 0, 0.004, 0.6, 0.9, 0.006, 0.002); } },
  photo_frame: { name: 'Photo Frame', cat: 'Decorations', place: 'surface', color: '#e0a458', build(k, c) { k.b(k.m('wood', '#2b2420'), 0, 0, 0, 0.18, 0.24, 0.02, 0.004, -0.15); k.b(k.mm('photo', c), 0, 0.02, 0.011, 0.14, 0.2, 0.002, 0.001, -0.15); } },
  books_stack: { name: 'Book Stack', cat: 'Decorations', place: 'surface', color: '#33658a', build(k, c) { [[c, 0.26, 0.2, 0], ['#d9a441', 0.24, 0.18, 0.2], ['#9e2a2b', 0.22, 0.16, -0.15]].forEach(([col, w, d, r], i) => k.b(k.m('paint', col), 0, i * 0.04, 0, w, 0.04, d, 0.004, 0, r)); } },
  vase_flowers: {
    name: 'Vase of Flowers', cat: 'Decorations', place: 'surface', solid: false, color: '#f2e9dc',
    build(k, c) { k.lathe(k.mm('ceramic', c), 'vase', [[0, 0], [0.06, 0], [0.09, 0.08], [0.07, 0.2], [0.04, 0.26], [0.05, 0.28], [0, 0.28]]); const st = k.m('leaf', '#4f7d33'); [[0, 0], [0.05, 0.03], [-0.05, 0.02], [0.02, -0.05], [-0.03, -0.04], [0.06, -0.02], [-0.06, 0.05]].forEach(([x, z], i) => { k.tube(st, [0, 0.2, 0], [x * 2, 0.5 + (i % 3) * 0.05, z * 2], 0.004, 5); k.s(k.m('ceramic', ['#f08a9c', '#ffffff', '#f6c453', '#d46a9a'][i % 4]), x * 2, 0.52 + (i % 3) * 0.05, z * 2, 0.04); }); },
  },
  curtains: {
    name: 'Curtains', cat: 'Decorations', place: 'wall', color: '#e7dcc8', solid: false,
    build(k, c) { const F = k.mm('fabric', c); k.tube(k.m('brass'), [-1.05, 2.5, 0.08], [1.05, 2.5, 0.08], 0.015); for (const s of [-1, 1]) for (let i = 0; i < 6; i++) k.c(F, s * (0.68 + i * 0.07), 0.04, 0.08 + (i % 2) * 0.02, 0.045, 0.05, 2.42, 10); },
  },
  mirror_wall: { name: 'Wall Mirror', cat: 'Decorations', place: 'wall', color: '#c9a24f', build(k, c) { k.b(k.mm('brass', c), 0, 0, 0.015, 0.8, 1.0, 0.03, 0.01); k.b(k.m('mirror'), 0, 0.04, 0.031, 0.72, 0.92, 0.003, 0.001); } },
  mirror_wide: { name: 'Wide Mirror', cat: 'Bathroom', place: 'wall', color: '#2a2a2e', build(k, c) { k.b(k.mm('metal', c), 0, 0, 0.015, 1.5, 0.9, 0.03, 0.01); k.b(k.m('mirror'), 0, 0.03, 0.031, 1.44, 0.84, 0.003, 0.001); k.b(k.m('lamp'), 0, 0.92, 0.04, 1.2, 0.05, 0.05, 0.02); } },
  mirror_round: { name: 'Round Mirror', cat: 'Decorations', place: 'wall', color: '#c9a24f', build(k, c) { k.t(k.mm('brass', c), 0, 0.45, 0.03, 0.43, 0.03); k.c(k.m('mirror'), 0, 0.4485, 0.025, 0.42, 0.42, 0.003, 48, Math.PI / 2); } },
  clock_wall: { name: 'Wall Clock', cat: 'Decorations', place: 'wall', color: '#2b2420', build(k, c) { const W = k.mm('wood', c); k.c(W, 0, 0.23, 0.02, 0.26, 0.26, 0.04, 40, Math.PI / 2); k.c(k.m('paint', '#f7f3ea'), 0, 0.248, 0.041, 0.23, 0.23, 0.004, 40, Math.PI / 2); k.b(W, 0.05, 0.245, 0.045, 0.12, 0.012, 0.004, 0.001, 0, 0, 0.4); k.b(W, 0, 0.25, 0.046, 0.012, 0.17, 0.004, 0.001); } },
};