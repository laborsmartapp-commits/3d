import { shade } from '../kit';

const sit = (l, x, y, z, ry = 0) => ['sit', l, x, y, z, ry];

// Shaker door/drawer front: slab plus four raised rails.
export function front(k, P, x, y, z, w, h) {
  k.b(P, x, y, z, w, h, 0.02, 0.004);
  const r = Math.min(0.06, w * 0.15, h * 0.2);
  k.b(P, x, y, z + 0.012, w, r, 0.012, 0.002); k.b(P, x, y + h - r, z + 0.012, w, r, 0.012, 0.002);
  k.b(P, x - w / 2 + r / 2, y, z + 0.012, r, h, 0.012, 0.002); k.b(P, x + w / 2 - r / 2, y, z + 0.012, r, h, 0.012, 0.002);
}

function base(k, c, W, kind) {
  const P = k.mm('paint', c), T = k.m('marble', '#f3f0ea'), H = k.m('brass'), D = 0.62, z = D / 2 - 0.04;
  k.b(k.m('matte', '#2a2826'), 0, 0, -0.03, W - 0.04, 0.1, D - 0.12, 0.004);
  k.b(P, 0, 0.1, -0.02, W, 0.78, D - 0.06, 0.006);
  if (kind === 'drawers') for (const [y, h] of [[0.12, 0.3], [0.44, 0.22], [0.68, 0.18]]) { front(k, P, 0, y, z, W - 0.03, h - 0.02); k.b(H, 0, y + h - 0.08, z + 0.03, 0.18, 0.014, 0.014, 0.006); }
  else {
    const n = Math.max(1, Math.round(W / 0.6)), fw = W / n;
    for (let i = 0; i < n; i++) {
      const x = -W / 2 + fw * (i + 0.5);
      front(k, P, x, 0.12, z, fw - 0.025, 0.56); front(k, P, x, 0.7, z, fw - 0.025, 0.16);
      k.b(H, x, 0.765, z + 0.03, 0.14, 0.014, 0.014, 0.006);
      k.b(H, x + (i % 2 ? -1 : 1) * (fw / 2 - 0.07), 0.42, z + 0.03, 0.014, 0.12, 0.014, 0.006);
    }
  }
  k.b(T, 0, 0.88, 0, W + 0.02, 0.04, D + 0.02, 0.006);
}

const chair = (k, c, wood = '#6b4630') => {
  const F = k.mm('fabric', c), W = k.m('wood', wood);
  k.b(W, 0, 0.36, 0.02, 0.46, 0.05, 0.46, 0.01); k.b(F, 0, 0.4, 0.03, 0.46, 0.08, 0.44, 0.03);
  for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(W, x * 0.2, 0, 0.02 + z * 0.19, 0.02, 0.016, 0.37, 8);
  for (const x of [-1, 1]) k.b(W, x * 0.2, 0.4, -0.2, 0.035, 0.52, 0.035, 0.008, -0.08);
  k.b(F, 0, 0.55, -0.215, 0.42, 0.34, 0.05, 0.02, -0.08);
};

