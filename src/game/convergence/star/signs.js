import * as THREE from 'three';
import { rng } from './layout';

// One shared sign atlas (1024²): 48 horizontal slots and 16 vertical blade slots, each drawn with its
// own typography, construction and condition. Posters get their own small atlas.
const FONTS = ['700 34px Georgia, serif', 'italic 800 34px "Palatino Linotype", Palatino, serif', '900 36px Impact, "Arial Black", sans-serif', '700 32px "Courier New", monospace', 'italic 700 38px "Brush Script MT", cursive', '700 32px "Trebuchet MS", sans-serif', '900 32px "Arial Black", sans-serif', 'small-caps 700 34px Didot, "Bodoni MT", serif', '600 30px Futura, "Century Gothic", sans-serif'];
export const SIGN = {
  neon: (col) => ({ bg: null, fg: col, glow: col, border: null }),
  board: (bgc, fg) => ({ bg: bgc, fg, glow: null, border: fg, worn: true }),
  channel: (fg) => ({ bg: null, fg, glow: 'rgba(255,230,190,0.6)', border: null }),
  lux: (fg) => ({ bg: null, fg, glow: null, border: null, spaced: true }),
  marquee: () => ({ bg: '#1b1410', fg: '#ffe7b0', glow: '#ffb84a', border: '#ffd27a', bulbs: true }),
};

export class Signs {
  constructor() {
    const c = (this.c = document.createElement('canvas')); c.width = c.height = 1024; this.g = c.getContext('2d');
    this.h = 0; this.v = 0; this.r = rng(9);
    const t = (this.tex = new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    this.mat = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: '#ffffff', emissiveIntensity: 1.25, transparent: true, alphaTest: 0.35, roughness: 0.5, side: THREE.DoubleSide });
    const p = (this.pc = document.createElement('canvas')); p.width = p.height = 512; this.drawPosters(p.getContext('2d'));
    const pt = new THREE.CanvasTexture(p); pt.colorSpace = THREE.SRGBColorSpace;
    this.posterMat = new THREE.MeshStandardMaterial({ map: pt, emissiveMap: pt, emissive: '#ffffff', emissiveIntensity: 0.35, roughness: 0.8 });
  }
  // Returns uv rect [u0, v0, u1, v1] for a new horizontal sign.
  text(s, style, font) {
    const i = this.h++ % 48, x = (i % 4) * 256, y = Math.floor(i / 4) * 64, g = this.g;
    g.save(); g.beginPath(); g.rect(x, y, 256, 64); g.clip(); g.clearRect(x, y, 256, 64);
    if (style.bg) { g.fillStyle = style.bg; g.fillRect(x + 2, y + 2, 252, 60); }
    if (style.worn) for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(${this.r() < 0.5 ? '255,255,255' : '0,0,0'},0.12)`; g.fillRect(x + this.r() * 256, y + this.r() * 64, 2 + this.r() * 8, 1 + this.r() * 4); }
    if (style.border) { g.strokeStyle = style.border; g.lineWidth = 3; g.strokeRect(x + 5, y + 5, 246, 54); }
    if (style.bulbs) for (let k = 0; k < 22; k++) { g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(x + 10 + k * 11.2, y + 6, 3, 0, 7); g.arc(x + 10 + k * 11.2, y + 58, 3, 0, 7); g.fill(); }
    g.font = font || FONTS[i % FONTS.length]; g.textAlign = 'center'; g.textBaseline = 'middle';
    const w = g.measureText(style.spaced ? s.split('').join(' ') : s).width, k = Math.min(1, 236 / w);
    g.translate(x + 128, y + 33); g.scale(k, 1);
    if (style.glow) { g.shadowColor = style.glow; g.shadowBlur = 14; }
    if (style.bg === null && style.glow && style.glow === style.fg) { g.strokeStyle = style.fg; g.lineWidth = 2; g.strokeText(s, 0, 0); }
    g.fillStyle = style.fg; g.fillText(style.spaced ? s.split('').join(' ') : s, 0, 0);
    g.restore(); this.tex.needsUpdate = true;
    return [x / 1024, 1 - (y + 64) / 1024, (x + 256) / 1024, 1 - y / 1024];
  }
  // Vertical blade signs: letters stacked upright (HOTEL, venue initials…).
  blade(s, fg, bgc) {
    const i = this.v++ % 16, x = i * 64, y = 768, g = this.g, L = s.replace(/\s/g, '').slice(0, 7);
    g.clearRect(x, y, 64, 256); g.fillStyle = bgc; g.fillRect(x + 4, y + 2, 56, 252);
    g.font = '900 30px "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = fg; g.shadowBlur = 12; g.fillStyle = fg;
    [...L].forEach((ch, k) => g.fillText(ch, x + 32, y + 22 + k * (232 / Math.max(L.length, 1))));
    g.shadowBlur = 0; this.tex.needsUpdate = true;
    return [x / 1024, 0, (x + 64) / 1024, 0.25];
  }
  quad(uv, w, h) {
    const g = new THREE.PlaneGeometry(w, h), a = g.attributes.uv, [u0, v0, u1, v1] = uv;
    a.setXY(0, u0, v1); a.setXY(1, u1, v1); a.setXY(2, u0, v0); a.setXY(3, u1, v0);
    return g;
  }
  posterQuad(k, w, h) { return this.quad([(k % 4) / 4, 1 - (Math.floor(k / 4) % 4 + 1) / 4, (k % 4 + 1) / 4, 1 - (Math.floor(k / 4) % 4) / 4], w, h); }
  drawPosters(g) {
    const T = ['STARDUST', 'COMET KIDS', 'MOON REVUE', 'NEBULA NIGHTS', 'THE LAST EQUINOX', 'ORBIT 26', 'VELVET TIDE', 'SOLAR FLARE', 'LUNA VEX', 'RED GIANT', 'SIGNAL', 'ECLIPSE BALL', 'TIDE & TONE', 'STARLINE', 'NOVA', 'AFTERGLOW'], r = rng(5);
    T.forEach((s, k) => {
      const x = (k % 4) * 128, y = Math.floor(k / 4) * 128, h = r() * 360;
      const gr = g.createLinearGradient(x, y, x, y + 128); gr.addColorStop(0, `hsl(${h},70%,45%)`); gr.addColorStop(1, `hsl(${(h + 60) % 360},60%,18%)`); g.fillStyle = gr; g.fillRect(x, y, 128, 128);
      g.fillStyle = `hsla(${(h + 180) % 360},80%,70%,0.8)`; g.beginPath(); g.arc(x + 64, y + 52, 18 + r() * 20, 0, 7); g.fill();
      g.font = '900 16px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff'; g.fillText(s, x + 64, y + 104);
      g.font = '600 9px sans-serif'; g.fillText('LIVE · ONE NIGHT ONLY', x + 64, y + 118);
    });
  }
}