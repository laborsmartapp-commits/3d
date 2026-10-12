import * as THREE from 'three';

// Star Square's fictional in-universe broadcasts. One small canvas per channel, shared by every
// screen showing it, redrawn at a few Hz only while such a screen is near. No video, no network.
const CH = {
  zfnn: [1024, 576, 8], style: [512, 288, 5], live: [512, 288, 3], cards: [512, 288, 4],
  weather: [512, 288, 3], music: [512, 288, 8], arts: [512, 288, 6], ribbon: [1024, 96, 10], tall: [288, 512, 5],
};
const NEWS = ['Starlight Way repaving wraps up a week early', 'Fountain crews retune the evening Crescendo', 'Neon Palm hotels relight their historic signs', 'Southstar record fair returns this weekend', 'Late Plate diner adds a midnight pancake menu', 'Gallery courtyard unveils new kinetic tiles', 'Palm Avenue terraces open until late'];
const STYLE = ['AUTUMN ORBIT', 'VELVET NOVA', 'SOFT ECLIPSE'];
const CARDS = [['Ember Drake', '#ff5a2a'], ['Tidecaller', '#2aa8ff'], ['Stonewarden', '#b08a3a'], ['Galewing', '#6fd3ff'], ['Stormcrest', '#c04dff'], ['Dawnspear', '#ffd24a'], ['Umbral Fox', '#7a6aa8']];
const SIGNAL_EVERY = 90, SIGNAL_FOR = 7;

