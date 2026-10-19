import { shade } from '../kit';
import { front } from './kitchen';
import { books } from './living';

const sit = (l, x, y, z, ry = 0) => ['sit', l, x, y, z, ry];

function bed(k, c, W, L, headH, tufted) {
  const F = k.mm('fabric', c), Lin = k.m('fabric', '#f4efe6'), Wd = k.m('wood', '#6b4630'), Hb = k.m('fabric', shade(c, 0.75));
  k.b(Wd, 0, 0.08, 0, W + 0.08, 0.2, L + 0.04, 0.02);
  for (const x of [-1, 1]) for (const z of [-1, 1]) k.b(Wd, x * (W / 2 - 0.02), 0, z * (L / 2 - 0.02), 0.07, 0.1, 0.07, 0.01);
  k.b(Lin, 0, 0.28, 0.01, W, 0.22, L - 0.02, 0.07);
  k.b(F, 0, 0.43, 0.13, W + 0.05, 0.1, L - 0.32, 0.06);
  k.b(k.m('fabric', shade(c, 1.15)), 0, 0.47, -L / 2 + 0.66, W + 0.06, 0.08, 0.28, 0.04);
  const n = W > 1.8 ? 3 : 2, pw = (W - 0.1) / n;
  for (let i = 0; i < n; i++) k.b(Lin, -W / 2 + 0.05 + pw * (i + 0.5), 0.5, -L / 2 + 0.27, pw - 0.04, 0.16, 0.4, 0.07, -0.3);
  k.b(k.m('fabric', '#d4a24c'), 0, 0.5, L / 2 - 0.3, W + 0.08, 0.04, 0.42, 0.02);
  k.b(Hb, 0, 0.08, -L / 2 - 0.05, W + 0.16, headH, 0.1, 0.05);
  if (tufted) for (let i = 0; i < 7; i++) for (let j = 0; j < 3; j++) k.s(k.m('fabric', shade(c, 0.6)), -W / 2 + 0.1 + i * ((W - 0.2) / 6), 0.75 + j * 0.25, -L / 2, 0.018);
}

function gamingChair(k, c, tall = true) {
  const F = k.mm('leather', c), B = k.m('plastic', '#17181c'), Ch = k.m('chrome');
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; k.tube(B, [0, 0.08, 0], [Math.sin(a) * 0.32, 0.06, Math.cos(a) * 0.32], 0.022); k.s(B, Math.sin(a) * 0.32, 0.03, Math.cos(a) * 0.32, 0.03); }
  k.c(Ch, 0, 0.08, 0, 0.025, 0.03, 0.32, 12);
  k.b(F, 0, 0.4, 0.03, 0.52, 0.1, 0.5, 0.04);
  for (const s of [-1, 1]) { k.b(B, s * 0.29, 0.42, 0.02, 0.05, 0.2, 0.06, 0.01); k.b(B, s * 0.29, 0.62, 0.05, 0.08, 0.04, 0.28, 0.015); }
  const h = tall ? 0.85 : 0.55;
  k.b(F, 0, 0.5, -0.24, 0.5, h, 0.1, 0.05, -0.1);
  if (tall) { k.b(B, 0, 0.62, -0.18, 0.12, 0.5, 0.02, 0.01, -0.1); k.b(k.m('fabric', '#111'), 0, 1.15, -0.2, 0.26, 0.12, 0.08, 0.04, -0.1); }
}

function sneaker(k, x, y, z, col) {
  const W = k.m('rubber', '#f5f5f2'), U = k.m('leather', col);
  for (const dx of [-0.065, 0.065]) { k.b(W, x + dx, y, z, 0.1, 0.035, 0.28, 0.015); k.b(U, x + dx, y + 0.03, z - 0.02, 0.095, 0.075, 0.23, 0.04); k.s(U, x + dx, y + 0.05, z + 0.09, 0.048, 1, 0.65, 1.2); k.b(W, x + dx + 0.048, y + 0.05, z - 0.02, 0.003, 0.02, 0.12, 0.001); }
}

