import * as THREE from 'three';

// Surface materials for The Convergence. Each is generated here (colour + bump pattern).
export const TILE = { brick: 2, brickRed: 2, sandstone: 3, marble: 3, cobble: 2.5, pavers: 1.5, metal: 2 };

const S = 512;
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function paint(draw, seed) {
  const out = [false, true].map((bump) => {
    const c = document.createElement('canvas'); c.width = c.height = S;
    draw(c.getContext('2d'), bump, rng(seed)); return c;
  });
  const [color, bump] = out.map((c, i) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (!i) t.colorSpace = THREE.SRGBColorSpace; return t; });
  return { color, bump };
}
const shade = (hex, k) => { const c = new THREE.Color(hex); c.multiplyScalar(k); return `#${c.getHexString()}`; };

const bricks = (base, mortar) => (g, bump, r) => {
  g.fillStyle = bump ? '#202020' : mortar; g.fillRect(0, 0, S, S);
  const rh = S / 16, bw = S / 8;
  for (let row = 0; row < 16; row++) for (let i = -1; i < 9; i++) {
    const x = i * bw + (row % 2 ? bw / 2 : 0), v = 0.82 + r() * 0.3;
    g.fillStyle = bump ? `rgb(${170 + r() * 60 | 0},170,170)` : shade(base, v);
    g.fillRect(x + 3, row * rh + 3, bw - 6, rh - 6);
  }
};
const ashlar = (base) => (g, bump, r) => {
  g.fillStyle = bump ? '#303030' : shade(base, 0.7); g.fillRect(0, 0, S, S);
  const rh = S / 6, bw = S / 3;
  for (let row = 0; row < 6; row++) for (let i = -1; i < 4; i++) {
    const x = i * bw + (row % 2 ? bw / 2 : 0);
    g.fillStyle = bump ? '#c8c8c8' : shade(base, 0.9 + r() * 0.15); g.fillRect(x + 2, row * rh + 2, bw - 4, rh - 4);
    for (let k = 0; k < 90; k++) { g.fillStyle = bump ? `rgba(0,0,0,${r() * 0.25})` : `rgba(90,60,30,${r() * 0.12})`; g.fillRect(x + r() * bw, row * rh + r() * rh, 2 + r() * 4, 2 + r() * 3); }
  }
};
const marble = (g, bump, r) => {
  g.fillStyle = bump ? '#d0d0d0' : '#ece9e2'; g.fillRect(0, 0, S, S);
  for (let v = 0; v < 14; v++) {
    g.strokeStyle = bump ? 'rgba(120,120,120,0.5)' : `rgba(130,125,120,${0.15 + r() * 0.3})`; g.lineWidth = 0.8 + r() * 2.2;
    g.beginPath(); let x = r() * S, y = 0; g.moveTo(x, y);
    while (y < S) { x += (r() - 0.5) * 60; y += 20 + r() * 30; g.lineTo(x, y); } g.stroke();
  }
  g.strokeStyle = bump ? '#707070' : 'rgba(0,0,0,0.12)'; g.lineWidth = 2; g.strokeRect(1, 1, S - 2, S - 2);
};
const cobbles = (g, bump, r) => {
  g.fillStyle = bump ? '#101010' : '#4d4a45'; g.fillRect(0, 0, S, S);
  const n = 10, c = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = (i + 0.5) * c + (r() - 0.5) * 6, y = (j + 0.5) * c + (r() - 0.5) * 6, v = 0.75 + r() * 0.4;
    const grd = g.createRadialGradient(x - 6, y - 6, 2, x, y, c * 0.5);
    grd.addColorStop(0, bump ? '#ffffff' : shade('#857e73', v)); grd.addColorStop(1, bump ? '#555555' : shade('#5f5a53', v));
    g.fillStyle = grd; g.beginPath(); g.ellipse(x, y, c * 0.45, c * 0.42, r() * 3, 0, 7); g.fill();
  }
};
const pavers = (g, bump, r) => {
  g.fillStyle = bump ? '#303030' : '#8f887d'; g.fillRect(0, 0, S, S);
  const n = 4, c = S / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { g.fillStyle = bump ? '#bdbdbd' : shade('#c9c0b1', 0.9 + r() * 0.14); g.fillRect(i * c + 3, j * c + 3, c - 6, c - 6); }
};
const brushed = (g, bump, r) => {
  g.fillStyle = bump ? '#808080' : '#6f6558'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 400; i++) { g.fillStyle = bump ? `rgba(255,255,255,${r() * 0.15})` : `rgba(255,240,210,${r() * 0.07})`; g.fillRect(0, r() * S, S, 1); }
};

function surface(draw, seed, opts) {
  const { color, bump } = paint(draw, seed);
  return new THREE.MeshStandardMaterial({ map: color, bumpMap: bump, bumpScale: 1.2, roughness: 0.85, ...opts });
}

export function stripes(a, b) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(0, i * 16, 128, 16); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.9, side: THREE.DoubleSide });
}

export function makeMaterials() {
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...o });
  return {
    brick: surface(bricks('#b8a58c', '#d8d0c2'), 11),
    brickRed: surface(bricks('#9c4a35', '#cfc3b2'), 12),
    sandstone: surface(ashlar('#d6b98a'), 13),
    marble: surface(marble, 14, { roughness: 0.35 }),
    cobble: surface(cobbles, 15),
    pavers: surface(pavers, 16),
    metal: surface(brushed, 17, { metalness: 0.85, roughness: 0.4 }),
    glass: std('#6f93a8', { metalness: 0.9, roughness: 0.06, envMapIntensity: 1.4 }),
    gold: std('#d4a63a', { metalness: 1, roughness: 0.3 }),
    trim: std('#efe6d6', { roughness: 0.6 }),
    wood: std('#6b4a2f', { roughness: 0.9 }),
    iron: std('#2b2f36', { metalness: 0.7, roughness: 0.45 }),
    leaf: std('#4f7f3a', { flatShading: true }),
    leaf2: std('#6b9a45', { flatShading: true }),
    bark: std('#5a4632'),
    lantern: std('#ffe7a8', { emissive: '#ffcf70', emissiveIntensity: 0.6 }),
    awnings: [stripes('#1e3a8a', '#f5efe0'), stripes('#9f1239', '#f5efe0'), stripes('#166534', '#f5efe0'), stripes('#b45309', '#fff7e6'), stripes('#5b21b6', '#f5efe0')],
  };
}