const bg = (g, W, H, a, b) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(0, 0, W, H); };
const txt = (g, s, x, y, px, col, font = 'sans-serif', w = 800, align = 'left') => { g.font = `${w} ${px}px ${font}`; g.fillStyle = col; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y); };
const tag = (g, W, H) => txt(g, 'FICTIONAL BROADCAST', W - 8, H - 10, Math.max(9, H * 0.035), 'rgba(255,255,255,0.55)', 'sans-serif', 600, 'right');
const mmss = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const DRAW = {
  zfnn(g, W, H, t) {
    bg(g, W, H, '#0d1a3a', '#1c2f66');
    g.fillStyle = '#132552'; g.fillRect(0, 0, W * 0.42, H);
    const cx = W * 0.21, sway = Math.sin(t * 0.8) * 3;
    g.fillStyle = '#24407e'; g.beginPath(); g.moveTo(cx - 150, H * 0.86); g.quadraticCurveTo(cx, H * 0.52, cx + 150, H * 0.86); g.fill();
    g.fillStyle = '#c9956d'; g.beginPath(); g.ellipse(cx + sway, H * 0.42, 58, 72, 0, 0, 7); g.fill();
    g.fillStyle = '#2a1a14'; g.beginPath(); g.ellipse(cx + sway, H * 0.33, 64, 44, 0, Math.PI, 0); g.fill();
    g.fillStyle = '#e9e2d6'; g.fillRect(cx - 22, H * 0.56, 44, 30); g.fillStyle = '#a01f2a'; g.fillRect(cx - 6, H * 0.57, 12, 40);
    g.fillStyle = '#d62c3a'; g.fillRect(24, 22, 150, 58); txt(g, 'ZFNN', 99, 51, 42, '#fff', 'sans-serif', 900, 'center');
    const k = Math.floor(t / 6) % NEWS.length, f = Math.min(1, (t % 6) * 2);
    g.globalAlpha = f; g.fillStyle = 'rgba(255,255,255,0.08)'; g.fillRect(W * 0.46, H * 0.24, W * 0.5, H * 0.4);
    txt(g, 'CITY DESK', W * 0.48, H * 0.3, 26, '#ffcf5a'); g.font = `800 40px sans-serif`;
    const words = NEWS[k].split(' '); let line = '', y = H * 0.4;
    for (const w of words) { if (g.measureText(line + w).width > W * 0.46) { txt(g, line, W * 0.48, y, 40, '#fff'); line = ''; y += 50; } line += w + ' '; }
    txt(g, line, W * 0.48, y, 40, '#fff'); g.globalAlpha = 1;
    g.fillStyle = '#d62c3a'; g.fillRect(0, H - 70, W, 70); g.fillStyle = '#fff'; g.fillRect(0, H - 70, 150, 70); txt(g, 'LIVE', 75, H - 35, 34, '#d62c3a', 'sans-serif', 900, 'center');
    g.save(); g.beginPath(); g.rect(150, H - 70, W, 70); g.clip();
    const tick = NEWS.join('   •   '), off = (t * 90) % (tick.length * 18);
    txt(g, tick + '   •   ' + tick, 170 - off, H - 35, 30, '#fff', 'sans-serif', 700); g.restore(); tag(g, W, H - 70);
  },
  style(g, W, H, t) {
    bg(g, W, H, '#1a0d18', '#3a1030');
    for (let i = 0; i < 6; i++) { g.strokeStyle = `hsla(${320 + i * 8},70%,${55 + i * 4}%,0.55)`; g.lineWidth = 14; g.beginPath(); for (let x = 0; x <= W; x += 12) g.lineTo(x, H * 0.5 + Math.sin(x * 0.012 + t * 1.2 + i * 0.7) * 60 + (i - 3) * 16); g.stroke(); }
    const p = Math.floor(t / 4) % 3, cx = W * 0.7; g.fillStyle = '#f6e6ef';
    g.beginPath(); g.arc(cx, H * 0.22, 16, 0, 7); g.fill();
    g.beginPath(); g.moveTo(cx - 26, H * 0.3); g.lineTo(cx + 26, H * 0.3); g.lineTo(cx + 40 + p * 8, H * 0.86); g.lineTo(cx - 40 - (2 - p) * 8, H * 0.86); g.fill();
    txt(g, 'STARSTYLE', 24, 42, 44, '#ffd6ea', 'serif', 700); txt(g, STYLE[p], 24, 90, 24, '#fff', 'serif', 400); tag(g, W, H);
  },
  live(g, W, H, t, K) {
    bg(g, W, H, '#07121e', '#10304a');
    txt(g, 'CONVERGENCE LIVE', 20, 36, 34, '#6ff0ff', 'sans-serif', 900);
    const st = K.show?.state(), cue = st?.phase && st.phase !== 'OFF' ? `Fountain show: ${st.cue?.name || st.phase}` : st?.nextAt ? `Fountain show in ${mmss(st.nextAt - Date.now())}` : 'Fountain show tonight';
    txt(g, cue, 20, 96, 28, '#fff', 'sans-serif', 700);
    const ev = ['Velvet Courtyard: salsa hour', 'Starline Live: doors 8pm', 'Nova Grand: "Stardust" matinee', 'Red Comet: open mic'][Math.floor(t / 5) % 4];
    txt(g, ev, 20, 150, 26, '#ffcf6a', 'sans-serif', 600);
    for (let i = 0; i < 12; i++) { g.fillStyle = `hsla(${190 + i * 10},80%,60%,${0.3 + 0.3 * Math.sin(t * 2 + i)})`; g.fillRect(20 + i * 40, 200, 32, 40); } tag(g, W, H);
  },
  cards(g, W, H, t) {
    bg(g, W, H, '#140f24', '#2a1d4a');
    const [name, col] = CARDS[Math.floor(t / 5) % CARDS.length], s = 1 + Math.sin(t * 1.4) * 0.03;
    g.save(); g.translate(W * 0.3, H / 2); g.scale(s, s); g.rotate(Math.sin(t) * 0.04);
    g.fillStyle = '#d9b45a'; g.fillRect(-72, -110, 144, 220); g.fillStyle = col; g.fillRect(-64, -102, 128, 150);
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, r = i % 2 ? 18 : 40; g.lineTo(Math.cos(a) * r, -28 + Math.sin(a) * r); } g.fill();
    g.fillStyle = '#1a1226'; g.fillRect(-64, 56, 128, 46); txt(g, name, 0, 79, 18, '#fff', 'serif', 700, 'center'); g.restore();
    txt(g, 'CARD SPOTLIGHT', W * 0.55, 60, 30, '#ffd86a', 'sans-serif', 900); txt(g, 'From the Zodiac Fury collection', W * 0.55, 104, 18, '#cfc6ff', 'sans-serif', 500); tag(g, W, H);
  },
  weather(g, W, H, t) {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#1a2050'); gr.addColorStop(0.7, '#5a4a88'); gr.addColorStop(1, '#e09a7a'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = '#f4ecd8'; g.beginPath(); g.arc(W * 0.78, H * 0.3, 34, 0, 7); g.fill(); g.fillStyle = '#1e2456'; g.beginPath(); g.arc(W * 0.78 + 14, H * 0.27, 30, 0, 7); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = 'rgba(200,190,230,0.35)'; g.beginPath(); g.ellipse(((t * 12 + i * 180) % (W + 200)) - 100, H * (0.45 + i * 0.1), 90, 18, 0, 0, 7); g.fill(); }
    txt(g, 'CELESTIAL WEATHER', 20, 34, 26, '#fff', 'sans-serif', 900); txt(g, '18°', 20, 110, 72, '#fff', 'sans-serif', 300); txt(g, 'Late dusk · holding', 20, 170, 24, '#ffe0c8', 'sans-serif', 600); tag(g, W, H);
  },
  music(g, W, H, t) {
    bg(g, W, H, '#0a0a12', '#1f0a2a');
    for (let i = 0; i < 24; i++) { const h = (0.3 + 0.7 * Math.abs(Math.sin(t * 3 + i * 0.6) * Math.cos(t * 1.7 + i))) * H * 0.55; g.fillStyle = `hsl(${280 + i * 3},90%,60%)`; g.fillRect(16 + i * 20, H * 0.9 - h, 14, h); }
    const cx = W * 0.78, b = Math.sin(t * 5) * 4; g.fillStyle = '#000';
    g.beginPath(); g.arc(cx, H * 0.28 + b, 22, 0, 7); g.fill(); g.fillRect(cx - 24, H * 0.36 + b, 48, H * 0.4); g.save(); g.translate(cx + 20, H * 0.4 + b); g.rotate(-0.8 + Math.sin(t * 5) * 0.2); g.fillRect(0, -5, 60, 10); g.restore();
    txt(g, 'MUSIC NOW', 20, 36, 32, '#ff7ae0', 'sans-serif', 900); txt(g, 'LUNA VEX · "Neon Harbor"', 20, 76, 20, '#fff', 'sans-serif', 600); tag(g, W, H);
  },
  arts(g, W, H, t) {
    g.fillStyle = '#05060c'; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { const a = t * 0.3 + i * 0.45, r = 30 + i * 12; g.strokeStyle = `hsla(${(i * 25 + t * 20) % 360},80%,60%,0.6)`; g.lineWidth = 3; g.beginPath(); g.ellipse(W / 2 + Math.cos(a) * 30, H / 2 + Math.sin(a * 1.3) * 20, r, r * 0.55, a, 0, 7); g.stroke(); }
    txt(g, 'STAR SQUARE ARTS', 16, 26, 20, '#fff', 'sans-serif', 800); tag(g, W, H);
  },
  ribbon(g, W, H, t, K) {
    g.fillStyle = '#06080e'; g.fillRect(0, 0, W, H);
    const st = K.show?.state(), s = `CONVERGENCE LIVE  ✦  ${st?.nextAt ? `NEXT FOUNTAIN SHOW IN ${mmss(st.nextAt - Date.now())}` : 'FOUNTAIN SHOW TONIGHT'}  ✦  ${NEWS[Math.floor(t / 8) % NEWS.length].toUpperCase()}  ✦  FICTIONAL BROADCAST  ✦  `;
    g.font = '900 56px sans-serif'; const w = g.measureText(s).width, off = (t * 140) % w;
    for (const x of [-off, w - off]) txt(g, s, x, H / 2, 56, '#ffcc4a', 'sans-serif', 900);
  },
};
DRAW.tall = (g, W, H, t) => DRAW.style(g, W, H, t);
// The Signal Wall: every so often all screens join one abstract composition, each showing its part.
function signal(g, W, H, t, idx) {
  g.fillStyle = '#080812'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) { const x = ((i * 140 + idx * 320 + t * 160) % (W + 280)) - 140; g.fillStyle = `hsla(${(i * 40 + t * 30) % 360},85%,60%,0.75)`; g.beginPath(); g.arc(x, H / 2 + Math.sin(t * 2 + i + idx) * H * 0.25, H * 0.22, 0, 7); g.fill(); }
  txt(g, 'THE SIGNAL WALL', W / 2, H * 0.15, Math.max(14, H * 0.08), 'rgba(255,255,255,0.8)', 'sans-serif', 900, 'center');
}