export default {
  bed_double: { name: 'Double Bed', cat: 'Bedroom', color: '#2f3e5c', anchors: [sit('Sit on Edge', 0.75, 0.55, 0.2, Math.PI / 2), sit('Sit at Foot', 0, 0.55, 0.95)], build: (k, c) => bed(k, c, 1.6, 2.1, 1.1) },
  bed_king: { name: 'King Bed', cat: 'Bedroom', color: '#e3dacb', anchors: [sit('Sit on Edge', 0.95, 0.55, 0.2, Math.PI / 2), sit('Sit at Foot', 0, 0.55, 1.0)], build: (k, c) => bed(k, c, 2.0, 2.15, 1.4, true) },
  nightstand: { name: 'Nightstand', cat: 'Bedroom', color: '#6b4630', build(k, c) { const W = k.mm('wood', c), B = k.m('brass'); k.b(W, 0, 0.1, 0, 0.5, 0.46, 0.4, 0.015); for (const y of [0.13, 0.34]) { k.b(k.m('wood', shade(c, 1.15)), 0, y, 0.201, 0.44, 0.18, 0.01, 0.004); k.s(B, 0, y + 0.09, 0.215, 0.014); } for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(B, x * 0.21, 0, z * 0.16, 0.014, 0.01, 0.1, 8); } },
  dresser: { name: 'Dresser', cat: 'Bedroom', color: '#6b4630', build(k, c) { const W = k.mm('wood', c), B = k.m('brass'); k.b(W, 0, 0.1, 0, 1.4, 0.75, 0.5, 0.015); for (const x of [-0.35, 0.35]) for (const y of [0.13, 0.37, 0.61]) { k.b(k.m('wood', shade(c, 1.15)), x, y, 0.251, 0.66, 0.21, 0.01, 0.004); k.b(B, x, y + 0.1, 0.262, 0.14, 0.012, 0.012, 0.005); } for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(B, x * 0.66, 0, z * 0.21, 0.016, 0.012, 0.1, 8); } },
  desk: { name: 'Desk', cat: 'Bedroom', color: '#b88a5a', build(k, c) { const W = k.mm('wood', c), Bk = k.m('metal', '#1d1e22'); k.b(W, 0, 0.72, 0, 1.5, 0.035, 0.7, 0.01); for (const s of [-1, 1]) k.b(Bk, s * 0.7, 0, 0, 0.05, 0.72, 0.62, 0.008); k.b(W, 0.48, 0.5, 0, 0.5, 0.2, 0.6, 0.008); k.b(k.m('brass'), 0.48, 0.6, 0.31, 0.14, 0.012, 0.012, 0.005); } },
  gaming_chair: { name: 'Gaming Chair', cat: 'Bedroom', color: '#13806f', anchors: [sit('Sit', 0, 0.5, 0.05)], build: (k, c) => gamingChair(k, c, true) },
  desk_chair: { name: 'Desk Chair', cat: 'Studio', color: '#2a2a2e', anchors: [sit('Sit', 0, 0.5, 0.05)], build: (k, c) => gamingChair(k, c, false) },
  computer_setup: {
    name: 'Dual Monitor Setup', cat: 'Electronics', place: 'surface', solid: false, color: '#1b1c20',
    build(k, c) { const B = k.mm('plastic', c); for (const s of [-1, 1]) { const m = k.b(B, s * 0.33, 0.12, -0.08, 0.62, 0.37, 0.025, 0.008, 0, -s * 0.22); const f = k.b(k.m('screen', s < 0 ? 'code' : 'daw'), s * 0.33, 0.135, -0.066, 0.59, 0.34, 0.002, 0.001, 0, -s * 0.22); m.position.z += 0; f.position.z += 0; } k.b(B, 0, 0, -0.12, 0.3, 0.015, 0.18, 0.006); k.b(B, 0, 0.015, -0.14, 0.04, 0.2, 0.03, 0.006); k.b(B, 0, 0, 0.15, 0.44, 0.022, 0.14, 0.008); k.b(k.m('accent'), 0, 0.002, 0.15, 0.452, 0.006, 0.152, 0.002); k.s(B, 0.3, 0.012, 0.15, 0.03, 1, 0.5, 1.5); },
  },
  gaming_pc: { name: 'Gaming PC', cat: 'Electronics', color: '#1b1c20', build(k, c) { const B = k.mm('plastic', c); k.b(B, 0, 0, 0, 0.22, 0.48, 0.45, 0.01); k.b(k.m('glass', '#7a8aa0'), 0.112, 0.04, 0, 0.002, 0.4, 0.4, 0.001); for (let i = 0; i < 3; i++) k.t(k.m('accent'), 0, 0.1 + i * 0.13, 0.226, 0.05, 0.008); } },
  gaming_console: { name: 'Game Console', cat: 'Electronics', place: 'surface', solid: false, color: '#f2f2f2', build(k, c) { const B = k.mm('plastic', c); k.b(B, 0, 0, 0, 0.1, 0.32, 0.28, 0.02); k.b(k.m('plastic', '#1b1c20'), 0, 0.28, 0, 0.102, 0.012, 0.282, 0.004); k.b(k.m('plastic', '#1b1c20'), 0.2, 0, 0.05, 0.15, 0.04, 0.1, 0.03); } },
  music_keyboard: {
    name: 'Keyboard Synth', cat: 'Studio', color: '#1b1c20', anchors: [['stand', 'Play Keys', 0, 0, 0.55, Math.PI]],
    build(k, c) { const B = k.mm('plastic', c), M = k.m('metal', '#2a2a2e'); for (const s of [-1, 1]) { k.tube(M, [s * 0.45, 0, -0.15], [s * 0.45, 0.76, 0.15], 0.018); k.tube(M, [s * 0.45, 0, 0.15], [s * 0.45, 0.76, -0.15], 0.018); } k.tube(M, [-0.45, 0.38, 0], [0.45, 0.38, 0], 0.016); k.b(B, 0, 0.78, 0, 1.3, 0.1, 0.34, 0.02); k.b(k.m('keys'), 0, 0.873, 0.06, 1.22, 0.012, 0.16, 0.002); for (let i = 0; i < 6; i++) k.c(k.m('chrome'), -0.55 + i * 0.06, 0.88, -0.08, 0.012, 0.012, 0.02, 10); },
  },
  guitar_stand: {
    name: 'Guitar on Stand', cat: 'Studio', solid: false, color: '#b5302e',
    build(k, c) { const G = k.mm('gloss', c), M = k.m('metal', '#1d1e22'), Wd = k.m('wood', '#3b2a1e'); k.tube(M, [-0.15, 0, 0.12], [0, 0.6, -0.05], 0.01); k.tube(M, [0.15, 0, 0.12], [0, 0.6, -0.05], 0.01); k.tube(M, [0, 0, -0.18], [0, 0.6, -0.05], 0.01); k.s(G, 0, 0.32, 0.02, 0.19, 1, 1.15, 0.24); k.s(G, 0, 0.58, 0.02, 0.15, 0.9, 1.0, 0.24); k.b(k.m('gloss', '#f2efe8'), 0.05, 0.3, 0.07, 0.12, 0.18, 0.005, 0.02); k.b(Wd, 0, 0.66, 0.03, 0.05, 0.55, 0.03, 0.006); k.b(k.m('matte', '#111'), 0, 1.2, 0.03, 0.08, 0.16, 0.025, 0.01); } },
  wall_shelf: { name: 'Floating Shelf', cat: 'Decorations', place: 'wall', solid: false, color: '#6b4630', build(k, c) { k.b(k.mm('wood', c), 0, 0, 0.12, 0.9, 0.04, 0.24, 0.008); books(k, -0.4, 0.05, 0.04, 0.12, 0.18, 7); k.c(k.m('ceramic', '#e9e4da'), 0.25, 0.04, 0.12, 0.05, 0.04, 0.1, 14); k.s(k.m('leaf', '#4f7d33'), 0.25, 0.18, 0.12, 0.08, 1.2, 0.8, 1.2); } },
  sneaker_rack: { name: 'Sneaker Rack', cat: 'Bedroom', color: '#1d1e22', build(k, c) { const M = k.mm('metal', c), W = k.m('wood', '#b88a5a'); for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(M, x * 0.58, 0, z * 0.15, 0.012, 0.012, 1.0, 8); for (const y of [0.05, 0.38, 0.7]) k.b(W, 0, y, 0, 1.2, 0.025, 0.34, 0.005); ['#c0392b', '#f5f5f2', '#2f3e5c', '#05cc8d', '#d4a24c', '#111111'].forEach((col, i) => sneaker(k, -0.3 + (i % 2) * 0.6, [0.075, 0.405, 0.725][(i / 2) | 0], 0, col)); } },
  wardrobe: { name: 'Wardrobe', cat: 'Bedroom', color: '#efece5', build(k, c) { const P = k.mm('paint', c); k.b(P, 0, 0.08, 0, 1.2, 2.0, 0.6, 0.01); k.b(k.m('matte', '#2a2826'), 0, 0, 0, 1.16, 0.08, 0.56, 0.004); k.b(P, 0, 2.08, 0, 1.26, 0.06, 0.64, 0.01); for (const s of [-1, 1]) { front(k, P, s * 0.3, 0.12, 0.31, 0.58, 1.92); k.b(k.m('brass'), s * 0.04, 1.0, 0.335, 0.014, 0.3, 0.014, 0.006); } } },
  beanbag: { name: 'Bean Bag', cat: 'Bedroom', color: '#d4a24c', anchors: [sit('Sit', 0, 0.36, 0.05)], build(k, c) { const F = k.mm('fabric', c); k.s(F, 0, 0.3, 0, 0.46, 1, 0.66, 1); k.s(k.m('fabric', shade(c, 0.9)), 0, 0.5, -0.18, 0.32, 1.1, 0.7, 0.7); } },
  headphone_stand: { name: 'Headphones on Stand', cat: 'Electronics', place: 'surface', solid: false, color: '#1b1c20', build(k, c) { const B = k.mm('plastic', c); k.c(B, 0, 0, 0, 0.06, 0.07, 0.015, 20); k.c(B, 0, 0.015, 0, 0.008, 0.008, 0.26, 8); k.t(B, 0, 0.27, 0, 0.08, 0.012, 0, Math.PI / 2, 0, Math.PI); for (const s of [-1, 1]) k.c(k.m('leather', '#2a2a2e'), 0, 0.17, s * 0.08, 0.045, 0.045, 0.04, 20, Math.PI / 2); } },
  mirror_floor: { name: 'Floor Mirror', cat: 'Bedroom', color: '#c9a24f', build(k, c) { k.b(k.mm('brass', c), 0, 0, 0, 0.7, 1.75, 0.04, 0.02, -0.08); k.b(k.m('mirror'), 0, 0.04, 0.025, 0.62, 1.67, 0.003, 0.001, -0.08); k.tube(k.m('brass', c), [0, 1.3, -0.08], [0, 0, -0.4], 0.012); } },
  bench_end: { name: 'Upholstered Bench', cat: 'Bedroom', color: '#c9b79c', anchors: [sit('Sit Left', -0.35, 0.47, 0.02), sit('Sit Right', 0.35, 0.47, 0.02)], build(k, c) { const F = k.mm('fabric', c), W = k.m('wood', '#4a3020'); k.b(F, 0, 0.32, 0, 1.3, 0.14, 0.42, 0.04); for (const x of [-1, 1]) for (const z of [-1, 1]) k.c(W, x * 0.6, 0, z * 0.17, 0.022, 0.016, 0.33, 8); } },
};