const cone = (k, x, y, z, r) => { k.c(k.m('matte', '#1a1a1c'), x, y, z, r, r, 0.01, 28, Math.PI / 2); k.t(k.m('rubber', '#2a2a2e'), x, y + 0.005, z + 0.008, r, r * 0.12); k.s(k.m('gloss', '#2f3034'), x, y + 0.005, z + 0.012, r * 0.3, 1, 1, 0.5); };

export default {
  studio_desk: {
    name: 'Studio Control Desk', cat: 'Studio', color: '#6b4630',
    build(k, c) {
      const W = k.mm('wood', c), Bk = k.m('matte', '#17181c');
      k.b(W, 0, 0.74, 0, 2.2, 0.04, 0.9, 0.02);
      for (const s of [-1, 1]) { k.b(Bk, s * 0.85, 0, 0.0, 0.48, 0.74, 0.8, 0.01); k.b(k.m('console'), s * 0.85, 0.12, 0.401, 0.44, 0.5, 0.004, 0.001); }
      k.b(Bk, 0, 0.78, 0.08, 1.24, 0.05, 0.56, 0.01, -0.08); k.b(k.m('console'), 0, 0.83, 0.08, 1.18, 0.004, 0.52, 0.001, -0.08);
      for (const s of [-1, 1]) k.b(W, s * 0.95, 0.78, -0.32, 0.06, 0.18, 0.2, 0.008);
      k.b(W, 0, 0.95, -0.32, 2.0, 0.035, 0.26, 0.01);
      k.light(0, 0.9, 0.2, 'screen');
    },
  },
  mixing_console: { name: 'Mixing Console', cat: 'Studio', place: 'surface', solid: false, color: '#17181c', build(k, c) { k.b(k.mm('matte', c), 0, 0, 0, 0.6, 0.06, 0.42, 0.01, -0.12); k.b(k.m('console'), 0, 0.062, 0, 0.56, 0.004, 0.38, 0.001, -0.12); } },
  studio_monitor: { name: 'Studio Monitor', cat: 'Studio', place: 'surface', solid: false, color: '#1d1f24', build(k, c) { k.b(k.mm('matte', c), 0, 0, 0, 0.22, 0.34, 0.26, 0.02); cone(k, 0, 0.12, 0.131, 0.085); cone(k, 0, 0.27, 0.131, 0.025); k.b(k.m('accent'), 0, 0.02, 0.131, 0.05, 0.008, 0.004, 0.002); } },
  speaker_stand: { name: 'Speaker Stand', cat: 'Studio', color: '#1d1f24', build(k, c) { const M = k.mm('metal', c); k.b(M, 0, 0, 0, 0.32, 0.02, 0.32, 0.006); k.c(M, 0, 0.02, 0, 0.03, 0.03, 0.96, 10); k.b(M, 0, 0.98, 0, 0.26, 0.02, 0.26, 0.006); } },
  computer_monitor: { name: 'Studio Screen', cat: 'Electronics', place: 'surface', solid: false, color: '#1b1c20', build(k, c) { const B = k.mm('plastic', c); k.b(B, 0, 0, -0.08, 0.26, 0.015, 0.16, 0.006); k.b(B, 0, 0.015, -0.1, 0.04, 0.18, 0.03, 0.006); k.b(B, 0, 0.13, -0.08, 0.82, 0.42, 0.025, 0.008); k.b(k.m('screen', 'daw'), 0, 0.145, -0.066, 0.79, 0.39, 0.002, 0.001); } },
  acoustic_panel: { name: 'Acoustic Panel', cat: 'Studio', place: 'wall', solid: false, color: '#3f4a5c', build(k, c) { k.b(k.mm('fabric', c), 0, 0, 0.04, 0.6, 1.2, 0.08, 0.03); } },
  diffuser: { name: 'Wood Diffuser', cat: 'Studio', place: 'wall', solid: false, color: '#b88a5a', build(k, c) { const W = k.mm('wood', c); k.b(k.m('wood', '#3b2a1e'), 0, 0, 0.01, 0.62, 0.62, 0.02, 0.004); for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) { const d = 0.02 + (((i * i + j * j * 3) % 7) / 7) * 0.08; k.b(W, -0.255 + i * 0.085, 0.015 + j * 0.085, 0.02 + d / 2, 0.08, 0.08, d, 0.004); } } },
  bass_trap: { name: 'Bass Trap', cat: 'Studio', color: '#3f4a5c', build(k, c) { k.c(k.mm('fabric', c), 0, 0, 0, 0.32, 0.32, 1.25, 3, 0, Math.PI / 6); } },
  booth_foam: { name: 'Acoustic Foam', cat: 'Studio', place: 'wall', solid: false, color: '#2a2b33', build(k, c) { const F = k.mm('foam', c); k.b(F, 0, 0, 0.015, 0.75, 1.2, 0.03, 0.006); for (let i = 0; i < 5; i++) for (let j = 0; j < 8; j++) k.c(F, -0.3 + i * 0.15, 0.075 + j * 0.15, 0.06, 0, 0.075, 0.07, 4, Math.PI / 2, Math.PI / 4); } },
  mic_booth: {
    name: 'Vocal Mic & Pop Filter', cat: 'Studio', solid: false, color: '#c9b27a', anchors: [['perform', 'Stand & Perform', 0, 0, 0.6, Math.PI]],
    build(k, c) {
      const Bk = k.m('matte', '#141416'), Ch = k.m('chrome'), Au = k.mm('metal', c);
      for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.tube(Bk, [0, 0.3, 0], [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3 - 0.05], 0.012); }
      k.c(Ch, 0, 0.3, 0, 0.012, 0.012, 1.2, 10); k.tube(Bk, [0, 1.5, 0], [0, 1.58, 0.22], 0.01);
      k.t(Ch, 0, 1.5, 0.22, 0.055, 0.005, Math.PI / 2); k.t(Ch, 0, 1.64, 0.22, 0.055, 0.005, Math.PI / 2);
      k.c(Au, 0, 1.46, 0.22, 0.026, 0.026, 0.18, 20); k.s(k.m('grille', '#8e8670'), 0, 1.68, 0.22, 0.031, 1, 1.4, 1);
      k.tube(Bk, [0, 1.3, 0.02], [0, 1.6, 0.38], 0.005);
      k.t(Bk, 0, 1.62, 0.4, 0.085, 0.007); k.c(k.m('glass', '#222222'), 0, 1.6185, 0.4, 0.082, 0.082, 0.003, 32, Math.PI / 2);
      k.t(k.m('plastic', '#1b1c20'), 0, 1.18, 0.0, 0.08, 0.01, 0, Math.PI / 2, 0, Math.PI);
      for (const s of [-1, 1]) k.c(k.m('leather', '#2a2a2e'), 0, 1.08, s * 0.08, 0.04, 0.04, 0.04, 20, Math.PI / 2);
    },
  },
  music_stand: { name: 'Music Stand', cat: 'Studio', solid: false, color: '#1d1e22', build(k, c) { const M = k.mm('metal', c); for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; k.tube(M, [0, 0.25, 0], [Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25], 0.008); } k.c(M, 0, 0.25, 0, 0.008, 0.008, 0.85, 8); k.b(M, 0, 1.02, 0, 0.48, 0.32, 0.008, 0.004, -0.35); k.b(k.m('sheet'), 0, 1.035, 0.012, 0.4, 0.28, 0.002, 0.001, -0.35); } },
  neon_onair: { name: 'ON AIR Neon', cat: 'Studio', place: 'wall', solid: false, color: '#ff3b5c', build(k, c) { k.b(k.m('glass', '#ffffff'), 0, 0, 0.01, 0.9, 0.32, 0.02, 0.004); k.b(k.mm('neon', `ON AIR|${c}`), 0, 0.005, 0.024, 0.88, 0.31, 0.001, 0.0005); } },
  neon_krush: { name: 'KRUSH Neon', cat: 'Decorations', place: 'wall', solid: false, color: '#a56bff', build(k, c) { k.b(k.m('glass', '#ffffff'), 0, 0, 0.01, 1.1, 0.38, 0.02, 0.004); k.b(k.mm('neon', `KRUSH|${c}`), 0, 0.005, 0.024, 1.08, 0.37, 0.001, 0.0005); } },
  accent_light: { name: 'Accent Light Bar', cat: 'Lighting', solid: false, color: '#1d1e22', build(k, c) { k.b(k.mm('metal', c), 0, 0, 0, 0.12, 0.04, 0.12, 0.01); k.c(k.m('accent'), 0, 0.04, 0, 0.02, 0.02, 1.2, 12); k.light(0, 0.7, 0, 'accent'); } },
};