export class Screens {
  constructor(K) {
    this.K = K; this.list = []; this.ch = {};
    for (const [k, [w, h, hz]] of Object.entries(CH)) {
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = false; tex.minFilter = THREE.LinearFilter;
      this.ch[k] = { c, g: c.getContext('2d'), tex, hz, next: 0, mat: new THREE.MeshBasicMaterial({ map: tex, color: '#dcdcdc' }), near: false, idx: Object.keys(this.ch).length };
    }
    // Resident screen textures (no mipmaps): width × height × 4 bytes.
    this.bytes = Object.values(CH).reduce((a, [w, h]) => a + w * h * 4, 0);
  }
  // A screen face on a façade; its light genuinely reaches the street through the light pool.
  add(x, y, z, yaw, w, h, ch, glow = '#8fb8ff') {
    const K = this.K, m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this.ch[ch].mat);
    m.position.set(x, y, z); m.rotation.y = yaw; K.e.scene.add(m);
    const s = Math.sin(yaw), c = Math.cos(yaw);
    K.mg.box(K.M.iron, x - s * 0.12, y, z - c * 0.12, w + 0.5, h + 0.5, 0.2, yaw, 0);
    K.pool.add(x + s * 3, Math.max(3, y - h / 2), z + c * 3, glow, 7, 18);
    K.spill.pool(x + s * 5, 0.15, z + c * 5, Math.min(10, w * 0.5), glow, 0.35);
    this.list.push({ x, z, ch }); this.ch[ch].count = (this.ch[ch].count || 0) + 1;
  }
  update(t, fx, fz) {
    for (const C of Object.values(this.ch)) C.near = false;
    for (const s of this.list) if ((s.x - fx) ** 2 + (s.z - fz) ** 2 < 200 * 200) this.ch[s.ch].near = true;
    const sig = t % SIGNAL_EVERY < SIGNAL_FOR;
    for (const [k, C] of Object.entries(this.ch)) {
      if (!C.near || t < C.next) continue;
      C.next = t + 1 / C.hz;
      if (sig && k !== 'ribbon') signal(C.g, C.c.width, C.c.height, t, C.idx); else DRAW[k](C.g, C.c.width, C.c.height, t, this.K);
      C.tex.needsUpdate = true;
    }
  }
  dispose() { for (const C of Object.values(this.ch)) { C.tex.dispose(); C.mat.dispose(); } }
}