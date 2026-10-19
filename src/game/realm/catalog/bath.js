import { shade } from '../kit';

const sit = (l, x, y, z, ry = 0) => ['sit', l, x, y, z, ry];

function vanity(k, c, W) {
  const Wd = k.mm('wood', c), T = k.m('marble', '#f3f0ea'), Ce = k.m('ceramic', '#fbfbf8'), Ch = k.m('chrome'), D = 0.55;
  k.b(Wd, 0, 0.1, 0, W, 0.7, D, 0.01);
  const n = W > 1.4 ? 4 : W > 0.8 ? 2 : 1, fw = W / n;
  for (let i = 0; i < n; i++) { const x = -W / 2 + fw * (i + 0.5); k.b(k.m('wood', shade(c, 1.15)), x, 0.14, D / 2 + 0.005, fw - 0.03, 0.62, 0.01, 0.004); k.b(k.m('brass'), x, 0.68, D / 2 + 0.02, 0.12, 0.012, 0.012, 0.005); }
  k.b(T, 0, 0.8, 0, W + 0.02, 0.04, D + 0.02, 0.006);
  const sinks = W > 1.4 ? [-W / 4, W / 4] : [0];
  for (const x of sinks) { k.s(Ce, x, 0.842, 0.03, 0.2, 1, 0.08, 0.7); k.s(k.m('ceramic', '#dfe7ea'), x, 0.846, 0.03, 0.17, 1, 0.05, 0.6); k.c(Ch, x, 0.84, -0.18, 0.015, 0.02, 0.2, 12); k.tube(Ch, [x, 1.02, -0.18], [x, 1.02, -0.06], 0.012); }
}

export default {
  bathtub: {
    name: 'Bathtub', cat: 'Bathroom', color: '#fbfbf8',
    build(k, c) { const Ce = k.mm('ceramic', c), Ch = k.m('chrome'); for (const s of [-1, 1]) { k.b(Ce, 0, 0, s * 0.36, 1.7, 0.58, 0.08, 0.035); k.b(Ce, s * 0.81, 0, 0, 0.08, 0.58, 0.8, 0.035); } k.b(Ce, 0, 0, 0, 1.62, 0.14, 0.72, 0.03); k.b(k.m('gloss', '#cfe4ea'), 0, 0.14, 0, 1.6, 0.18, 0.7, 0.02); k.c(Ch, -0.7, 0.58, 0, 0.02, 0.02, 0.18, 12); k.tube(Ch, [-0.7, 0.76, 0], [-0.58, 0.76, 0], 0.014); },
  },
  shower: {
    name: 'Walk-in Shower', cat: 'Bathroom', color: '#e8eef0',
    build(k, c) { const T = k.mm('ceramic', c), G = k.m('glass', '#d8eef5'), Ch = k.m('chrome'); k.b(k.m('ceramic', '#f7f7f4'), 0, 0, 0, 1.0, 0.06, 1.0, 0.02); k.b(T, 0, 0.06, -0.48, 1.0, 2.0, 0.04, 0.005); k.b(T, -0.48, 0.06, 0, 0.04, 2.0, 1.0, 0.005); k.b(G, 0.1, 0.06, 0.49, 0.8, 1.9, 0.012, 0.002); k.b(G, 0.49, 0.06, 0, 0.012, 1.9, 1.0, 0.002); k.b(Ch, 0.49, 1.96, 0, 0.02, 0.02, 1.0, 0.005); k.b(Ch, 0.1, 1.96, 0.49, 0.8, 0.02, 0.02, 0.005); k.tube(Ch, [0, 1.95, -0.46], [0, 1.95, -0.2], 0.012); k.c(Ch, 0, 1.9, -0.2, 0.1, 0.1, 0.02, 24); k.c(Ch, 0, 1.0, -0.46, 0.04, 0.04, 0.03, 16, Math.PI / 2); k.b(k.m('ceramic', '#cfd8db'), -0.3, 1.1, -0.45, 0.4, 0.25, 0.02, 0.004); },
  },
  toilet: {
    name: 'Toilet', cat: 'Bathroom', color: '#fbfbf8', anchors: [sit('Sit', 0, 0.42, 0.08)],
    build(k, c) { const Ce = k.mm('ceramic', c); const b = k.lathe(Ce, 'toilet', [[0, 0], [0.12, 0], [0.13, 0.18], [0.19, 0.38], [0.19, 0.4], [0, 0.4]]); b.position.z = 0.06; b.scale.z = 1.3; const s = k.t(Ce, 0, 0.41, 0.07, 0.15, 0.025, Math.PI / 2); s.scale.y = 1.3; k.b(Ce, 0, 0.38, -0.23, 0.42, 0.4, 0.18, 0.03); k.b(Ce, 0, 0.78, -0.23, 0.44, 0.03, 0.2, 0.01); k.c(k.m('chrome'), 0, 0.81, -0.23, 0.02, 0.02, 0.01, 12); },
  },
  vanity: { name: 'Vanity', cat: 'Bathroom', color: '#6b4630', build: (k, c) => vanity(k, c, 1.2) },
  vanity_double: { name: 'Double Vanity', cat: 'Bathroom', color: '#2f3e5c', build: (k, c) => vanity(k, c, 1.6) },
  vanity_small: { name: 'Small Vanity', cat: 'Bathroom', color: '#efece5', build: (k, c) => vanity(k, c, 0.7) },
  towel_rack: { name: 'Towel Rack', cat: 'Bathroom', place: 'wall', solid: false, color: '#9fc5c9', build(k, c) { const Ch = k.m('chrome'), F = k.mm('fabric', c); k.tube(Ch, [-0.35, 0.3, 0.08], [0.35, 0.3, 0.08], 0.012); for (const x of [-0.35, 0.35]) k.tube(Ch, [x, 0.3, 0], [x, 0.3, 0.08], 0.01); for (const x of [-0.16, 0.16]) { k.b(F, x, 0.0, 0.11, 0.28, 0.32, 0.03, 0.01); k.b(F, x, 0.0, 0.05, 0.28, 0.32, 0.03, 0.01); } } },
  bath_mat: { name: 'Bath Mat', cat: 'Bathroom', solid: false, color: '#9fc5c9', build(k, c) { k.b(k.mm('carpet', c), 0, 0, 0, 0.8, 0.015, 0.5, 0.006); } },
  toiletries: { name: 'Toiletries', cat: 'Bathroom', place: 'surface', solid: false, color: '#f2e9dc', build(k, c) { k.b(k.m('wood', '#6b4630'), 0, 0, 0, 0.3, 0.015, 0.12, 0.004); k.c(k.mm('ceramic', c), -0.08, 0.015, 0, 0.03, 0.03, 0.14, 14); k.c(k.m('chrome'), -0.08, 0.155, 0, 0.006, 0.006, 0.04, 6); k.c(k.m('plastic', '#4f7d7a'), 0.02, 0.015, 0, 0.025, 0.025, 0.17, 14); k.c(k.m('plastic', '#d9a6a0'), 0.1, 0.015, 0, 0.022, 0.022, 0.12, 14); } },
};