import * as THREE from 'three';
import { rng } from './layout';

// Star Square surfaces: worn black asphalt, slab concrete, red and dark brick, sandstone, pastel and
// patched stucco, black marble, white stone, glass curtain walls with lit-window masks, and the
// lit rooms seen through windows. Every texture is generated once and shared.
function cv(w, h, draw, seed) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), rng(seed), w, h); return c; }
function tx(c, color = true) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; if (color) t.colorSpace = THREE.SRGBColorSpace; return t; }
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, ...o });
const shade = (hex, k) => `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
const speck = (g, r, S, n, cols, sz = 2) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(r() * S, r() * S, sz * (0.5 + r()), sz * (0.5 + r())); } };
function surf(draw, seed, S, o = {}, bump = 0.8) {
  const map = tx(cv(S, S, (g, r) => draw(g, r, S, false), seed)), bumpMap = tx(cv(S, S, (g, r) => draw(g, r, S, true), seed), false);
  return std({ map, bumpMap, bumpScale: bump, ...o });
}

const asphalt = (g, r, S, b) => {
  g.fillStyle = b ? '#777' : '#26272a'; g.fillRect(0, 0, S, S);
  speck(g, r, S, 9000, b ? ['#999', '#555', '#888'] : ['#303134', '#1c1d1f', '#3a3a3c', '#2a2b2e', '#46464a'], 2);
  for (let i = 0; i < 5; i++) { g.fillStyle = b ? 'rgba(90,90,90,0.5)' : `rgba(${r() < 0.5 ? '18,18,20' : '52,52,56'},0.55)`; g.fillRect(r() * S, r() * S, 40 + r() * 140, 30 + r() * 90); }
  g.strokeStyle = b ? '#444' : 'rgba(10,10,12,0.9)'; g.lineWidth = 3;
  for (let i = 0; i < 4; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 8; k++) { x += (r() - 0.5) * 60; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke(); }
  if (!b) for (let i = 0; i < 3; i++) { const x = r() * S, y = r() * S, gr = g.createRadialGradient(x, y, 0, x, y, 30 + r() * 30); gr.addColorStop(0, 'rgba(8,8,10,0.5)'); gr.addColorStop(1, 'rgba(8,8,10,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
};
const slabs = (base, cell) => (g, r, S, b) => {
  g.fillStyle = b ? '#999' : base; g.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += cell) for (let x = 0; x < S; x += cell) { g.fillStyle = b ? '#a8a8a8' : shade(base, 0.86 + r() * 0.2); g.fillRect(x + 2, y + 2, cell - 4, cell - 4); }
  speck(g, r, S, 2500, b ? ['#888', '#b0b0b0'] : ['rgba(60,58,55,0.25)', 'rgba(200,195,188,0.2)'], 2);
  g.strokeStyle = b ? '#555' : 'rgba(40,38,36,0.55)'; g.lineWidth = 1.5;
  for (let i = 0; i < 7; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  if (!b) for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(30,28,26,0.35)'; g.beginPath(); g.arc(r() * S, r() * S, 1.5 + r() * 2.5, 0, 7); g.fill(); }
};
const brick = (base, mortar, soot = 0.3) => (g, r, S, b) => {
  g.fillStyle = b ? '#333' : mortar; g.fillRect(0, 0, S, S);
  const bh = S / 16, bw = S / 6;
  for (let y = 0; y < 16; y++) for (let x = -(y % 2) * bw / 2; x < S; x += bw) { g.fillStyle = b ? '#ccc' : shade(base, 0.78 + r() * 0.34); g.fillRect(x + 1.5, y * bh + 1.5, bw - 3, bh - 3); }
  if (!b) {
    const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, `rgba(20,16,14,${soot})`); gr.addColorStop(0.5, 'rgba(20,16,14,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S);
    for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '230,225,215' : '40,30,26'},0.12)`; g.fillRect(r() * S, r() * S, 10 + r() * 50, 6 + r() * 20); }
  }
};
const blocks = (base, rows, soft = 0) => (g, r, S, b) => {
  g.fillStyle = b ? '#444' : shade(base, 0.7); g.fillRect(0, 0, S, S);
  const h = S / rows;
  for (let y = 0; y < rows; y++) { let x = y % 2 ? -40 : 0; while (x < S) { const w = 70 + r() * 90; g.fillStyle = b ? '#bbb' : shade(base, 0.88 + r() * 0.16); g.fillRect(x + 2, y * h + 2, w - 4, h - 4); x += w; } }
  speck(g, r, S, 1800, b ? ['#999'] : ['rgba(0,0,0,0.08)', 'rgba(255,255,255,0.06)'], 3);
  if (soft && !b) { const gr = g.createLinearGradient(0, S, 0, 0); gr.addColorStop(0, 'rgba(40,30,25,0.25)'); gr.addColorStop(0.35, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
};
const stucco = (base, worn) => (g, r, S, b) => {
  g.fillStyle = b ? '#808080' : base; g.fillRect(0, 0, S, S);
  speck(g, r, S, 3000, b ? ['#8a8a8a', '#767676'] : ['rgba(255,255,255,0.07)', 'rgba(90,70,60,0.07)'], 3);
  for (let i = 0; i < (worn ? 9 : 2); i++) { g.fillStyle = b ? '#8e8e8e' : shade(base, 0.9 + r() * 0.14); g.fillRect(r() * S, r() * S, 20 + r() * 70, 14 + r() * 50); }
  if (worn && !b) { g.strokeStyle = 'rgba(70,55,48,0.4)'; g.lineWidth = 1; for (let i = 0; i < 6; i++) { g.beginPath(); let x = r() * S, y = r() * S; g.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 30; y += r() * 25; g.lineTo(x, y); } g.stroke(); } const gr = g.createLinearGradient(0, S, 0, 0); gr.addColorStop(0, 'rgba(200,190,170,0.35)'); gr.addColorStop(0.3, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); }
};
const marble = (base, vein) => (g, r, S, b) => {
  g.fillStyle = b ? '#888' : base; g.fillRect(0, 0, S, S);
  g.strokeStyle = b ? '#777' : vein; for (let i = 0; i < 14; i++) { g.lineWidth = 0.5 + r() * 1.5; g.beginPath(); let x = r() * S, y = 0; g.moveTo(x, y); while (y < S) { x += (r() - 0.5) * 30; y += 10 + r() * 20; g.lineTo(x, y); } g.stroke(); }
  g.fillStyle = b ? '#666' : 'rgba(0,0,0,0.3)'; for (let y = 0; y < S; y += S / 2) g.fillRect(0, y, S, 2);
};
const ribs = (g, r, S, b) => { for (let y = 0; y < S; y += 8) { g.fillStyle = b ? (y % 16 ? '#ddd' : '#333') : shade('#6a6f73', y % 16 ? 1.05 : 0.8); g.fillRect(0, y, S, 8); } if (!b) speck(g, r, S, 400, ['rgba(120,70,40,0.25)', 'rgba(20,20,20,0.3)'], 4); };

// Curtain wall: mullion grid + a lit-window mask in believable floor clusters (~25% lit).
function curtain(seed, glass, lit, ratio) {
  const S = 512, cols = 16, rows = 8, cw = S / cols, rh = S / rows, r = rng(seed);
  const on = Array.from({ length: rows }, () => { const f = r(); return Array.from({ length: cols }, (_, c) => f < 0.25 ? r() < 0.8 : Math.sin(c * 0.7 + f * 20) > 1 - ratio * 2.4 && r() < 0.8); });
  const map = tx(cv(S, S, (g) => {
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const gr = g.createLinearGradient(0, y * rh, 0, (y + 1) * rh); gr.addColorStop(0, shade(glass, 1.25)); gr.addColorStop(1, shade(glass, 0.7)); g.fillStyle = gr; g.fillRect(x * cw, y * rh, cw, rh); }
    g.fillStyle = '#3a4048'; for (let x = 0; x < cols; x++) g.fillRect(x * cw, 0, 3, S); for (let y = 0; y < rows; y++) g.fillRect(0, y * rh, S, 7);
  }, seed));
  const emissiveMap = tx(cv(S, S, (g) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (on[y][x]) {
      const gr = g.createLinearGradient(0, y * rh + 7, 0, (y + 1) * rh); gr.addColorStop(0, lit); gr.addColorStop(0.7, shade(lit, 0.55)); gr.addColorStop(1, shade(lit, 0.3)); g.fillStyle = gr; g.fillRect(x * cw + 3, y * rh + 7, cw - 3, rh - 7);
      g.fillStyle = 'rgba(0,0,0,0.45)'; if (r() < 0.4) g.fillRect(x * cw + 6 + r() * 12, y * rh + rh * 0.6, 10, rh * 0.4);
    }
  }, seed + 1));
  // Boxes tile it every 24 m; the texture spans 24 m × 28.8 m (8 floors of 3.6 m).
  map.repeat.set(1, 24 / 28.8); emissiveMap.repeat.set(1, 24 / 28.8);
  return std({ map, emissiveMap, emissive: '#ffffff', emissiveIntensity: 0.9, roughness: 0.18, metalness: 0.65, envMapIntensity: 1.1 });
}
// Rooms seen through one window: lamp glow, ceiling light, curtain edge, furniture shadow.
function room(seed, wall, lamp, kind) {
  const map = tx(cv(96, 128, (g, r, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(wall, 1.1)); gr.addColorStop(1, shade(wall, 0.55)); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    const lg = g.createRadialGradient(W * (0.3 + r() * 0.4), H * 0.2, 2, W / 2, H * 0.2, W * 0.8); lg.addColorStop(0, lamp); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(20,14,10,0.55)';
    if (kind === 'office') { g.fillRect(0, H * 0.06, W, 5); g.fillRect(8, H * 0.62, W - 16, 6); g.fillRect(16, H * 0.66, 5, H * 0.34); g.fillRect(W - 22, H * 0.66, 5, H * 0.34); }
    else if (kind === 'hotel') { g.fillRect(W * 0.15, H * 0.55, W * 0.7, H * 0.18); g.fillStyle = 'rgba(120,40,60,0.5)'; g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H); }
    else { g.fillRect(W * 0.55, H * 0.6, W * 0.3, H * 0.4); g.fillStyle = 'rgba(160,90,60,0.45)'; g.fillRect(0, 0, 12, H); g.fillRect(W * 0.2, H * 0.3, 16, 20); }
  }, seed), true);
  return std({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 1.05, roughness: 0.3 });
}
// Shop interiors seen through storefront glass.
const INTERIOR = {
  boutique: ['#f2e6d8', '#fff4e0', (g, r, W, H) => { for (let i = 0; i < 5; i++) { const x = 20 + i * 48; g.fillStyle = 'rgba(40,30,30,0.6)'; g.fillRect(x, H * 0.35, 3, H * 0.55); g.beginPath(); g.ellipse(x + 1, H * 0.3, 7, 9, 0, 0, 7); g.fill(); g.fillStyle = ['#b04a6a', '#2e3b6e', '#d9b36a', '#e8e0d4', '#6b2c2c'][i]; g.fillRect(x - 9, H * 0.38, 20, H * 0.3); } }],
  records: ['#3a2a22', '#ffcf8a', (g, r, W, H) => { for (let i = 0; i < 40; i++) { g.fillStyle = `hsl(${r() * 360},55%,${35 + r() * 25}%)`; g.fillRect((i % 10) * 25 + 4, H * 0.55 + Math.floor(i / 10) * 13, 20, 12); } for (let i = 0; i < 6; i++) { g.fillStyle = `hsl(${r() * 360},60%,45%)`; g.fillRect(10 + i * 40, 10, 30, 30); } }],
  cafe: ['#6b4a36', '#ffd9a0', (g, r, W, H) => { g.fillStyle = 'rgba(30,20,15,0.6)'; g.fillRect(0, H * 0.62, W, H * 0.38); for (let i = 0; i < 5; i++) { g.fillStyle = '#ffe7b8'; g.beginPath(); g.arc(25 + i * 50, 18, 6, 0, 7); g.fill(); } for (let i = 0; i < 8; i++) { g.fillStyle = 'rgba(240,230,210,0.7)'; g.fillRect(12 + i * 30, H * 0.55, 10, 8); } }],
  bar: ['#2a1a22', '#ffae5c', (g, r, W, H) => { for (let y = 0; y < 3; y++) for (let i = 0; i < 18; i++) { g.fillStyle = `hsla(${20 + r() * 60},80%,${40 + r() * 30}%,0.8)`; g.fillRect(8 + i * 14, 14 + y * 22, 6, 16); } g.fillStyle = 'rgba(10,6,8,0.7)'; g.fillRect(0, H * 0.7, W, H * 0.3); }],
  gallery: ['#ecebe6', '#ffffff', (g, r, W, H) => { for (let i = 0; i < 4; i++) { g.fillStyle = `hsl(${r() * 360},50%,50%)`; g.fillRect(14 + i * 62, 22, 40, 46); g.strokeStyle = '#222'; g.strokeRect(14 + i * 62, 22, 40, 46); } }],
  lobby: ['#e7d6c4', '#ffe6c0', (g, r, W, H) => { g.fillStyle = '#5a3c2c'; g.fillRect(W * 0.3, H * 0.6, W * 0.4, H * 0.3); g.fillStyle = 'rgba(255,240,200,0.9)'; g.beginPath(); g.arc(W / 2, 14, 12, 0, 7); g.fill(); for (let x = 0; x < W; x += 16) { g.fillStyle = x % 32 ? '#d8c8b4' : '#b9a38a'; g.fillRect(x, H * 0.9, 16, H * 0.1); } }],
  pizza: ['#8a4a2c', '#ffb060', (g, r, W, H) => { const o = g.createRadialGradient(W * 0.7, H * 0.5, 4, W * 0.7, H * 0.5, 50); o.addColorStop(0, '#ffd070'); o.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = o; g.fillRect(0, 0, W, H); for (let x = 0; x < W; x += 12) { g.fillStyle = x % 24 ? '#f4efe6' : '#2c7d5a'; g.fillRect(x, H * 0.72, 12, 12); } }],
  tattoo: ['#1e1a24', '#d8a8ff', (g, r, W, H) => { for (let i = 0; i < 15; i++) { g.fillStyle = '#efe6d2'; g.fillRect(8 + (i % 5) * 50, 10 + Math.floor(i / 5) * 30, 38, 26); g.strokeStyle = `hsl(${r() * 360},60%,40%)`; g.lineWidth = 2; g.beginPath(); g.arc(27 + (i % 5) * 50, 23 + Math.floor(i / 5) * 30, 7, 0, 5); g.stroke(); } }],
  comics: ['#2a2e4a', '#fff0c0', (g, r, W, H) => { for (let i = 0; i < 36; i++) { g.fillStyle = `hsl(${r() * 360},75%,55%)`; g.fillRect(6 + (i % 12) * 21, 10 + Math.floor(i / 12) * 36, 17, 28); } }],
  jewel: ['#141018', '#f3e2b0', (g, r, W, H) => { for (let i = 0; i < 4; i++) { const x = 30 + i * 60, gr = g.createRadialGradient(x, H * 0.55, 1, x, H * 0.55, 22); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,230,160,0)'); g.fillStyle = gr; g.fillRect(x - 25, H * 0.3, 50, 50); g.fillStyle = 'rgba(200,190,170,0.35)'; g.fillRect(x - 18, H * 0.7, 36, 30); } }],
  arcade: ['#120c24', '#b388ff', (g, r, W, H) => { for (let i = 0; i < 8; i++) { g.fillStyle = '#05030c'; g.fillRect(6 + i * 31, H * 0.3, 24, H * 0.7); g.fillStyle = `hsl(${r() * 360},90%,60%)`; g.fillRect(9 + i * 31, H * 0.36, 18, 14); } }],
  closed: ['#2c2a2a', '#6f7fa8', (g, r, W, H) => { g.fillStyle = 'rgba(0,0,0,0.5)'; for (let i = 0; i < 4; i++) g.fillRect(10 + i * 62, H * 0.4, 44, H * 0.5); }],
};
function interior(k, seed) {
  const [wall, light, draw] = INTERIOR[k];
  const map = tx(cv(256, 128, (g, r, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, shade(wall, 1.2)); gr.addColorStop(1, shade(wall, 0.6)); g.fillStyle = gr; g.fillRect(0, 0, W, H); const lg = g.createRadialGradient(W / 2, 0, 4, W / 2, 0, W * 0.7); lg.addColorStop(0, light); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = 0.55; g.fillStyle = lg; g.fillRect(0, 0, W, H); g.globalAlpha = 1; draw(g, r, W, H); }, seed));
  return std({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: k === 'closed' ? 0.35 : 0.95, roughness: 0.6 });
}
const neon = (c, k = 2.2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: k, roughness: 0.4 });
const stripes = (a, b) => { const t = tx(cv(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * 8, 0, 8, 64); } }, 1)); return std({ map: t, side: THREE.DoubleSide, roughness: 0.85 }); };

