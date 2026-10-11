import * as THREE from 'three';

const COLORS = ['#b91c1c', '#15803d', '#ca8a04', '#1d4ed8', '#c2410c', '#65a30d', '#be185d', '#7c2d12', '#7e22ce', '#334155', '#0e7490', '#4338ca'];
const GLYPHS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

// The zodiac mosaic laid into the Zodiac Plaza.
export function mosaic() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d'), h = S / 2;
  g.fillStyle = '#e8dfcc'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2;
    g.fillStyle = COLORS[i]; g.beginPath(); g.moveTo(h, h); g.arc(h, h, h * 0.9, a0, a1); g.closePath(); g.fill();
  }
  g.strokeStyle = 'rgba(40,30,20,0.35)'; g.lineWidth = 1;
  for (let k = 0; k < S; k += 12) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, S); g.moveTo(0, k); g.lineTo(S, k); g.stroke(); }
  g.fillStyle = '#10213f'; g.beginPath(); g.arc(h, h, h * 0.42, 0, 7); g.fill();
  g.strokeStyle = '#d4a63a'; g.lineWidth = 10; [0.9, 0.62, 0.42].forEach((r) => { g.beginPath(); g.arc(h, h, h * r, 0, 7); g.stroke(); });
  g.fillStyle = '#f3e2b3'; g.font = '84px "Noto Sans Symbols 2", "Segoe UI Symbol", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  GLYPHS.forEach((s, i) => { const a = ((i + 0.5) / 12) * Math.PI * 2; g.fillText(s, h + Math.cos(a) * h * 0.76, h + Math.sin(a) * h * 0.76); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}