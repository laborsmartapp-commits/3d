import * as THREE from 'three';

export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function tex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const memo = new Map();
const once = (k, f) => { if (!memo.has(k)) memo.set(k, f()); return memo.get(k); };

function specks(g, w, h, n, size, cols, r, a0 = 0.1, a1 = 0.4) {
  for (let i = 0; i < n; i++) { g.globalAlpha = a0 + r() * (a1 - a0); g.fillStyle = cols[(r() * cols.length) | 0]; const s = size * (0.4 + r()); g.fillRect(r() * w, r() * h, s, s); }
  g.globalAlpha = 1;
}
function planks(g, w, h, cols, rows, r) {
  const ph = h / rows;
  for (let i = 0; i < rows; i++) {
    let x = -r() * w;
    while (x < w) {
      const len = w * (0.3 + r() * 0.5);
      g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x, i * ph, len, ph);
      for (let k = 0; k < 8; k++) {
        g.globalAlpha = 0.08 + r() * 0.12; g.strokeStyle = r() > 0.5 ? '#2a1a0e' : '#fff7ea'; g.lineWidth = 0.6 + r();
        const y = i * ph + r() * ph; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 5, x + len * 0.7, y + (r() - 0.5) * 5, x + len, y); g.stroke();
      }
      g.globalAlpha = 0.45; g.fillStyle = '#24160c'; g.fillRect(x, i * ph, 1.5, ph); g.globalAlpha = 1;
      x += len;
    }
    g.globalAlpha = 0.5; g.fillStyle = '#24160c'; g.fillRect(0, i * ph, w, 1.5); g.globalAlpha = 1;
  }
}
function grid(g, w, h, n, m, base, grout, r, vary = 10) {
  const cw = w / n, ch = h / m;
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const c = new THREE.Color(base).offsetHSL(0, 0, (r() - 0.5) * vary / 100);
    g.fillStyle = `#${c.getHexString()}`; g.fillRect(i * cw, j * ch, cw, ch);
  }
  g.fillStyle = grout;
  for (let i = 0; i <= n; i++) g.fillRect(i * cw - 1.5, 0, 3, h);
  for (let j = 0; j <= m; j++) g.fillRect(0, j * ch - 1.5, w, 3);
}

const PAL = (c) => { const b = new THREE.Color(c); return [b, b.clone().offsetHSL(0.04, 0.05, 0.12), b.clone().offsetHSL(-0.05, -0.1, -0.15), new THREE.Color('#f3ead8')].map((x) => `#${x.getHexString()}`); };

