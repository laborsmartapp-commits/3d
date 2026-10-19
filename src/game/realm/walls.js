import * as THREE from 'three';
import { Merger } from '../convergence/market/merge';
import { F1, F2, TOP, SLAB } from './layout';
import { Door } from './doors';

// One wall segment as its own camera-cuttable group: two painted faces (one per room or siding outside),
// trim, real window glass, door/opening casings, and colliders on the solid parts only.
export function buildWall(R, w) {
  const { M, e } = R, ext = w.n === 'out' || w.p === 'out', t = ext ? 0.22 : 0.14;
  const y0 = w.f === 1 ? F1 : F2, y1 = w.f === 1 ? F2 : TOP, H = y1 - y0, ceil = (w.f === 1 ? F2 - SLAB : TOP) - y0;
  const X = w.ax === 'x', mg = new Merger(1000);
  const box = (mat, u, v, d, lu, lv, ld) => (X ? mg.box(mat, u, y0 + v, w.c + d, lu, lv, ld) : mg.box(mat, w.c + d, y0 + v, u, ld, lv, lu));
  const sideMat = (r) => (r === 'out' ? M.siding : M.wall(r));
  const sides = [[w.n, -1], [w.p, 1]], out = w.n === 'out' ? -1 : 1;
  const ops = [...w.ops].sort((a, b) => a.u - b.u), rects = [], solid = [];
  let cur = w.u0, sc = w.u0;
  for (const o of ops) {
    const a = o.u - o.w / 2, b = o.u + o.w / 2;
    if (a > cur) rects.push([cur, a, 0, H]);
    if (o.sill + o.h < H) rects.push([a, b, o.sill + o.h, H]);
    if (o.sill > 0) rects.push([a, b, 0, o.sill]);
    if (o.k === 'door' || o.k === 'open') { if (a > sc) solid.push([sc, a]); sc = b; }
    cur = b;
  }
  if (cur < w.u1) rects.push([cur, w.u1, 0, H]);
  if (sc < w.u1) solid.push([sc, w.u1]);

  for (const [u0, u1, v0, v1] of rects) for (const [r, s] of sides) {
    box(sideMat(r), (u0 + u1) / 2, (v0 + v1) / 2, (s * t) / 4, u1 - u0, v1 - v0, t / 2);
    if (r === 'out') continue;
    if (v0 === 0) box(M.trim, (u0 + u1) / 2, 0.055, s * (t / 2 + 0.006), u1 - u0, 0.11, 0.012);
    if (v1 >= ceil) box(M.trim, (u0 + u1) / 2, ceil - 0.045, s * (t / 2 + 0.01), u1 - u0, 0.09, 0.02);
  }
  if (ext) {
    const L = w.u1 - w.u0, m = (w.u0 + w.u1) / 2;
    box(M.trim, m, H - 0.12, out * (t / 2 + 0.015), L, 0.24, 0.03);
    if (w.f === 1) box(M.trim, m, 0.07, out * (t / 2 + 0.015), L, 0.14, 0.03);
  }

  for (const o of ops) {
    const a = o.u - o.w / 2, b = o.u + o.w / 2, top = o.sill + o.h, mid = o.sill + o.h / 2;
    box(M.trim, a + 0.015, mid, 0, 0.03, o.h, t + 0.02); box(M.trim, b - 0.015, mid, 0, 0.03, o.h, t + 0.02);
    box(M.trim, o.u, top - 0.015, 0, o.w, 0.03, t + 0.02);
    if (o.sill > 0) box(M.trim, o.u, o.sill + 0.015, 0, o.w, 0.03, t + 0.02);
    for (const [r, s] of sides) {
      const d = s * (t / 2 + 0.012), ex = r === 'out';
      box(M.trim, a - 0.04, mid, d, 0.08, o.h, 0.024); box(M.trim, b + 0.04, mid, d, 0.08, o.h, 0.024);
      box(M.trim, o.u, top + 0.05, d, o.w + 0.16 + (ex ? 0.06 : 0), ex ? 0.13 : 0.1, 0.026);
      if (o.k === 'win') { box(M.trim, o.u, o.sill - 0.02, s * (t / 2 + 0.04), o.w + 0.2, 0.04, 0.09); box(M.trim, o.u, o.sill - 0.09, d, o.w + 0.08, 0.1, 0.022); }
    }
    if (o.k === 'win' || o.k === 'glass') {
      for (const d of o.k === 'glass' ? [-t / 4, t / 4] : [0]) box(M.glass, o.u, mid, d, o.w - 0.04, o.h - 0.04, 0.012);
      if (o.k === 'win') {
        box(M.trim, o.u, o.sill + 0.04, 0, o.w - 0.04, 0.05, 0.05); box(M.trim, o.u, top - 0.04, 0, o.w - 0.04, 0.05, 0.05);
        if (o.h > 1.0) box(M.trim, o.u, mid, 0, o.w, 0.05, 0.06);
        const cols = o.w > 1.5 ? 3 : o.w > 0.7 ? 2 : 1;
        for (let i = 1; i < cols; i++) box(M.trim, a + (o.w * i) / cols, mid, 0, 0.025, o.h - 0.06, 0.035);
        if (o.h > 1.0) for (const f of [0.25, 0.75]) box(M.trim, o.u, o.sill + o.h * f, 0, o.w, 0.025, 0.035);
        if (ext && X && w.c === 6 && o.w >= 1.2) for (const s of [-1, 1]) {
          const su = s < 0 ? a - 0.3 : b + 0.3;
          box(M.shutter, su, mid, out * (t / 2 + 0.03), 0.44, o.h + 0.06, 0.035);
          for (let i = 0; i < 9; i++) box(M.shutter, su, o.sill + 0.12 + i * ((o.h - 0.2) / 8), out * (t / 2 + 0.05), 0.36, 0.03, 0.02);
          if (w.f === 1) { box(M.trim, o.u, o.sill - 0.28, out * (t / 2 + 0.16), o.w + 0.1, 0.22, 0.24); }
        }
      }
    }
  }

  const g = new THREE.Group(); mg.build(g);
  const meshes = [...g.children];
  for (const m of meshes) if (!m.material.transparent) { R.wallMeshes.push(m); e.occluders.push(m); }
  for (const o of ops) if (o.k === 'door') {
    const d = new Door(R, { ax: w.ax, c: w.c, u: o.u, w: o.w, h: o.h, y0, t, swing: o.swing, label: o.label, ext: o.ext, open: !o.ext });
    g.add(d.pivot); R.doors.push(d);
  }
  e.scene.add(g);
  R.cut.push({ group: g, meshes, kind: 'wall', floor: w.f, rooms: [w.n, w.p] });
  const ya = w.f === 1 ? (ext ? -1 : F1 - 0.3) : F2 - 0.3;
  for (const [u0, u1] of solid) {
    const m = (u0 + u1) / 2, hl = (u1 - u0) / 2, ht = t / 2 + 0.02;
    if (X) e.colliders.addBox(m, w.c, hl, ht, 0, ya, y1, 'wall'); else e.colliders.addBox(w.c, m, ht, hl, 0, ya, y1, 'wall');
  }
}