export function makeStarMaterials() {
  const M = {
    asphalt: surf(asphalt, 11, 512, { roughness: 0.95 }, 0.6),
    concrete: surf(slabs('#8f8b85', 128), 12, 512), concreteWorn: surf(slabs('#7d7872', 96), 13, 512),
    plaza: surf(slabs('#a39c92', 64), 14, 512), plazaDark: surf(slabs('#6e6a66', 64), 15, 256), promenade: surf(slabs('#c79a96', 64), 16, 256),
    sand: std({ color: '#b9a68a', roughness: 1 }), sea: new THREE.MeshStandardMaterial({ color: '#1b2a4a', roughness: 0.12, metalness: 0.4, envMapIntensity: 1.4 }),
    curb: std({ color: '#8a8580', roughness: 0.8 }),
    brickRed: surf(brick('#8b3a2a', '#b8aa98'), 21, 256), brickDark: surf(brick('#4b2c25', '#7b6c60', 0.4), 22, 256), brickPaint: surf(brick('#5d6e67', '#8a8a80', 0.2), 23, 256),
    sandstone: surf(blocks('#8e553d', 6), 24, 256), limestone: surf(blocks('#c9bca3', 5, 1), 25, 256), granite: surf(blocks('#8d8a86', 4), 26, 256),
    stuccoPeach: surf(stucco('#e8b99a', false), 31, 256), stuccoMint: surf(stucco('#a9d8c4', false), 32, 256), stuccoBlue: surf(stucco('#9ec3e0', false), 33, 256),
    stuccoWhite: surf(stucco('#eee8dc', false), 34, 256), stuccoPink: surf(stucco('#e6a7b8', true), 35, 256), stuccoWorn: surf(stucco('#d9c7a6', true), 36, 256), stuccoGrey: surf(stucco('#9c9690', true), 37, 256),
    marbleBlack: surf(marble('#15141a', '#5a5460'), 41, 256, { roughness: 0.25, metalness: 0.1 }), stoneWhite: surf(marble('#efece6', '#cfc8bd'), 42, 256, { roughness: 0.45 }), stonePale: surf(blocks('#ddd3c2', 3), 43, 256, { roughness: 0.6 }),
    rollup: surf(ribs, 44, 128, { metalness: 0.5, roughness: 0.6 }),
    bronze: std({ color: '#8a5a2b', metalness: 0.9, roughness: 0.35 }), gold: std({ color: '#d9a441', metalness: 1, roughness: 0.25 }), chrome: std({ color: '#d7dde2', metalness: 1, roughness: 0.15 }),
    iron: std({ color: '#1b1c1f', metalness: 0.6, roughness: 0.6 }), steel: std({ color: '#4a5058', metalness: 0.7, roughness: 0.45 }), trim: std({ color: '#d8cfbf', roughness: 0.7 }), trimDark: std({ color: '#3a3430', roughness: 0.7 }),
    wood: std({ color: '#6b4428', roughness: 0.7 }), paint: [std({ color: '#2f5d50' }), std({ color: '#7a2f2f' }), std({ color: '#2c3a5c' }), std({ color: '#c0902e' }), std({ color: '#5a3a5c' })],
    glassDark: std({ color: '#1a2330', metalness: 0.85, roughness: 0.12, envMapIntensity: 1.3 }),
    storeGlass: new THREE.MeshStandardMaterial({ color: '#cfe0ea', metalness: 0.3, roughness: 0.04, transparent: true, opacity: 0.22, depthWrite: false, envMapIntensity: 1.5 }),
    water: new THREE.MeshStandardMaterial({ color: '#14324a', emissive: '#0d4a66', emissiveIntensity: 0.35, metalness: 0.3, roughness: 0.06, transparent: true, opacity: 0.9, envMapIntensity: 1.6 }),
    curtainCool: curtain(51, '#34465c', '#dfeaff', 0.26), curtainWarm: curtain(52, '#3c3a44', '#ffd9a6', 0.24), curtainMix: curtain(53, '#2a3a48', '#fff0d8', 0.3),
    winWarm: room(61, '#8a5a3a', '#ffcf8f', 'home'), winHome: room(62, '#6e5f4a', '#ffe2b0', 'home'), winCool: room(63, '#6f7f96', '#eef4ff', 'office'), winHotel: room(64, '#8a4a5a', '#ffc2b0', 'hotel'),
    winDim: std({ color: '#1f2733', metalness: 0.8, roughness: 0.15, envMapIntensity: 1.2 }), winDim2: std({ color: '#2b2a30', metalness: 0.5, roughness: 0.25, emissive: '#1a1410', emissiveIntensity: 0.5 }),
    bulbs: neon('#ffd58a', 2.6), downlight: neon('#fff1d6', 2.2), sconce: neon('#ffc27a', 2),
    neon: { pink: neon('#ff4fa3'), cyan: neon('#3ff0ff'), amber: neon('#ffb03a'), violet: neon('#b06bff'), mint: neon('#6dffc2'), red: neon('#ff3b3b'), white: neon('#f4f7ff', 1.6) },
    awnings: [stripes('#1f5f8a', '#e9e2d2'), stripes('#b8323a', '#f1e8d8'), stripes('#2e7a5a', '#efe6d0'), stripes('#e79a3c', '#f6efe0'), stripes('#d77aa0', '#f5ede4'), stripes('#6a6a6a', '#b0a898')],
    canvas: std({ color: '#2a2a33', side: THREE.DoubleSide }), umbrella: [std({ color: '#f2efe6', side: THREE.DoubleSide }), std({ color: '#2f7f8a', side: THREE.DoubleSide }), std({ color: '#e0785a', side: THREE.DoubleSide })],
    bin: std({ color: '#2d3b33', roughness: 0.6 }), bag: std({ color: '#111214', roughness: 0.35 }), cup: std({ color: '#e8e2d8' }), crate: std({ color: '#7a5a38' }),
    newsbox: [std({ color: '#b3312f' }), std({ color: '#2c5aa0' }), std({ color: '#d8b43a' })], palmTrunk: std({ color: '#6e5a44', roughness: 1 }),
    frond: std({ color: '#2f5a32', side: THREE.DoubleSide, roughness: 0.85 }), plant: std({ color: '#3a6b3c' }), terracotta: std({ color: '#a85a3a' }),
    skin: std({ color: '#c89a7a', roughness: 0.7 }), cloth: std({ color: '#ffffff', roughness: 0.85 }),
    interiors: Object.fromEntries(Object.keys(INTERIOR).map((k, i) => [k, interior(k, 70 + i)])),
  };
  M.asphalt.map.repeat.set(1, 1);
  return M;
}

export function setStarWet(M, on) {
  M.asphalt.roughness = on ? 0.32 : 0.95; M.asphalt.metalness = on ? 0.25 : 0; M.asphalt.color.set(on ? '#b8bcc4' : '#ffffff');
  for (const k of ['concrete', 'concreteWorn', 'plaza', 'promenade']) { M[k].roughness = on ? 0.45 : 0.9; M[k].color.set(on ? '#c9ccd2' : '#ffffff'); }
}