export const T = {
  fabric: () => once('fabric', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#eeeeee'; g.fillRect(0, 0, w, h); const r = rng(3); for (let y = 0; y < h; y += 2) { g.globalAlpha = 0.07 + r() * 0.06; g.fillStyle = '#000'; g.fillRect(0, y, w, 1); } for (let x = 0; x < w; x += 3) { g.globalAlpha = 0.06; g.fillStyle = '#fff'; g.fillRect(x, 0, 1, h); } specks(g, w, h, 1200, 1.5, ['#ffffff', '#b8b8b8'], r); })),
  wood: () => once('wood', () => tex(512, 128, (g, w, h) => { g.fillStyle = '#f1e8db'; g.fillRect(0, 0, w, h); const r = rng(5); for (let i = 0; i < 80; i++) { g.globalAlpha = 0.07 + r() * 0.16; g.strokeStyle = '#9a7a56'; g.lineWidth = 0.5 + r() * 1.6; g.beginPath(); const y = r() * h; g.moveTo(0, y); for (let x = 0; x <= w; x += 24) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 2.5); g.stroke(); } g.globalAlpha = 1; })),
  oak: () => once('oak', () => tex(512, 512, (g, w, h) => planks(g, w, h, ['#c49a6c', '#b98d60', '#caa375', '#ad8256', '#c19468'], 11, rng(11)))),
  walnut: () => once('walnut', () => tex(512, 512, (g, w, h) => planks(g, w, h, ['#6e4a33', '#7a5239', '#5f402c', '#704b35'], 11, rng(12)))),
  porch: () => once('porch', () => tex(512, 512, (g, w, h) => planks(g, w, h, ['#8a6e55', '#7f654e', '#937559'], 14, rng(13)))),
  tile: () => once('tile', () => tex(512, 512, (g, w, h) => grid(g, w, h, 3, 3, '#ece7de', '#bdb5a8', rng(14), 6))),
  mosaic: () => once('mosaic', () => tex(512, 512, (g, w, h) => grid(g, w, h, 12, 12, '#e6eef0', '#aeb9bc', rng(15), 8))),
  marble: () => once('marble', () => tex(512, 512, (g, w, h) => { g.fillStyle = '#f4f3f0'; g.fillRect(0, 0, w, h); const r = rng(16); for (let i = 0; i < 26; i++) { g.globalAlpha = 0.06 + r() * 0.18; g.strokeStyle = r() > 0.7 ? '#b9a58a' : '#8d9298'; g.lineWidth = 0.5 + r() * 2; g.beginPath(); let x = r() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (r() - 0.45) * 40; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1; })),
  carpet: () => once('carpet', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#e8e8e8'; g.fillRect(0, 0, w, h); specks(g, w, h, 5000, 1.2, ['#ffffff', '#bbbbbb', '#d4d4d4'], rng(17), 0.2, 0.6); })),
  siding: () => once('siding', () => tex(256, 256, (g, w, h) => { const b = h / 10; for (let i = 0; i < 10; i++) { const gr = g.createLinearGradient(0, i * b, 0, (i + 1) * b); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.85, '#ececec'); gr.addColorStop(1, '#a9a9a9'); g.fillStyle = gr; g.fillRect(0, i * b, w, b); } specks(g, w, h, 600, 1, ['#ffffff', '#cfcfcf'], rng(18), 0.05, 0.2); })),
  shingles: () => once('shingles', () => tex(512, 512, (g, w, h) => { const r = rng(19), rows = 10, rh = h / rows; g.fillStyle = '#2b2e34'; g.fillRect(0, 0, w, h); for (let j = 0; j < rows; j++) { let x = j % 2 ? -42 : 0; while (x < w) { const tw = 70 + r() * 30, v = 70 + r() * 30; g.fillStyle = `rgb(${v},${v + 3},${v + 10})`; g.fillRect(x + 2, j * rh + 2, tw - 4, rh - 3); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x + 2, j * rh + rh - 8, tw - 4, 6); x += tw; } } specks(g, w, h, 3000, 1.4, ['#9aa0a8', '#3a3d44'], r, 0.1, 0.4); })),
  brick: () => once('brick', () => tex(256, 256, (g, w, h) => { const r = rng(20); g.fillStyle = '#b9ab9b'; g.fillRect(0, 0, w, h); for (let j = 0; j < 8; j++) for (let i = -1; i < 5; i++) { const x = i * 64 + (j % 2) * 32; g.fillStyle = ['#9c4a36', '#a8553f', '#8e3f2e', '#b0634b'][(r() * 4) | 0]; g.fillRect(x + 2, j * 32 + 2, 60, 28); } specks(g, w, h, 800, 1.6, ['#000', '#fff'], r, 0.05, 0.15); })),
  stone: () => once('stone', () => tex(256, 256, (g, w, h) => { const r = rng(21); g.fillStyle = '#7d766d'; g.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { const c = ['#a59c8f', '#b8afa1', '#958c80', '#c4bcb0'][(r() * 4) | 0]; g.fillStyle = c; g.beginPath(); g.ellipse(r() * w, r() * h, 18 + r() * 22, 10 + r() * 14, r() * 3, 0, Math.PI * 2); g.fill(); } })),
  pavers: () => once('pavers', () => tex(512, 512, (g, w, h) => grid(g, w, h, 5, 5, '#c9bba4', '#8f8574', rng(22), 12))),
  concrete: () => once('concrete', () => tex(512, 512, (g, w, h) => { g.fillStyle = '#c9c7c2'; g.fillRect(0, 0, w, h); specks(g, w, h, 6000, 1.5, ['#ffffff', '#9e9c97'], rng(23), 0.05, 0.25); g.fillStyle = '#8e8c87'; g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h); })),
  asphalt: () => once('asphalt', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#3b3d42'; g.fillRect(0, 0, w, h); specks(g, w, h, 5000, 1.4, ['#55585e', '#25272b', '#6a6c70'], rng(24), 0.2, 0.6); })),
  grass: () => once('grass', () => tex(512, 512, (g, w, h) => { const r = rng(25); g.fillStyle = '#5f8f3e'; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.strokeStyle = ['#6fa047', '#4f7d33', '#7cb050', '#58893a', '#86b85a'][(r() * 5) | 0]; g.globalAlpha = 0.5 + r() * 0.5; g.lineWidth = 1 + r(); const x = r() * w, y = r() * h; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 3, y - 3 - r() * 5); g.stroke(); } g.globalAlpha = 1; })),
  mulch: () => once('mulch', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#4a3324'; g.fillRect(0, 0, w, h); specks(g, w, h, 3000, 3, ['#6b4a32', '#3a271b', '#7d5a3d'], rng(26), 0.4, 0.9); })),
  beadboard: () => once('bead', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.18)'; for (let x = 0; x < w; x += 16) g.fillRect(x, 0, 2, h); })),
  fence: () => once('fence', () => tex(256, 256, (g, w, h) => { const r = rng(27); for (let x = 0; x < w; x += 18) { const v = 215 + r() * 40; g.fillStyle = `rgb(${v},${v - 8},${v - 20})`; g.fillRect(x, 0, 17, h); g.fillStyle = 'rgba(40,25,10,0.5)'; g.fillRect(x + 17, 0, 1.5, h); } specks(g, w, h, 1500, 1, ['#8a6a4a'], r); })),
  wicker: () => once('wicker', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#d9d0c4'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 16) { g.fillStyle = (x / 16 + y / 8) % 2 ? '#f4efe8' : '#b9ae9e'; g.fillRect(x, y, 14, 6); } })),
  foam: () => once('foam', () => tex(128, 128, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { const gr = g.createRadialGradient(x * 16 + 8, y * 16 + 8, 1, x * 16 + 8, y * 16 + 8, 10); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#6a6a6a'); g.fillStyle = gr; g.fillRect(x * 16, y * 16, 16, 16); } })),
  led: () => once('led', () => tex(256, 128, (g, w, h) => { g.fillStyle = '#000'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 8) for (let y = 0; y < h; y += 8) { g.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(x * 0.05 + y * 0.03)); g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 4, y + 4, 2.4, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; }, false)),
  rug: (c) => once(`rug${c}`, () => tex(512, 340, (g, w, h) => { const [a, b, d, cr] = PAL(c), r = rng(c.length * 31); g.fillStyle = a; g.fillRect(0, 0, w, h); g.strokeStyle = cr; g.lineWidth = 14; g.strokeRect(22, 22, w - 44, h - 44); g.strokeStyle = d; g.lineWidth = 5; g.strokeRect(44, 44, w - 88, h - 88); for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) { const x = 100 + i * 78, y = 100 + j * 70; g.fillStyle = (i + j) % 2 ? b : d; g.beginPath(); g.moveTo(x, y - 24); g.lineTo(x + 24, y); g.lineTo(x, y + 24); g.lineTo(x - 24, y); g.fill(); } specks(g, w, h, 4000, 1.4, ['#ffffff', '#000000'], r, 0.04, 0.12); })),
  art: (c) => once(`art${c}`, () => tex(400, 280, (g, w, h) => { const [a, b, d] = PAL(c), r = rng(c.length * 7); g.fillStyle = '#f2ebde'; g.fillRect(0, 0, w, h); for (const col of [a, b, d, '#e0a458', '#2f4858']) { g.fillStyle = col; g.globalAlpha = 0.85; g.beginPath(); g.ellipse(r() * w, r() * h, 40 + r() * 90, 30 + r() * 70, r() * 3, 0, Math.PI * 2); g.fill(); } g.globalAlpha = 1; g.strokeStyle = '#1d1d1d'; g.lineWidth = 4; g.beginPath(); g.arc(w * 0.6, h * 0.45, 70, 0.4, 3.6); g.stroke(); })),
  poster: (c) => once(`poster${c}`, () => tex(300, 450, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c); gr.addColorStop(1, '#14121c'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.arc(w / 2, h * 0.4, 110, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = '900 72px Inter, Arial'; g.textAlign = 'center'; g.fillText('KRUSH', w / 2, h * 0.78); g.font = '600 20px Inter, Arial'; g.fillText('WORLD TOUR', w / 2, h * 0.86); })),
  photo: (c) => once(`photo${c}`, () => tex(128, 160, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#8ec0ea'); gr.addColorStop(1, c); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2b33'; for (const [x, s] of [[44, 1], [84, 0.85]]) { g.beginPath(); g.arc(x, 82 - 10 * s, 14 * s, 0, Math.PI * 2); g.fill(); g.fillRect(x - 18 * s, 96 - 10 * s, 36 * s, 70); } })),
  screen: (k) => once(`screen${k}`, () => tex(512, 288, (g, w, h) => {
    const r = rng(k.length * 13);
    if (k === 'tv') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a2a6a'); gr.addColorStop(0.6, '#ff7a59'); gr.addColorStop(1, '#ffd27a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = '#1b1430'; g.beginPath(); g.arc(w * 0.7, h * 0.62, 60, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; g.font = '900 64px Inter, Arial'; g.fillText('KRUSH', 36, 100); return; }
    g.fillStyle = '#0d1016'; g.fillRect(0, 0, w, h);
    if (k === 'daw') { for (let i = 0; i < 8; i++) { g.fillStyle = '#1b2030'; g.fillRect(0, 20 + i * 32, w, 28); for (let x = 60; x < w; x += 40 + r() * 80) { const cw = 30 + r() * 90; g.fillStyle = ['#05cc8d', '#a56bff', '#ff7a59', '#38bdf8'][i % 4]; g.globalAlpha = 0.85; g.fillRect(x, 22 + i * 32, cw, 24); g.globalAlpha = 1; g.strokeStyle = '#0d1016'; g.beginPath(); for (let t = 0; t < cw; t += 3) g.lineTo(x + t, 34 + i * 32 + Math.sin(t * 0.4 + i) * 9 * r()); g.stroke(); x += cw; } } return; }
    for (let i = 0; i < 26; i++) { g.fillStyle = ['#05cc8d', '#a56bff', '#e5e7eb', '#f59e0b', '#38bdf8'][(r() * 5) | 0]; g.fillRect(20 + (i % 3) * 16, 14 + i * 10, 60 + r() * 260, 5); }
  })),
  console: () => once('console', () => tex(512, 256, (g, w, h) => { g.fillStyle = '#16181d'; g.fillRect(0, 0, w, h); for (let i = 0; i < 24; i++) { const x = 12 + i * 20.5; for (let k = 0; k < 4; k++) { g.fillStyle = '#c9ccd2'; g.beginPath(); g.arc(x + 6, 20 + k * 22, 5, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#05080c'; g.fillRect(x + 4, 120, 4, 110); g.fillStyle = '#e8e8e8'; g.fillRect(x, 150 + (i * 37) % 60, 12, 8); for (let k = 0; k < 10; k++) { g.fillStyle = k > 7 ? '#ff4d4d' : k > 5 ? '#ffd24d' : '#3dff8a'; g.globalAlpha = k < 3 + (i * 7) % 7 ? 1 : 0.15; g.fillRect(x + 2, 110 - k * 2.2, 8, 1.5); } g.globalAlpha = 1; } })),
  keys: () => once('keys', () => tex(512, 64, (g, w, h) => { g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, w, h); g.fillStyle = '#9a9a9a'; for (let x = 0; x < w; x += 9.7) g.fillRect(x, 0, 1, h); g.fillStyle = '#111'; for (let i = 0; i < 52; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) g.fillRect(i * 9.7 + 6.5, 0, 6, h * 0.6); })),
  sheet: () => once('sheet', () => tex(128, 160, (g, w, h) => { g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, w, h); g.fillStyle = '#333'; for (let j = 0; j < 7; j++) for (let k = 0; k < 5; k++) g.fillRect(10, 14 + j * 20 + k * 3, w - 20, 0.8); })),
  neon: (text, c) => once(`neon${text}${c}`, () => tex(512, 180, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = '800 110px Inter, Arial'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = c; g.shadowBlur = 30; g.fillStyle = c; g.fillText(text, w / 2, h / 2); g.shadowBlur = 8; g.fillStyle = '#ffffff'; g.fillText(text, w / 2, h / 2); })),
  vinyl: () => once('vinyl', () => tex(256, 256, (g, w, h) => { g.fillStyle = '#0c0c0e'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.08)'; for (let r = 30; r < 128; r += 3) { g.beginPath(); g.arc(128, 128, r, 0, Math.PI * 2); g.stroke(); } g.fillStyle = '#05cc8d'; g.beginPath(); g.arc(128, 128, 34, 0, Math.PI * 2); g.fill(); })),
};