export default {
  counter_base: { name: 'Base Cabinet', cat: 'Kitchen', color: '#8fa38e', build: (k, c) => base(k, c, 1.2) },
  counter_drawers: { name: 'Drawer Cabinet', cat: 'Kitchen', color: '#8fa38e', build: (k, c) => base(k, c, 1.2, 'drawers') },
  counter_sink: {
    name: 'Sink Cabinet', cat: 'Kitchen', color: '#8fa38e',
    build(k, c) { base(k, c, 1.2); const Ch = k.m('chrome'); k.b(k.m('metal', '#a9b0b6'), 0, 0.905, 0.02, 0.72, 0.02, 0.44, 0.03); k.b(k.m('metal', '#5f666c'), 0, 0.91, 0.02, 0.64, 0.016, 0.36, 0.02); k.c(Ch, 0, 0.92, -0.22, 0.022, 0.026, 0.32, 16); k.t(Ch, 0, 1.24, -0.14, 0.08, 0.014, 0, Math.PI / 2, 0, Math.PI); k.c(Ch, 0, 1.12, -0.06, 0.014, 0.014, 0.12, 12); },
  },
  dishwasher: { name: 'Dishwasher', cat: 'Kitchen', color: '#c5cbd0', build(k, c) { const St = k.mm('metal', c); k.b(k.m('matte', '#2a2826'), 0, 0, -0.03, 0.58, 0.1, 0.5, 0.004); k.b(St, 0, 0.1, 0, 0.6, 0.78, 0.6, 0.01); k.c(k.m('chrome'), 0, 0.8, 0.32, 0.012, 0.012, 0.46, 10, 0, 0, Math.PI / 2); k.b(k.m('marble', '#f3f0ea'), 0, 0.88, 0, 0.62, 0.04, 0.64, 0.006); } },
  range: {
    name: 'Range Stove', cat: 'Kitchen', color: '#c5cbd0',
    build(k, c) {
      const St = k.mm('metal', c), Bk = k.m('matte', '#141416'), Ch = k.m('chrome');
      k.b(St, 0, 0, 0, 0.76, 0.9, 0.62, 0.015); k.b(k.m('glass', '#20262c'), 0, 0.2, 0.311, 0.6, 0.36, 0.01, 0.006);
      k.c(Ch, 0, 0.63, 0.35, 0.012, 0.012, 0.6, 10, 0, 0, Math.PI / 2); k.b(Bk, 0, 0.9, 0, 0.76, 0.02, 0.62, 0.005);
      for (const x of [-0.18, 0.18]) for (const z of [-0.14, 0.14]) k.t(Bk, x, 0.935, z, 0.09, 0.012, Math.PI / 2);
      for (let i = 0; i < 5; i++) k.c(Bk, -0.28 + i * 0.14, 0.76, 0.31, 0.022, 0.022, 0.03, 16, Math.PI / 2);
      k.b(St, 0, 0.9, -0.29, 0.76, 0.14, 0.04, 0.008);
    },
  },
  range_hood: { name: 'Range Hood', cat: 'Kitchen', place: 'wall', color: '#c5cbd0', build(k, c) { const St = k.mm('metal', c); k.c(St, 0, 0, 0.27, 0.18, 0.45, 0.32, 4, 0, Math.PI / 4); k.b(St, 0, 0.32, 0.17, 0.3, 0.7, 0.3, 0.01); } },
  fridge: {
    name: 'Refrigerator', cat: 'Kitchen', color: '#c5cbd0',
    build(k, c) { const St = k.mm('metal', c), Ch = k.m('chrome'); k.b(St, 0, 0, 0, 0.9, 1.82, 0.72, 0.02); for (const s of [-1, 1]) { k.b(St, s * 0.224, 0.64, 0.361, 0.44, 1.17, 0.02, 0.008); k.c(Ch, s * 0.03, 0.95, 0.4, 0.012, 0.012, 0.7, 10); } k.b(St, 0, 0.05, 0.361, 0.89, 0.57, 0.02, 0.008); k.c(Ch, 0, 0.5, 0.4, 0.012, 0.012, 0.6, 10, 0, 0, Math.PI / 2); k.b(k.m('gloss', '#15181c'), -0.224, 1.2, 0.372, 0.16, 0.24, 0.006, 0.004); },
  },
  wall_cabinet: { name: 'Wall Cabinet', cat: 'Kitchen', place: 'wall', color: '#f2efe7', build(k, c) { const P = k.mm('paint', c); k.b(P, 0, 0, 0.175, 1.2, 0.75, 0.35, 0.006); for (const s of [-1, 1]) { front(k, P, s * 0.3, 0.02, 0.36, 0.58, 0.71); k.b(k.m('brass'), s * 0.05, 0.08, 0.385, 0.014, 0.12, 0.014, 0.006); } } },
  pantry: { name: 'Pantry Cabinet', cat: 'Kitchen', color: '#8fa38e', build(k, c) { const P = k.mm('paint', c); k.b(P, 0, 0, 0, 0.9, 2.2, 0.6, 0.008); for (const s of [-1, 1]) { front(k, P, s * 0.222, 0.08, 0.31, 0.43, 2.06); k.b(k.m('brass'), s * 0.04, 0.9, 0.335, 0.014, 0.3, 0.014, 0.006); } } },
  island: {
    name: 'Kitchen Island', cat: 'Kitchen', color: '#2f3e5c',
    build(k, c) {
      const P = k.mm('paint', c), T = k.m('marble', '#f3f0ea');
      k.b(P, 0, 0.1, -0.15, 2.3, 0.78, 0.76, 0.006); k.b(k.m('matte', '#2a2826'), 0, 0, -0.15, 2.24, 0.1, 0.7, 0.004);
      for (let i = 0; i < 4; i++) { front(k, P, -0.86 + i * 0.573, 0.12, -0.54, 0.55, 0.74); }
      k.b(T, 0, 0.88, 0, 2.4, 0.04, 1.1, 0.008); for (const s of [-1, 1]) k.b(T, s * 1.18, 0, 0, 0.04, 0.88, 1.1, 0.006);
      for (let i = 0; i < 12; i++) k.b(P, -1.1 + i * 0.2, 0.12, 0.24, 0.16, 0.74, 0.02, 0.004);
    },
  },
  bar_stool: {
    name: 'Bar Stool', cat: 'Kitchen', color: '#7a4a2f', anchors: [sit('Sit', 0, 0.68, 0)],
    build(k, c) { const L = k.mm('leather', c), B = k.m('brass'); k.c(L, 0, 0.64, 0, 0.2, 0.19, 0.07, 28); for (const x of [-1, 1]) for (const z of [-1, 1]) k.tube(B, [x * 0.17, 0, z * 0.17], [x * 0.12, 0.64, z * 0.12], 0.012); k.t(B, 0, 0.26, 0, 0.16, 0.009, Math.PI / 2); k.t(L, 0, 0.74, 0, 0.18, 0.025, -Math.PI / 2, 0, 0, Math.PI); },
  },
  pendant_light: {
    name: 'Pendant Light', cat: 'Lighting', place: 'hang', color: '#1f2a2e', solid: false,
    build(k, c) { k.c(k.m('matte', '#111'), 0, 0.22, 0, 0.004, 0.004, 1.1, 6); k.lathe(k.mm('metal', c), 'pendant', [[0.19, 0], [0.17, 0.08], [0.12, 0.17], [0.03, 0.22], [0, 0.22]]); k.s(k.m('lamp'), 0, 0.06, 0, 0.06); k.light(0, 0.0, 0, 'pendant'); },
  },
  fruit_bowl: { name: 'Fruit Bowl', cat: 'Kitchen', place: 'surface', solid: false, color: '#e8e2d8', build(k, c) { k.lathe(k.mm('ceramic', c), 'bowl', [[0, 0], [0.08, 0], [0.16, 0.07], [0.17, 0.09], [0, 0.02]]); [['#f28c28', 0.05, 0.1, 0], ['#c0392b', -0.05, 0.1, 0.04], ['#8bc34a', 0, 0.1, -0.06], ['#f4d03f', -0.02, 0.15, 0.0]].forEach(([col, x, y, z]) => k.s(k.m('ceramic', col), x, y, z, 0.045)); } },
  coffee_maker: { name: 'Coffee Maker', cat: 'Kitchen', place: 'surface', solid: false, color: '#1b1c20', build(k, c) { const B = k.mm('plastic', c); k.b(B, 0, 0, -0.05, 0.2, 0.34, 0.12, 0.02); k.b(B, 0, 0, 0.03, 0.2, 0.03, 0.2, 0.01); k.b(B, 0, 0.28, 0.03, 0.2, 0.06, 0.2, 0.02); k.c(k.m('glass', '#3a2a20'), 0, 0.03, 0.05, 0.06, 0.07, 0.16, 20); } },
  kettle: { name: 'Kettle', cat: 'Kitchen', place: 'surface', solid: false, color: '#c5cbd0', build(k, c) { k.lathe(k.mm('chrome', c), 'kettle', [[0, 0], [0.1, 0], [0.11, 0.08], [0.08, 0.18], [0.03, 0.2], [0, 0.2]]); k.t(k.m('matte', '#111'), 0, 0.2, 0, 0.07, 0.01, 0, Math.PI / 2, 0, Math.PI); k.tube(k.m('chrome'), [0.08, 0.08, 0], [0.16, 0.16, 0], 0.012); } },
  plates_stack: { name: 'Plate Stack', cat: 'Kitchen', place: 'surface', solid: false, color: '#f7f5ef', build(k, c) { const P = k.mm('ceramic', c); for (let i = 0; i < 6; i++) k.c(P, 0, i * 0.018, 0, 0.13, 0.11, 0.014, 28); } },
  pot: { name: 'Cooking Pot', cat: 'Kitchen', place: 'surface', solid: false, color: '#c0392b', build(k, c) { const P = k.mm('gloss', c); k.c(P, 0, 0, 0, 0.13, 0.12, 0.14, 28); k.c(P, 0, 0.14, 0, 0.135, 0.135, 0.012, 28); k.s(k.m('matte', '#111'), 0, 0.165, 0, 0.02); for (const s of [-1, 1]) k.b(k.m('matte', '#111'), s * 0.15, 0.1, 0, 0.05, 0.02, 0.04, 0.008); } },
  dining_table: {
    name: 'Dining Table', cat: 'Dining Room', color: '#6b4630',
    build(k, c) { const W = k.mm('wood', c); k.b(W, 0, 0.71, 0, 2.0, 0.045, 1.0, 0.02); k.b(W, 0, 0.62, 0, 1.8, 0.09, 0.8, 0.006); for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(W, x * 0.86, 0, z * 0.38, 0.045, 0.028, 0.63, 4, 0, Math.PI / 4); },
  },
  dining_chair: { name: 'Dining Chair', cat: 'Dining Room', color: '#c9b79c', anchors: [sit('Sit', 0, 0.47, 0.05)], build: (k, c) => chair(k, c) },
  chandelier: {
    name: 'Chandelier', cat: 'Lighting', place: 'hang', color: '#c9a24f', solid: false,
    build(k, c) { const B = k.mm('brass', c), L = k.m('lamp'); k.c(B, 0, 0.3, 0, 0.008, 0.008, 0.6, 6); k.t(B, 0, 0.12, 0, 0.42, 0.014, Math.PI / 2); k.s(B, 0, 0.18, 0, 0.06); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, x = Math.cos(a) * 0.42, z = Math.sin(a) * 0.42; k.tube(B, [0, 0.18, 0], [x, 0.12, z], 0.008); k.c(B, x, 0.12, z, 0.03, 0.025, 0.04, 12); k.c(k.m('paint', '#fbf7ee'), x, 0.16, z, 0.012, 0.012, 0.08, 8); k.s(L, x, 0.27, z, 0.025, 1, 1.6, 1); } k.light(0, 0.1, 0, 'chandelier'); },
  },
  sideboard: {
    name: 'Sideboard', cat: 'Dining Room', color: '#6b4630',
    build(k, c) { const W = k.mm('wood', c), Ca = k.m('wicker', '#d8bf94'), B = k.m('brass'); k.b(W, 0, 0.14, 0, 1.8, 0.66, 0.45, 0.02); for (let i = 0; i < 4; i++) { const x = -0.675 + i * 0.45; k.b(Ca, x, 0.18, 0.226, 0.42, 0.58, 0.01, 0.004); k.s(B, x + (i % 2 ? -0.17 : 0.17), 0.48, 0.24, 0.014); } for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(B, x * 0.82, 0, z * 0.17, 0.018, 0.012, 0.14, 10); },
  },
  centerpiece: { name: 'Table Centerpiece', cat: 'Dining Room', place: 'surface', solid: false, color: '#6b4630', build(k, c) { k.b(k.mm('wood', c), 0, 0, 0, 0.8, 0.03, 0.22, 0.01); for (const x of [-0.25, 0, 0.25]) { k.c(k.m('paint', '#fbf7ee'), x, 0.03, 0, 0.025, 0.025, 0.16 + Math.abs(x) * 0.2, 12); k.s(k.m('flame'), x, 0.22 + Math.abs(x) * 0.2, 0, 0.012, 1, 2, 1); } for (const x of [-0.36, -0.13, 0.13, 0.36]) k.s(k.m('leaf', '#4f7d33'), x, 0.06, 0, 0.06, 1.3, 0.6, 1); } },
  candle_set: { name: 'Candle Set', cat: 'Decorations', place: 'surface', solid: false, color: '#fbf7ee', build(k, c) { const P = k.mm('paint', c); [[-0.06, 0.18], [0.05, 0.12], [0, 0.08]].forEach(([x, h], i) => { k.c(P, x, 0, i === 2 ? 0.06 : -0.02, 0.035, 0.035, h, 16); k.s(k.m('flame'), x, h + 0.02, i === 2 ? 0.06 : -0.02, 0.012, 1, 2, 1); }); k.light(0, 0.2, 0, 'candle'); } },
};

export { chair };
export const shadeOf = shade;