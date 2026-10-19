import * as THREE from 'three';
import { tbox, bbox, Merge } from './merge';

// Walkable floor slabs. Upper storeys are thicker so the ceiling below reads as solid.
export function buildFloors(c, floors) {
  for (const f of floors) {
    const { m, tile } = c.mat(f.material, f.color), th = f.y > 0.3 ? 0.25 : 0.12;
    c.floorMg.add(m, tbox(f.w, th, f.d, tile), f.x, f.y - th / 2 + 0.012, f.z);
    if (c.S.trims && f.y > 0.3) c.mg.add(c.trim, tbox(f.w + 0.06, 0.08, f.d + 0.06, 1), f.x, f.y - th + 0.04, f.z); // slab edge band
  }
}

// Straight wall with real door / opening gaps (walkable), windows and glass (blocked), trims by style.
export function buildWall(c, w) {
  const S = c.S, dx = w.x2 - w.x1, dz = w.z2 - w.z1, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L, ry = Math.atan2(-dz, dx);
  const { m, tile } = c.mat(w.material, w.color), t = w.t, y0 = w.y, H = w.h, r = S.bevel;
  const at = (u) => [w.x1 + ux * u, w.z1 + uz * u];
  const box = (mat, u, y, len, hh, dd, rad = 0) => { const [x, z] = at(u); c.mg.add(mat, rad ? bbox(len, hh, dd, rad) : tbox(len, hh, dd, 1), x, y, z, ry); };
  const piece = (u0, u1, b0, b1, solid) => {
    const len = u1 - u0, hh = b1 - b0; if (len < 0.02 || hh < 0.02) return;
    const [x, z] = at((u0 + u1) / 2);
    c.wallMg.add(m, tbox(len, hh, t, tile), x, y0 + (b0 + b1) / 2, z, ry);
    if (solid) c.C.addBox(x, z, len / 2, t / 2 + 0.03, ry, y0 + b0 - 0.3, y0 + b1, 'wall');
    if (S.trims && b0 === 0 && b1 === H) {
      box(c.trim, (u0 + u1) / 2, y0 + 0.07, len, 0.14, t + 0.04, r * 0.3); // baseboard
      if (S.trims === 2 || r > 0.04) box(c.trim, (u0 + u1) / 2, y0 + H - 0.07, len, 0.14, t + 0.08, r * 0.5); // crown
    }
  };
  const frame = (o, u) => {
    const ft = S.trims === 2 ? 0.07 : 0.1, fd = t + (S.trims ? 0.06 : 0.02), top = o.sill + o.h, rad = r * 0.4;
    box(c.trim, u, y0 + top + ft / 2, o.w + ft * 2, ft, fd, rad);
    for (const s of [-1, 1]) box(c.trim, u + s * (o.w / 2 + ft / 2), y0 + o.sill + o.h / 2, ft, o.h, fd, rad);
    if (o.kind === 'door' || o.kind === 'opening') return;
    box(c.trim, u, y0 + o.sill - ft / 2, o.w + ft * 2, ft, fd + (S.trims === 2 ? 0.1 : 0), rad);
    if (S.trims === 2 && o.w > 0.9) { box(c.trim, u, y0 + o.sill + o.h / 2, 0.04, o.h, 0.06); if (o.h > 1.2) box(c.trim, u, y0 + o.sill + o.h * 0.62, o.w, 0.04, 0.06); }
  };
  let u = 0;
  for (const o of [...w.openings].sort((a, b) => a.at - b.at)) {
    const a = o.at * L - o.w / 2, b = o.at * L + o.w / 2;
    if (a < u + 0.02) continue;
    piece(u, a, 0, H, true);
    if (o.sill > 0) piece(a, b, 0, o.sill, true);
    piece(a, b, o.sill + o.h, H, false);
    const mid = (a + b) / 2;
    if (o.kind === 'window' || o.kind === 'glass') {
      const [x, z] = at(mid);
      c.mg.add(c.glass, tbox(o.w, o.h, 0.02, 2), x, y0 + o.sill + o.h / 2, z, ry);
      c.C.addBox(x, z, o.w / 2, t / 2 + 0.03, ry, y0 + o.sill - 0.3, y0 + o.sill + o.h, 'glass');
    }
    frame(o, mid);
    u = b;
  }
  piece(u, L, 0, H, true);
}

