import * as THREE from 'three';
import { tbox, bbox } from './merge';

const line = (e) => { const dx = e.x2 - e.x1, dz = e.z2 - e.z1, L = Math.hypot(dx, dz) || 0.01; return { L, ry: Math.atan2(-dz, dx), mx: (e.x1 + e.x2) / 2, mz: (e.z1 + e.z2) / 2, ux: dx / L, uz: dz / L }; };

// Procedural architectural / landscape elements from the capability registry.
export function buildElement(c, e) {
  const S = c.S, mg = c.mg, I = c.inst, seg = S.seg, ry = e.ry || 0, cs = Math.cos(ry), sn = Math.sin(ry);
  const M = (name, color) => c.mat(e.material || name, e.color || color);
  const W = (lx, lz) => [e.x + lx * cs + lz * sn, e.z - lx * sn + lz * cs];
  const w = e.w || 2, d = e.d || 2;
  switch (e.type) {
    case 'road': {
      const { m, tile } = M('asphalt'); mg.add(m, tbox(w, 0.1, d, tile), e.x, -0.045, e.z, ry);
      const long = w >= d, Ln = long ? w : d, Wd = long ? d : w, paint = c.mat('painted_wood', '#f2f0e8').m, yellow = c.mat('painted_wood', '#e8b830').m;
      const rot = ry + (long ? 0 : Math.PI / 2), lanes = Math.max(2, e.lanes || 2);
      const at = (u, v) => { const lx = long ? u : v, lz = long ? v : u; return W(lx, lz); };
      for (let u = -Ln / 2 + 1.5; u < Ln / 2 - 1; u += S.flat ? 6 : 4.5) { const [x, z] = at(u, 0); I.add(yellow, x, 0.012, z, 2.4, 0.01, 0.14, rot); }
      if (S.trims) for (let k = 1; k < lanes / 2; k++) for (const s of [-1, 1]) for (let u = -Ln / 2 + 1; u < Ln / 2 - 1; u += 6) { const [x, z] = at(u, s * (Wd / lanes) * k); I.add(paint, x, 0.012, z, 3, 0.01, 0.12, rot); }
      if (S.trims === 2) for (const s of [-1, 1]) { const [x, z] = at(0, s * (Wd / 2 - 0.35)); I.add(paint, x, 0.012, z, Ln, 0.01, 0.12, rot); }
      return;
    }
    case 'sidewalk': {
      const { m, tile } = M('concrete'); mg.add(m, tbox(w, 0.15, d, tile), e.x, 0.075, e.z, ry);
      const curb = c.mat('concrete', '#c8c6c0').m, long = w >= d;
      for (const s of [-1, 1]) { const [x, z] = W(long ? 0 : s * (w / 2 - 0.1), long ? s * (d / 2 - 0.1) : 0); I.add(curb, x, 0.085, z, long ? w : 0.2, 0.17, long ? 0.2 : d, ry); }
      if (S.trims === 2) { const joint = c.mat('iron', '#6e6c68').m; for (let u = -(long ? w : d) / 2 + 1.5; u < (long ? w : d) / 2; u += 1.5) { const [x, z] = W(long ? u : 0, long ? 0 : u); I.add(joint, x, 0.151, z, long ? 0.02 : w - 0.4, 0.004, long ? d - 0.4 : 0.02, ry); } }
      return;
    }
    case 'crosswalk': {
      const paint = c.mat('painted_wood', '#f2f0e8').m, long = w >= d, n = Math.floor((long ? w : d) / 0.9);
      for (let i = 0; i < n; i++) { const u = -(long ? w : d) / 2 + 0.45 + i * 0.9; const [x, z] = W(long ? u : 0, long ? 0 : u); I.add(paint, x, 0.014, z, long ? 0.5 : w, 0.01, long ? d : 0.5, ry); }
      return;
    }
    case 'path': case 'plaza': {
      const { m, tile } = M(e.type === 'path' ? 'pavers' : 'pavers'); mg.add(m, tbox(w, 0.06, d, tile), e.x, 0.0, e.z, ry);
      if (S.trims || e.type === 'plaza') { const edge = c.mat('rough_stone').m, long = w >= d; for (const s of [-1, 1]) { const [x, z] = W(long ? 0 : s * w / 2, long ? s * d / 2 : 0); mg.add(edge, S.bevel ? bbox(long ? w : 0.18, 0.1, long ? 0.18 : d, S.bevel) : tbox(long ? w : 0.18, 0.1, long ? 0.18 : d, 1), x, 0.03, z, ry); } }
      return;
    }
    case 'platform': {
      const h = e.h ?? 0.5, { m, tile } = M('oak_wood'); mg.add(m, S.bevel > 0.03 ? bbox(w, h, d, 0.05) : tbox(w, h, d, tile), e.x, h / 2, e.z, ry);
      if (S.trims) mg.add(c.trim, tbox(w + 0.04, 0.08, d + 0.04, 1), e.x, h - 0.04, e.z, ry);
      return;
    }
    case 'pool': {
      const { m } = M('mosaic'), rim = c.mat('marble').m;
      mg.add(m, tbox(w, 0.1, d, 1), e.x, -0.75, e.z, ry); mg.add(c.mat('water').m, new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), e.x, -0.18, e.z, ry);
      for (const [lx, lz, sx, sz] of [[0, d / 2, w + 0.6, 0.3], [0, -d / 2, w + 0.6, 0.3], [w / 2, 0, 0.3, d], [-w / 2, 0, 0.3, d]]) { const [x, z] = W(lx, lz); mg.add(rim, S.bevel ? bbox(sx, 0.16, sz, S.bevel) : tbox(sx, 0.16, sz, 1), x, 0.06, z, ry); }
      c.C.addBox(e.x, e.z, w / 2, d / 2, ry, -2, 1, 'pool');
      return;
    }
    case 'fountain': {
      const r = e.r || 2.2, st = M('marble').m, wat = c.mat('water').m;
      mg.add(st, new THREE.CylinderGeometry(r, r + 0.15, 0.55, seg * 2), e.x, 0.27, e.z); mg.add(wat, new THREE.CylinderGeometry(r - 0.2, r - 0.2, 0.05, seg * 2), e.x, 0.5, e.z);
      mg.add(st, new THREE.CylinderGeometry(0.25, 0.35, 1.4, seg), e.x, 1.2, e.z); mg.add(st, new THREE.CylinderGeometry(r * 0.45, r * 0.3, 0.25, seg * 2), e.x, 1.9, e.z);
      mg.add(wat, new THREE.CylinderGeometry(r * 0.4, r * 0.4, 0.04, seg * 2), e.x, 2.03, e.z);
      c.C.addCircle(e.x, e.z, r, -1, 1.2, 'fountain'); c.jets.push({ x: e.x, y: 2.1, z: e.z, s: r * 0.5 });
      return;
    }
    case 'column': {
      const h = e.h || 4, r = e.r || 0.3, st = M('marble').m;
      mg.add(st, new THREE.CylinderGeometry(r, r * 1.05, h, seg), e.x, h / 2, e.z);
      if (S.trims) { mg.add(st, S.bevel ? bbox(r * 2.6, 0.25, r * 2.6, S.bevel) : tbox(r * 2.6, 0.25, r * 2.6, 1), e.x, 0.125, e.z); mg.add(st, S.bevel ? bbox(r * 2.6, 0.25, r * 2.6, S.bevel) : tbox(r * 2.6, 0.25, r * 2.6, 1), e.x, h - 0.125, e.z); }
      c.C.addCircle(e.x, e.z, r + 0.05, -1, h, 'column');
      return;
    }
    case 'arch': {
      const h = e.h || 4, st = M('sandstone').m, pw = 0.6;
      for (const s of [-1, 1]) { const [x, z] = W(s * (w / 2 + pw / 2), 0); mg.add(st, S.bevel ? bbox(pw, h, pw, S.bevel) : tbox(pw, h, pw, 2), x, h / 2, z, ry); c.C.addBox(x, z, pw / 2, pw / 2, ry, -1, h, 'arch'); }
      if (S.flat) mg.add(st, tbox(w + pw * 2, 0.6, pw, 2), e.x, h + 0.3, e.z, ry);
      else mg.add(st, new THREE.TorusGeometry(w / 2 + pw / 2, pw / 2, Math.max(6, seg / 3), seg, Math.PI), e.x, h, e.z, ry);
      return;
    }
    case 'fence': case 'railing': case 'hedge': {
      if (e.x1 == null) return;
      const l = line(e), rail = e.type === 'railing';
      if (e.type === 'hedge') { const h = e.h || 1.2, leaf = c.mat('moss', '#3f6e2e').m; mg.add(leaf, S.bevel ? bbox(l.L, h, 0.8, 0.3) : tbox(l.L, h, 0.8, 2), l.mx, (e.y || 0) + h / 2, l.mz, l.ry); c.C.addBox(l.mx, l.mz, l.L / 2, 0.4, l.ry, -1, h, 'hedge'); return; }
      const h = e.h || (rail ? 1 : 1.2), y = e.y || 0, mat = M(rail ? 'iron' : 'weathered_wood').m, n = Math.max(1, Math.round(l.L / (rail ? 1.5 : 2)));
      for (let i = 0; i <= n; i++) { const u = -l.L / 2 + (l.L * i) / n; I.add(mat, l.mx + l.ux * u, y + h / 2, l.mz + l.uz * u, rail ? 0.05 : 0.12, h, rail ? 0.05 : 0.12, l.ry); }
      for (const k of rail ? [0.97] : [0.3, 0.8]) I.add(mat, l.mx, y + h * k, l.mz, l.L, rail ? 0.06 : 0.1, rail ? 0.06 : 0.04, l.ry);
      if (!rail && S.trims === 2) for (let u = -l.L / 2 + 0.15; u < l.L / 2; u += 0.16) I.add(mat, l.mx + l.ux * u, y + h * 0.48, l.mz + l.uz * u, 0.09, h * 0.92, 0.02, l.ry);
      c.C.addBox(l.mx, l.mz, l.L / 2, 0.1, l.ry, y - 0.3, y + h, e.type);
      return;
    }
    case 'planter_bed': {
      const st = M('rough_stone').m; mg.add(st, S.bevel ? bbox(w, 0.5, d, S.bevel) : tbox(w, 0.5, d, 2), e.x, 0.25, e.z, ry);
      mg.add(c.mat('dirt').m, tbox(w - 0.2, 0.05, d - 0.2, 2), e.x, 0.48, e.z, ry); c.C.addBox(e.x, e.z, w / 2, d / 2, ry, -1, 0.5, 'planter');
      c.extraNature.push({ id: `${e.id}_fl`, type: 'flowers', x: e.x, z: e.z, y: 0.5, count: Math.max(2, Math.round(w * d * 0.8)), radius: Math.min(w, d) / 2 - 0.2, scale: 0.8, color: e.color });
      return;
    }
    case 'gazebo': {
      const r = e.r || 3, n = S.flat ? 6 : 8, { m } = M('painted_wood', '#f3eee4'), post = new THREE.CylinderGeometry(0.1, 0.12, 2.8, seg);
      mg.add(c.mat('oak_wood').m, new THREE.CylinderGeometry(r * 0.95, r, 0.2, n), e.x, 0.1, e.z);
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, x = e.x + Math.cos(a) * r * 0.85, z = e.z + Math.sin(a) * r * 0.85; mg.add(m, post, x, 1.6, z); c.C.addCircle(x, z, 0.14, -1, 3, 'post'); }
      mg.add(c.mat('roof_shingle', e.color).m, new THREE.ConeGeometry(r * 1.15, r * 0.7, n), e.x, 3 + r * 0.35, e.z);
      return;
    }
    case 'pergola': {
      const { m } = M('oak_wood'), post = S.bevel ? bbox(0.2, 2.6, 0.2, S.bevel) : tbox(0.2, 2.6, 0.2, 1);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const [x, z] = W(sx * (w / 2 - 0.1), sz * (d / 2 - 0.1)); mg.add(m, post, x, 1.3, z, ry); c.C.addCircle(x, z, 0.14, -1, 2.6, 'post'); }
      for (const sz of [-1, 1]) { const [x, z] = W(0, sz * (d / 2 - 0.1)); mg.add(m, tbox(w + 0.4, 0.2, 0.12, 1), x, 2.7, z, ry); }
      for (let u = -w / 2; u <= w / 2; u += S.flat ? 0.9 : 0.45) { const [x, z] = W(u, 0); I.add(m, x, 2.86, z, 0.07, 0.12, d + 0.3, ry); }
      return;
    }
    case 'bridge': {
      if (e.x1 == null) return;
      const l = line(e), bw = e.w || 2, top = e.y ?? Math.min(1.2, l.L * 0.08), { m } = M('weathered_wood'), n = S.flat ? 6 : 14;
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n, h0 = top * Math.sin(Math.PI * t0), h1 = top * Math.sin(Math.PI * t1), u = (t0 + t1) / 2 * l.L - l.L / 2, len = Math.hypot(l.L / n, h1 - h0);
        mg.add(m, tbox(len + 0.02, 0.12, bw, 1), l.mx + l.ux * u, (h0 + h1) / 2 - 0.06, l.mz + l.uz * u, l.ry, 0, Math.atan2(h1 - h0, l.L / n));
        for (const s of [-1, 1]) I.add(m, l.mx + l.ux * u - l.uz * s * bw / 2, (h0 + h1) / 2 + 0.5, l.mz + l.uz * u + l.ux * s * bw / 2, 0.06, 1, 0.06, l.ry);
      }
      return;
    }
    case 'plinth': {
      const h = e.h || 1, st = M('marble').m; mg.add(st, S.bevel ? bbox(w, h, w, S.bevel) : tbox(w, h, w, 1), e.x, h / 2, e.z, ry);
      c.C.addBox(e.x, e.z, w / 2, w / 2, ry, -1, h, 'plinth');
    }
  }
}