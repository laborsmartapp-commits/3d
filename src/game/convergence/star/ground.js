import * as THREE from 'three';
import { STREETS, MAIN, SIDEWALKS, PLAZA, COURTS, CURB, onRoad, inPlaza, segDist, rng } from './layout';

// Road decals atlas: manhole, drain grate, patch, oil stain, puddle, crack, gum/stains, crosswalk bar.
function decalTex() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), r = rng(77);
  const cell = (i, f) => { g.save(); g.translate((i % 4) * 128, Math.floor(i / 4) * 128); f(); g.restore(); };
  cell(0, () => { g.fillStyle = '#2b2a2a'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.strokeStyle = '#4a4744'; g.lineWidth = 4; for (let k = 20; k < 58; k += 10) { g.beginPath(); g.arc(64, 64, k, 0, 7); g.stroke(); } });
  cell(1, () => { g.fillStyle = '#1c1c1c'; g.fillRect(14, 34, 100, 60); g.fillStyle = '#3c3a38'; for (let k = 0; k < 9; k++) g.fillRect(20 + k * 11, 38, 5, 52); });
  cell(2, () => { g.fillStyle = 'rgba(12,12,14,0.85)'; g.fillRect(6, 10, 116, 108); for (let k = 0; k < 300; k++) { g.fillStyle = `rgba(70,70,74,${r() * 0.4})`; g.fillRect(6 + r() * 116, 10 + r() * 108, 2, 2); } });
  cell(3, () => { const gr = g.createRadialGradient(64, 64, 4, 64, 64, 60); gr.addColorStop(0, 'rgba(5,5,8,0.8)'); gr.addColorStop(1, 'rgba(5,5,8,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); });
  cell(4, () => { const gr = g.createRadialGradient(64, 64, 10, 64, 64, 62); gr.addColorStop(0, 'rgba(40,46,60,0.95)'); gr.addColorStop(0.8, 'rgba(40,46,60,0.8)'); gr.addColorStop(1, 'rgba(40,46,60,0)'); g.fillStyle = gr; g.beginPath(); g.ellipse(64, 64, 62, 40, 0.3, 0, 7); g.fill(); });
  cell(5, () => { g.strokeStyle = 'rgba(8,8,10,0.9)'; g.lineWidth = 3; g.beginPath(); let x = 10, y = 64; g.moveTo(x, y); while (x < 118) { x += 8 + r() * 10; y += (r() - 0.5) * 22; g.lineTo(x, y); } g.stroke(); });
  cell(6, () => { for (let k = 0; k < 26; k++) { g.fillStyle = `rgba(20,18,16,${0.3 + r() * 0.4})`; g.beginPath(); g.arc(r() * 128, r() * 128, 2 + r() * 4, 0, 7); g.fill(); } });
  cell(7, () => { g.fillStyle = 'rgba(228,224,212,0.82)'; g.fillRect(0, 0, 128, 128); for (let k = 0; k < 500; k++) { g.fillStyle = 'rgba(40,40,40,0.5)'; g.fillRect(r() * 128, r() * 128, 3, 3); } });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const uvq = (w, h, i) => { const g = new THREE.PlaneGeometry(w, h).rotateX(-Math.PI / 2), a = g.attributes.uv, u0 = (i % 4) / 4, v1 = 1 - Math.floor(i / 4) / 4; for (let k = 0; k < 4; k++) a.setXY(k, u0 + a.getX(k) * 0.25, v1 - 0.25 + a.getY(k) * 0.25); return g; };

export function buildGround(K) {
  const { M, mg, e } = K, R = rng(4);
  const base = new THREE.Mesh(new THREE.PlaneGeometry(720, 560), M.asphalt); base.rotation.x = -Math.PI / 2; base.receiveShadow = true;
  M.asphalt.map.repeat.set(720 / 7, 560 / 7); M.asphalt.bumpMap.repeat.set(720 / 7, 560 / 7); e.scene.add(base);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(2400, 2400), new THREE.MeshStandardMaterial({ color: '#1f1d24', roughness: 1 })); far.rotation.x = -Math.PI / 2; far.position.y = -0.1; e.scene.add(far);
  // Sidewalk slabs per street side (curbs are their edges); each street sits a hair higher than the last.
  STREETS.forEach((s, i) => { for (const w of SIDEWALKS.filter((x) => x.s === s)) {
    const m = (w.inner + w.outer) / 2, cu = (w.u0 + w.u1) / 2, x = s.a[0] + s.t[0] * cu + s.n[0] * w.side * m, z = s.a[1] + s.t[1] * cu + s.n[1] * w.side * m, h = CURB + i * 0.003;
    mg.box(s.kind === 'narrow' || s.hood === 'south' ? M.concreteWorn : M.concrete, x, h / 2, z, w.u1 - w.u0, h, w.outer - w.inner, Math.atan2(s.t[0], s.t[1]) + Math.PI / 2, 3);
    const cp = [s.a[0] + s.t[0] * cu + s.n[0] * w.side * (w.inner + 0.15), s.a[1] + s.t[1] * cu + s.n[1] * w.side * (w.inner + 0.15)];
    mg.box(M.curb, cp[0], h / 2 + 0.005, cp[1], w.u1 - w.u0, h + 0.01, 0.3, Math.atan2(s.t[0], s.t[1]) + Math.PI / 2, 0);
  } });
  // The pedestrian ellipse: granite paving, the two avenues continuing as darker desire lines, a ring.
  const ell = (rx, rz, y, h, mat) => { const sh = new THREE.Shape(); sh.absellipse(0, 0, rx, rz, 0, Math.PI * 2); const g = new THREE.ExtrudeGeometry(sh, { depth: h, bevelEnabled: false, curveSegments: 72 }); g.rotateX(-Math.PI / 2); g.translate(0, y, 0); mg.add(mat, g, 0, 0, 0); };
  ell(PLAZA.rx + 9, PLAZA.rz + 9, 0, CURB + 0.06, M.plaza);
  for (const th of [0.4887, -0.4887]) { const g = new THREE.PlaneGeometry(9, 176).rotateX(-Math.PI / 2); g.rotateY(-th); mg.add(M.plazaDark, g, 0, CURB + 0.075, 0); }
  ell(38, 28, CURB + 0.062, 0.02, M.plazaDark); ell(35.5, 25.5, CURB + 0.064, 0.02, M.plaza);
  for (const c of COURTS) mg.box(c.kind === 'gallery' ? M.plazaDark : M.concrete, c.x, CURB / 2 + 0.02, c.z, c.hw * 2 + 3, CURB + 0.04, c.hd * 2 + 3, 0, 3);
  // Neon Palm promenade, beach and a softly lit sea to the east.
  mg.box(M.promenade, 255, CURB / 2 + 0.01, 0, 14, CURB, 480, 0, 3);
  mg.box(M.sand, 281, 0.05, 0, 38, 0.1, 480, 0, 0);
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1600), M.sea); sea.rotation.x = -Math.PI / 2; sea.position.set(300 + 700, -0.3, 0); e.scene.add(sea);
  // Markings: faded centre lines and edge lines, crosswalks at every junction, bollards at the plaza.
  const dm = new THREE.MeshStandardMaterial({ map: decalTex(), transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const stripe = new THREE.MeshStandardMaterial({ color: '#b9ae88', roughness: 0.9, transparent: true, opacity: 0.7, polygonOffset: true, polygonOffsetFactor: -2 });
  const white = new THREE.MeshStandardMaterial({ color: '#cfccc2', roughness: 0.9, transparent: true, opacity: 0.75, polygonOffset: true, polygonOffsetFactor: -2 });
  const yawOf = (s) => Math.atan2(s.t[0], s.t[1]);
  for (const s of MAIN) {
    for (let u = 2; u < s.L - 2; u += 4) {
      const x = s.a[0] + s.t[0] * u, z = s.a[1] + s.t[1] * u;
      if (!onRoad(x, z) || MAIN.some((o) => o !== s && segDist(o, x, z) < o.w / 2 + 3)) continue;
      if (s.kind === 'diag' || s.kind === 'cross' || s.kind === 'drive') for (const o of [-0.15, 0.15]) mg.add(stripe, new THREE.PlaneGeometry(0.12, 3.6).rotateX(-Math.PI / 2), x + s.n[0] * o, 0.02, z + s.n[1] * o, 0, yawOf(s));
      else if (u % 8 < 4) mg.add(white, new THREE.PlaneGeometry(0.12, 2.4).rotateX(-Math.PI / 2), x, 0.02, z, 0, yawOf(s));
      if (R() < 0.05) mg.add(dm, uvq(1.4, 1.4, 0), x + s.n[0] * (R() - 0.5) * s.w * 0.5, 0.025, z + s.n[1] * (R() - 0.5) * s.w * 0.5, 0, R() * 6);
      if (R() < 0.08) mg.add(dm, uvq(2 + R() * 4, 1.5 + R() * 3, 2), x + s.n[0] * (R() - 0.5) * s.w * 0.7, 0.022, z + s.n[1] * (R() - 0.5) * s.w * 0.7, 0, yawOf(s));
      if (R() < 0.06) mg.add(dm, uvq(2, 2, 3), x + s.n[0] * (R() - 0.5) * s.w * 0.6, 0.023, z + s.n[1] * (R() - 0.5) * s.w * 0.6, 0, R() * 6);
      if (R() < 0.05) mg.add(dm, uvq(2.6, 1.6, 4), x + s.n[0] * s.w * 0.4, 0.024, z + s.n[1] * s.w * 0.4, 0, R() * 6);
      if (R() < 0.07) mg.add(dm, uvq(2.5, 0.6, 5), x + s.n[0] * (R() - 0.5) * s.w * 0.6, 0.026, z + s.n[1] * (R() - 0.5) * s.w * 0.6, 0, R() * 6);
      if (u % 24 < 4) for (const sd of [-1, 1]) mg.add(dm, uvq(0.9, 0.5, 1), x + s.n[0] * sd * (s.w / 2 - 0.5), 0.025, z + s.n[1] * sd * (s.w / 2 - 0.5), 0, yawOf(s));
    }
    for (const o of MAIN) {
      if (o === s) continue;
      const I = meet(s, o); if (!I) continue;
      for (const sd of [-1, 1]) {
        const k = o.w / 2 + 2.2, cx = I[0] + s.t[0] * sd * k, cz = I[1] + s.t[1] * sd * k;
        if (inPlaza(cx, cz, 2) || !onRoad(cx, cz)) continue;
        for (let b = -s.w / 2 + 0.6; b < s.w / 2 - 0.3; b += 1.1) mg.add(dm, uvq(0.55, 3, 7), cx + s.n[0] * b, 0.03, cz + s.n[1] * b, 0, yawOf(s) + Math.PI / 2 + Math.PI / 2);
      }
    }
  }
  plazaEdges(K, dm);
  return dm;
}
function meet(s, o) {
  const den = s.t[0] * o.t[1] - s.t[1] * o.t[0]; if (Math.abs(den) < 1e-6) return null;
  const dx = o.a[0] - s.a[0], dz = o.a[1] - s.a[1], u = (dx * o.t[1] - dz * o.t[0]) / den, v = (dx * s.t[1] - dz * s.t[0]) / den;
  return u > 0 && u < s.L && v > 0 && v < o.L ? [s.a[0] + s.t[0] * u, s.a[1] + s.t[1] * u] : null;
}
// Where each road meets the ellipse: bollards across the carriageway and a zebra crossing.
function plazaEdges(K, dm) {
  const { M, mg, e } = K;
  for (const s of MAIN) for (let u = 1; u < s.L; u++) {
    const x = s.a[0] + s.t[0] * u, z = s.a[1] + s.t[1] * u, px = s.a[0] + s.t[0] * (u - 1), pz = s.a[1] + s.t[1] * (u - 1);
    if (inPlaza(x, z, 9.3) === inPlaza(px, pz, 9.3)) continue;
    const inward = inPlaza(x, z, 9.3) ? 1 : -1;
    for (let b = -s.w / 2 + 0.8; b <= s.w / 2 - 0.8; b += 1.6) {
      const bx = x + s.n[0] * b, bz = z + s.n[1] * b;
      mg.add(M.steel, new THREE.CylinderGeometry(0.13, 0.15, 0.95, 10), bx, 0.48, bz); mg.add(M.neon.white, new THREE.CylinderGeometry(0.135, 0.135, 0.06, 10), bx, 0.82, bz);
      e.colliders.addCircle(bx, bz, 0.2);
      mg.add(dm, uvq(0.55, 3, 7), x - s.t[0] * inward * 3 + s.n[0] * b, 0.03, z - s.t[1] * inward * 3 + s.n[1] * b, 0, Math.atan2(s.t[0], s.t[1]));
    }
  }
}