// Roofs/ceilings: each is its own node so it can hide while the camera looks down into the room.
export function buildRoof(c, r) {
  const S = c.S, mg = new Merge(), g = new THREE.Group(), { m, tile } = c.mat(r.material, r.color);
  if (r.kind === 'flat') {
    mg.add(m, tbox(r.w, 0.2, r.d, tile), r.x, r.y + 0.1, r.z);
    if (S.trims) mg.add(c.trim, tbox(r.w + 0.12, 0.12, r.d + 0.12, 1), r.x, r.y + 0.26, r.z); // fascia / coping
  } else if (r.kind === 'gable') {
    const along = r.w >= r.d, span = (along ? r.d : r.w) + 0.6, len = (along ? r.w : r.d) + 0.6, rise = span * 0.32;
    const sh = new THREE.Shape([new THREE.Vector2(-span / 2, 0), new THREE.Vector2(span / 2, 0), new THREE.Vector2(0, rise)]);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false, curveSegments: 1 }).translate(0, 0, -len / 2);
    const roofMat = c.mat(r.material === 'plaster' ? 'roof_shingle' : r.material, r.color).m;
    mg.add(roofMat, geo, r.x, r.y, r.z, along ? Math.PI / 2 : 0);
    mg.add(c.mat('plaster').m, tbox(r.w, 0.12, r.d, 2), r.x, r.y + 0.06, r.z); // ceiling under the gable
  } else if (r.kind === 'glass') {
    mg.add(c.glass, tbox(r.w, 0.04, r.d, 2), r.x, r.y + 0.1, r.z);
    const n = Math.max(1, Math.round(r.w / 1.5));
    for (let i = 0; i <= n; i++) mg.add(c.metal, tbox(0.06, 0.12, r.d, 1), r.x - r.w / 2 + (r.w * i) / n, r.y + 0.1, r.z);
    mg.add(c.metal, tbox(r.w, 0.12, 0.06, 1), r.x, r.y + 0.1, r.z - r.d / 2); mg.add(c.metal, tbox(r.w, 0.12, 0.06, 1), r.x, r.y + 0.1, r.z + r.d / 2);
  } else {
    mg.add(m, S.bevel ? bbox(r.w, 0.16, r.d, S.bevel) : tbox(r.w, 0.16, r.d, tile), r.x, r.y + 0.08, r.z);
    const post = new THREE.CylinderGeometry(0.08, 0.1, r.y, S.seg);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = r.x + sx * (r.w / 2 - 0.2), z = r.z + sz * (r.d / 2 - 0.2); mg.add(c.metal, post, x, r.y / 2, z); c.C.addCircle(x, z, 0.14, -1, r.y, 'post'); }
  }
  mg.build(g); c.e.scene.add(g); c.roofs.push({ node: g, r });
}

// Walkable stairs (solid treads stacked from the bottom) with handrails when the style has trims.
export function buildStairs(c, s) {
  const S = c.S, { m } = c.mat(s.material), total = s.to_y - s.from_y, n = Math.max(2, Math.ceil(Math.abs(total) / 0.18)), rise = total / n, tread = s.run / n;
  const sn = Math.sin(s.dir), cs = Math.cos(s.dir);
  for (let i = 0; i < n; i++) {
    const along = -s.run / 2 + tread * (i + 0.5), top = s.from_y + rise * (i + 1), hh = Math.max(0.05, top - s.from_y);
    c.floorMg.add(m, S.bevel > 0.03 ? bbox(s.w, hh, tread, 0.02) : tbox(s.w, hh, tread, 1), s.x + sn * along, s.from_y + hh / 2, s.z + cs * along, s.dir);
  }
  if (!S.trims || total < 0.5) return;
  const len = Math.hypot(s.run, total), pitch = Math.atan2(total, s.run), my = s.from_y + total / 2 + 0.9;
  for (const side of [-1, 1]) {
    const ox = cs * side * (s.w / 2 - 0.05), oz = -sn * side * (s.w / 2 - 0.05);
    c.mg.add(c.metal, tbox(0.05, 0.05, len, 1), s.x + ox, my, s.z + oz, s.dir, -pitch);
    for (const k of [-1, 1]) c.mg.add(c.metal, tbox(0.04, 0.9, 0.04, 1), s.x + ox + sn * k * (s.run / 2 - 0.05), (k < 0 ? s.from_y : s.to_y) + 0.45, s.z + oz + cs * k * (s.run / 2 - 0.05));
  }
}