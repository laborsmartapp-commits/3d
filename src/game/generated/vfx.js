import * as THREE from 'three';

let dot;
const sprite = () => dot || (dot = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const g = cv.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.4, 'rgba(255,255,255,0.5)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })());
const points = (n, color, size, additive = true) => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: sprite(), transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, sizeAttenuation: true }));
  p.frustumCulled = false; return p;
};

// Animated effects. Each one is a real-time system (meshes / particles + animation, plus pooled
// practical lights where it emits light). Natural motion only: no weather, no time-of-day changes.
export function buildVfx(c, list) {
  const e = c.e, R = c.R, ticks = [], v3 = new THREE.Vector3(), S = c.S;
  const glow = (color, k = 2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: k * S.emit, roughness: 0.5, flatShading: S.flat });
  for (const v of list) {
    const s = v.scale, col = v.color;
    if (v.type === 'fire') {
      const flames = [0, 1, 2].map((i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.22 * s, 0.8 * s, S.flat ? 5 : 12), R.M.glow.flame); m.position.set(v.x + (i - 1) * 0.14 * s, v.y + 0.35 * s, v.z + ((i % 2) - 0.5) * 0.12 * s); e.scene.add(m); return m; });
      R.lightSources.push({ kind: 'fire', x: v.x, y: v.y + 0.8, z: v.z, i: 5 * Math.min(2, s), d: 7 * Math.min(2, s), c: '#ff8a3a' });
      let acc = 0;
      ticks.push((t, dt) => { flames.forEach((m, i) => { m.scale.y = 0.7 + 0.4 * Math.abs(Math.sin(t * 8 + i * 1.9)); m.scale.x = m.scale.z = 0.9 + 0.12 * Math.sin(t * 11 + i); }); if ((acc += dt) > 0.12) { acc = 0; e.fx.emit(v3.set(v.x, v.y + 0.6 * s, v.z), { count: 2, color: '#ffb347', up: 1.4, spread: 0.25 * s, life: 0.9 }); } });
    } else if (v.type === 'smoke' || v.type === 'steam' || v.type === 'sparkles' || v.type === 'water_jet') {
      const cfg = { smoke: ['#6b6b70', 0.7, 0.5, 2.4, 0.15], steam: ['#e9eef2', 0.5, 0.35, 1.8, 0.12], sparkles: [col || '#ffe9a8', 0.25, 1.2, 1.2, 0.08], water_jet: ['#bfe6ff', 3.2, 0.25, 0.9, 0.04] }[v.type];
      let acc = 0;
      ticks.push((t, dt) => { if ((acc += dt) > cfg[4]) { acc = 0; e.fx.emit(v3.set(v.x, v.y, v.z), { count: 3, color: cfg[0], up: cfg[1] * s, spread: cfg[2] * s, life: cfg[3] }); } });
    } else if (v.type === 'fireflies' || v.type === 'falling_petals') {
      const n = v.type === 'fireflies' ? Math.min(60, v.count * 4) : 80, rad = Math.max(1.5, 3 * s), P = points(n, col || (v.type === 'fireflies' ? '#d8ff7a' : '#ffb7d0'), v.type === 'fireflies' ? 0.16 : 0.12, v.type === 'fireflies');
      const seed = Array.from({ length: n }, () => [Math.random() * 6.28, Math.random(), Math.random() * 6.28, Math.random()]);
      e.scene.add(P); const pos = P.geometry.attributes.position;
      ticks.push((t) => { seed.forEach(([a, r, ph, h], i) => {
        if (v.type === 'fireflies') pos.setXYZ(i, v.x + Math.cos(a + t * 0.15) * r * rad + Math.sin(t * 0.7 + ph) * 0.4, v.y + 0.6 + h * 2 + Math.sin(t * 1.3 + ph) * 0.3, v.z + Math.sin(a + t * 0.15) * r * rad);
        else { const f = (h * 6 + t * 0.6) % 6; pos.setXYZ(i, v.x + Math.cos(a) * r * rad + Math.sin(t + ph) * 0.4, v.y + 6 - f, v.z + Math.sin(a) * r * rad + Math.cos(t * 0.8 + ph) * 0.4); }
      }); pos.needsUpdate = true; P.material.opacity = v.type === 'fireflies' ? 0.6 + 0.4 * Math.sin(t * 2) : 0.9; });
    } else if (v.type === 'floating_lanterns' || v.type === 'magic_orbs') {
      const orb = v.type === 'magic_orbs', n = Math.min(orb ? 12 : 24, v.count), rad = Math.max(1, (orb ? 1.5 : 4) * s), mat = glow(col || (orb ? '#8fd8ff' : '#ffb35a'), orb ? 2.5 : 1.6);
      const geo = orb ? new THREE.SphereGeometry(0.14, S.flat ? 5 : 14, S.flat ? 4 : 10) : new THREE.CylinderGeometry(0.16, 0.2, 0.36, S.flat ? 6 : 16);
      const items = Array.from({ length: n }, (_, i) => { const m = new THREE.Mesh(geo, mat); e.scene.add(m); return { m, a: (i / n) * Math.PI * 2, r: orb ? rad : rad * (0.3 + Math.random() * 0.7), h: Math.random() * (orb ? 0.6 : 2.5), ph: Math.random() * 6.28 }; });
      for (let i = 0; i < Math.min(3, n); i += 1) { const it = items[i * Math.floor(n / 3)] || items[i]; R.lightSources.push({ kind: 'always', x: v.x + Math.cos(it.a) * it.r, y: v.y + it.h, z: v.z + Math.sin(it.a) * it.r, i: orb ? 2 : 3, d: orb ? 4 : 6, c: col || (orb ? '#8fd8ff' : '#ffb35a') }); }
      ticks.push((t) => items.forEach((it) => { const a = orb ? it.a + t * 0.8 : it.a + Math.sin(t * 0.1 + it.ph) * 0.1; it.m.position.set(v.x + Math.cos(a) * it.r, v.y + it.h + Math.sin(t * (orb ? 2 : 0.8) + it.ph) * (orb ? 0.15 : 0.25), v.z + Math.sin(a) * it.r); }));
    } else if (v.type === 'light_beams') {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.6, 7, 20, 1, true).translate(0, -3.5, 0), new THREE.MeshBasicMaterial({ color: col || '#9fd0ff', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.position.set(v.x, v.y || 7, v.z); e.scene.add(m);
      ticks.push((t) => { m.rotation.z = Math.sin(t * 0.5 + v.x) * 0.35; m.rotation.x = Math.cos(t * 0.4 + v.z) * 0.25; });
    }
  }
  return (t, dt) => ticks.forEach((f) => f(t, dt));
}