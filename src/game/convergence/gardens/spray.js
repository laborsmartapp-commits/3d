import * as THREE from 'three';

function sprite(draw) { const c = document.createElement('canvas'); c.width = c.height = 64; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; }
const drop = sprite((g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 30); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.35, 'rgba(235,248,255,0.7)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
const mistT = sprite((g) => { for (let i = 0; i < 14; i++) { const x = 16 + Math.random() * 32, y = 16 + Math.random() * 32, r = g.createRadialGradient(x, y, 0, x, y, 18); r.addColorStop(0, 'rgba(255,255,255,0.35)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); } });

// Splash crowns, breakup droplets and bounded mist where the jets land. Fixed pools:
// when the show stops no new drops are born, the airborne ones finish falling, then it's empty.
class Pool {
  constructor(scene, n, tex, size, opacity) {
    this.n = n; this.q = Array.from({ length: n }, () => ({ life: 0 }));
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3).fill(-999), 3));
    this.pts = new THREE.Points(g, new THREE.PointsMaterial({ map: tex, size, transparent: true, opacity, depthWrite: false, color: '#f4fbff' }));
    this.pts.frustumCulled = false; scene.add(this.pts); this.i = 0;
  }
  emit(x, y, z, vx, vy, vz, life) { const p = this.q[this.i = (this.i + 1) % this.n]; Object.assign(p, { x, y, z, vx, vy, vz, life, max: life }); }
  update(dt, grav, drag = 0) {
    const a = this.pts.geometry.attributes.position.array;
    this.live = 0;
    this.q.forEach((p, i) => {
      if (p.life <= 0) { a[i * 3 + 1] = -999; return; }
      this.live++; p.life -= dt; p.vy += grav * dt; p.vx *= 1 - drag * dt; p.vz *= 1 - drag * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.4 && grav < 0) p.life = 0;
      a[i * 3] = p.x; a[i * 3 + 1] = p.y; a[i * 3 + 2] = p.z;
    });
    this.pts.geometry.attributes.position.needsUpdate = true;
  }
  dispose() { this.pts.removeFromParent(); this.pts.geometry.dispose(); this.pts.material.dispose(); }
}

export class Spray {
  constructor(scene, low) {
    this.drops = new Pool(scene, low ? 700 : 1600, drop, 0.22, 0.85);
    this.mist = new Pool(scene, low ? 90 : 200, mistT, 5.5, 0.28);
    this.acc = 0; this.low = low;
  }
  update(dt, impacts) {
    this.acc += dt * (this.low ? 0.5 : 1);
    if (this.acc > 0.033) {
      this.acc = 0;
      for (const im of impacts) {
        const n = Math.ceil(im.k * 3);
        for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5 * im.k; this.drops.emit(im.x, im.y + 0.1, im.z, Math.cos(a) * s, 2 + Math.random() * 4 * im.k, Math.sin(a) * s, 0.9); }
        if (Math.random() < im.k * 0.35) this.mist.emit(im.x + (Math.random() - 0.5) * 2, im.y + 0.8, im.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 0.8, 0.6, (Math.random() - 0.5) * 0.8, 3);
      }
    }
    this.drops.update(dt, -9.8); this.mist.update(dt, 0.05, 0.4);
  }
  dispose() { this.drops.dispose(); this.mist.dispose(); }
}

// Fountain sound: filtered noise whose level follows the total flow and the listener's distance.
export class FountainAudio {
  constructor() {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC()), len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
    this.gain = ctx.createGain(); this.gain.gain.value = 0;
    src.connect(lp).connect(this.gain).connect(ctx.destination); src.start();
    this.resume = () => ctx.state === 'suspended' && ctx.resume();
    window.addEventListener('pointerdown', this.resume);
  }
  set(flow, dist) { if (!this.gain) return; const v = Math.min(0.22, flow / 900) * Math.max(0, 1 - dist / 140); this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.4); }
  dispose() { if (!this.ctx) return; window.removeEventListener('pointerdown', this.resume); this.ctx.close(); this.ctx = null; this.gain = null; }
}