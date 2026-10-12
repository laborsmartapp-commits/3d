import * as THREE from 'three';

// Localised market life: potion vapour, bubbles, magic motes, glints and fountain spray.
// Each kind is one point cloud with a fixed pool; only sources near the viewer emit.
function sprite(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const soft = sprite((g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.45)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const ring = sprite((g) => { g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineWidth = 5; g.beginPath(); g.arc(32, 32, 22, 0, 7); g.stroke(); });
const star = sprite((g) => { g.fillStyle = '#fff'; g.translate(32, 32); for (let i = 0; i < 2; i++) { g.rotate(Math.PI / 4 * i); g.beginPath(); g.moveTo(0, -30); g.lineTo(4, 0); g.lineTo(0, 30); g.lineTo(-4, 0); g.fill(); g.beginPath(); g.moveTo(-30, 0); g.lineTo(0, 4); g.lineTo(30, 0); g.lineTo(0, -4); g.fill(); } });

const KINDS = {
  vapor: { tex: soft, pool: 260, size: 0.9, life: 2.6, vy: 0.55, spread: 0.25, grav: 0, jitter: 0.18 },
  bubble: { tex: ring, pool: 120, size: 0.14, life: 0.9, vy: 0.35, spread: 0.18, grav: 0, jitter: 0.05 },
  mote: { tex: soft, pool: 260, size: 0.16, life: 3.2, vy: 0.12, spread: 0.7, grav: 0, jitter: 0.35 },
  glint: { tex: star, pool: 60, size: 0.32, life: 0.3, vy: 0, spread: 0.02, grav: 0, jitter: 0 },
  spray: { tex: soft, pool: 420, size: 0.18, life: 1.15, vy: 3.6, spread: 0.1, grav: -6.5, jitter: 0, radial: 1.3 },
};
const NEAR = 55 * 55;

export class Ambient {
  constructor(scene) {
    this.k = {};
    for (const [name, c] of Object.entries(KINDS)) {
      const g = new THREE.BufferGeometry(), n = c.pool;
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
      g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
      const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: c.tex, size: c.size, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.frustumCulled = false; scene.add(pts);
      this.k[name] = { c, pts, src: [], p: Array.from({ length: n }, () => ({ life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, col: null })), acc: 0 };
    }
  }
  // rate = particles per second while the viewer is close.
  add(kind, x, y, z, color, rate = 3) { this.k[kind].src.push({ x, y, z, col: new THREE.Color(color), rate }); }
  update(dt, fx, fz) {
    for (const K of Object.values(this.k)) {
      const { c } = K, near = K.src.filter((s) => (s.x - fx) ** 2 + (s.z - fz) ** 2 < NEAR);
      const pos = K.pts.geometry.attributes.position.array, col = K.pts.geometry.attributes.color.array;
      let spawn = near.reduce((a, s) => a + s.rate * dt, K.acc), slot = 0;
      K.acc = spawn % 1; spawn = Math.floor(spawn);
      K.p.forEach((q, i) => {
        if (q.life <= 0 && spawn > 0 && near.length) {
          spawn--; const s = near[(Math.random() * near.length) | 0];
          const a = Math.random() * 6.28, rr = Math.random() * c.spread;
          Object.assign(q, { life: c.life * (0.7 + Math.random() * 0.6), x: s.x + Math.cos(a) * rr, y: s.y, z: s.z + Math.sin(a) * rr, vx: c.radial ? Math.cos(a) * c.radial : 0, vy: c.vy * (0.7 + Math.random() * 0.5), vz: c.radial ? Math.sin(a) * c.radial : 0, col: s.col, max: 0 });
          q.max = q.life;
        }
        const k = i * 3;
        if (q.life <= 0) { pos[k + 1] = -999; return; }
        q.life -= dt; q.vy += c.grav * dt;
        q.x += (q.vx + (Math.random() - 0.5) * c.jitter) * dt; q.y += q.vy * dt; q.z += (q.vz + (Math.random() - 0.5) * c.jitter) * dt;
        pos[k] = q.x; pos[k + 1] = q.y; pos[k + 2] = q.z;
        const f = Math.sin(Math.min(1, q.life / q.max) * Math.PI) * (K === this.k.vapor ? 0.35 : 1);
        col[k] = q.col.r * f; col[k + 1] = q.col.g * f; col[k + 2] = q.col.b * f;
        slot++;
      });
      K.pts.geometry.attributes.position.needsUpdate = true; K.pts.geometry.attributes.color.needsUpdate = true;
    }
  }
}