import * as THREE from 'three';
import { Merger } from '../convergence/market/merge';
import { F1, F2, H1, SLAB, TOP, RIDGE, HOUSE, STAIR, PORCH, STEPS_F, STEPS_B, PATIO, ROOMS, WALLS } from './layout';
import { buildWall } from './walls';

const group = (R, mg) => { const g = new THREE.Group(); mg.build(g); R.e.scene.add(g); return g; };

// Krush's two-storey house: every wall, floor, ceiling and the roof are separate camera-cuttable pieces.
export function buildHouse(R) {
  for (const w of WALLS) buildWall(R, w);
  floors(R); stairs(R); roof(R); porch(R); shell(R);
}

function floors(R) {
  const { M } = R;
  for (const rm of ROOMS) {
    const [x0, x1, z0, z1] = rm.r, f = rm.f === 1 ? F1 : F2, fr = rm.fr || [rm.r], cr = rm.cr || (rm.f === 1 ? fr : [rm.r]);
    const fl = new Merger(1000);
    for (const [a, b, c, d] of fr) fl.box(M.floor(rm.floor), (a + b) / 2, f - 0.02, (c + d) / 2, b - a, 0.04, d - c, 0, 2);
    const fg = group(R, fl); R.floorMeshes.push(...fg.children); R.houseFloors.push(...fg.children);
    if (rm.f === 2) R.cut.push({ group: fg, meshes: [...fg.children], kind: 'floor2', room: rm.id, floor: 2 });
    const cy = rm.f === 1 ? F2 - SLAB : TOP, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const ce = new Merger(1000);
    for (const [a, b, c, d] of cr) ce.box(M.ceiling, (a + b) / 2, cy + 0.02, (c + d) / 2, b - a, 0.04, d - c, 0, 2);
    if (rm.id === 'kitchen') for (const [x, z] of [[4, -4], [7, -4], [4, -1], [7, -1]]) ce.add(M.glow.lamp, new THREE.CylinderGeometry(0.08, 0.08, 0.01, 16), x, cy - 0.006, z);
    else if (rm.id !== 'dining') {
      ce.add(M.glow.lamp, new THREE.SphereGeometry(0.22, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), cx, cy, cz, Math.PI, 0, 0);
      ce.add(M.tint('brass'), new THREE.TorusGeometry(0.22, 0.015, 8, 32), cx, cy - 0.005, cz, Math.PI / 2, 0, 0);
    }
    const cg = group(R, ce);
    R.cut.push({ group: cg, meshes: [...cg.children], kind: rm.f === 1 ? 'ceil1' : 'ceil2', room: rm.id, floor: rm.f === 1 ? 2 : 3 });
    const area = (x1 - x0) * (z1 - z0);
    R.lightSources.push({ kind: 'room', room: rm.id, x: cx, y: cy - 0.45, z: cz, i: Math.min(26, 8 + area * 0.45), d: Math.max(x1 - x0, z1 - z0) * 1.05 });
  }
}

function stairs(R) {
  const { M, e } = R, mg = new Merger(1000), { x0, x1, lo, hi, n } = STAIR, run = (lo - hi) / n, rise = H1 / n, w = x1 - x0, cx = (x0 + x1) / 2;
  const tread = M.floor('oak'), rail = M.tint('wood', '#4a3020');
  for (let i = 0; i < n; i++) {
    const zf = lo - i * run, top = F1 + (i + 1) * rise;
    mg.box(tread, cx, top - 0.025, zf - run / 2, w, 0.05, run + 0.03, 0, 2);
    mg.box(M.trim, cx, top - rise / 2 - 0.025, zf - 0.01, w, rise - 0.05, 0.02, 0, 2);
    mg.box(M.wall('foyer'), x0 + 0.05, (F1 + top - 0.05) / 2, zf - run / 2, 0.1, top - 0.05 - F1, run, 0, 2);
    for (const f of [0.25, 0.75]) mg.box(M.trim, x0 + 0.05, top + 0.45, zf - run * f, 0.035, 0.9, 0.035);
  }
  const L = Math.hypot(lo - hi, H1), a = Math.atan2(H1, lo - hi), zc = (lo + hi) / 2, yc = (F1 + rise + F2) / 2;
  mg.box(M.trim, x0 - 0.01, yc - 0.12, zc, 0.04, 0.3, L, 0, 1, a, 0);
  mg.add(rail, new THREE.CylinderGeometry(0.03, 0.03, L, 10), x0 + 0.05, yc + 0.92, zc, a - Math.PI / 2, 0, 0);
  mg.box(rail, x0 + 0.05, F1 + 0.55, lo + 0.05, 0.12, 1.1, 0.12);
  mg.box(rail, x0 + 0.05, F2 + 0.55, hi, 0.1, 1.1, 0.1);
  const up = F2 + 0.9;
  mg.box(rail, x0 + 0.05, up, (2.2 + lo) / 2, 0.07, 0.05, lo - 2.2); mg.box(rail, cx, up, lo, w, 0.05, 0.07);
  for (let z = 2.3; z < lo; z += 0.13) mg.box(M.trim, x0 + 0.05, F2 + 0.45, z, 0.035, 0.9, 0.035);
  for (let x = x0 + 0.1; x < x1; x += 0.13) mg.box(M.trim, x, F2 + 0.45, lo, 0.035, 0.9, 0.035);
  mg.box(rail, x0 + 0.05, F2 + 0.55, lo, 0.1, 1.1, 0.1);
  mg.box(M.trim, x0, F2 - SLAB / 2, zc, 0.04, SLAB, lo - hi); mg.box(M.trim, cx, F2 - SLAB / 2, lo, w, SLAB, 0.04); mg.box(M.trim, cx, F2 - SLAB / 2, hi, w, SLAB, 0.04);
  mg.box(M.wall('foyer'), cx, (F1 + F2 - SLAB) / 2, hi, w, F2 - SLAB - F1, 0.1);
  const g = group(R, mg); R.floorMeshes.push(...g.children);
  e.colliders.addBox(x0, zc, 0.06, (lo - hi) / 2, 0, -1, 20, 'wall');
  e.colliders.addBox(cx, lo, w / 2, 0.06, 0, F2 - 0.4, TOP, 'wall');
  e.colliders.addBox(cx, hi, w / 2, 0.06, 0, F1 - 0.3, F2 - 0.9, 'wall');
}

function roof(R) {
  const { M } = R, ov = 0.55, ze = HOUSE.z1 + ov, ye = TOP - (ov * (RIDGE - TOP)) / HOUSE.z1, L = Math.hypot(ze, RIDGE - ye), a = Math.atan2(RIDGE - ye, ze), W = 19.8;
  for (const s of [1, -1]) {
    const mg = new Merger(1000);
    mg.box(M.roof, 0, (ye + RIDGE) / 2 + 0.07, (s * ze) / 2, W, 0.14, L, 0, 2, s * a, 0);
    mg.box(M.trim, 0, ye - 0.06, s * (ze + 0.01), W, 0.22, 0.04);
    mg.box(M.trim, 0, ye - 0.12, s * (ze + 0.08), W, 0.12, 0.12);
    for (const x of [-9.75, 9.75]) mg.box(M.trim, x, ye / 2, s * (ze + 0.08), 0.08, ye, 0.08);
    for (const x of [-W / 2, W / 2]) mg.box(M.trim, x, (ye + RIDGE) / 2 - 0.05, (s * ze) / 2, 0.05, 0.24, L, 0, 1, s * a, 0);
    if (s > 0) mg.box(M.roof, 0, RIDGE + 0.12, 0, W, 0.08, 0.34);
    const g = group(R, mg); R.cut.push({ group: g, meshes: [...g.children], kind: 'roof', floor: 3 });
  }
  for (const s of [-1, 1]) {
    const mg = new Merger(1000), sh = new THREE.Shape([new THREE.Vector2(-HOUSE.z1, 0), new THREE.Vector2(HOUSE.z1, 0), new THREE.Vector2(0, RIDGE - TOP)]);
    const gg = new THREE.ExtrudeGeometry(sh, { depth: 0.22, bevelEnabled: false }), uv = gg.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / 2, uv.getY(i) / 2);
    mg.add(M.siding, gg, s * 9 - 0.11, TOP, 0, 0, Math.PI / 2, 0);
    mg.add(M.trim, new THREE.CylinderGeometry(0.36, 0.36, 0.05, 8), s * 9.13, TOP + 1.3, 0, 0, 0, Math.PI / 2);
    mg.add(M.shutter, new THREE.CylinderGeometry(0.28, 0.28, 0.05, 8), s * 9.15, TOP + 1.3, 0, 0, 0, Math.PI / 2);
    const g = group(R, mg); R.cut.push({ group: g, meshes: [...g.children], kind: 'roof', floor: 3 });
  }
}

function porch(R) {
  const { M, e } = R, st = new Merger(1000), y = PORCH.y, zc = (PORCH.z0 + PORCH.z1) / 2;
  st.box(M.porch, 0, y - 0.04, zc, PORCH.x1 - PORCH.x0, 0.08, PORCH.z1 - PORCH.z0, 0, 2);
  st.box(M.trim, 0, (y - 0.08) / 2, PORCH.z1 - 0.04, 13, y - 0.08, 0.06);
  for (const x of [PORCH.x0 + 0.03, PORCH.x1 - 0.03]) st.box(M.trim, x, (y - 0.08) / 2, zc, 0.06, y - 0.08, 2.6);
  for (let i = 0; i < 3; i++) { const top = y * (1 - (i + 1) / 4), z0 = STEPS_F.z0 + i * 0.433; st.box(M.porch, 0, top / 2, z0 + 0.2165, 2.6, top, 0.433, 0, 1); }
  for (let i = 0; i < 4; i++) { const top = F1 - (i * (F1 - PATIO.y)) / 4, z1 = STEPS_B.z1 - i * 0.325; st.box(M.tint('stone', '#d8d0c4'), (STEPS_B.x0 + STEPS_B.x1) / 2, top / 2, z1 - 0.1625, 1.4, top, 0.325, 0, 1); }
  for (const x of [-6.2, -2.0, 2.0, 6.2]) {
    st.box(M.trim, x, y + 0.075, 8.35, 0.34, 0.15, 0.34); st.add(M.trim, new THREE.CylinderGeometry(0.11, 0.135, 2.55, 24), x, y + 0.15 + 1.275, 8.35); st.box(M.trim, x, y + 2.76, 8.35, 0.3, 0.12, 0.3);
    e.colliders.addCircle(x, 8.35, 0.18, -1, 4, 'wall');
  }
  const runs = [[-6.2, -2.0, 8.35, 'x'], [2.0, 6.2, 8.35, 'x'], [6.1, 8.35, -6.2, 'z'], [6.1, 8.35, 6.2, 'z']];
  for (const [u0, u1, c, ax] of runs) {
    const m = (u0 + u1) / 2, l = u1 - u0, B = (yy, hh, th) => (ax === 'x' ? st.box(M.trim, m, yy, c, l, hh, th) : st.box(M.trim, c, yy, m, th, hh, l));
    B(y + 0.88, 0.06, 0.08); B(y + 0.1, 0.05, 0.06);
    for (let u = u0 + 0.12; u < u1 - 0.05; u += 0.13) (ax === 'x' ? st.box(M.trim, u, y + 0.49, c, 0.04, 0.74, 0.04) : st.box(M.trim, c, y + 0.49, u, 0.04, 0.74, 0.04));
    if (ax === 'x') e.colliders.addBox(m, c, l / 2, 0.08, 0, -1, 2, 'wall'); else e.colliders.addBox(c, m, 0.08, l / 2, 0, -1, 2, 'wall');
  }
  for (const [x, z] of [[-1.5, 6.13], [1.5, 6.13], [1.75, -6.13]]) { const yy = z > 0 ? F1 + 1.85 : F1 + 1.95; st.box(M.tint('matte', '#1b1c20'), x, yy, z + Math.sign(z) * 0.08, 0.16, 0.3, 0.16); st.box(M.glow.bulb, x, yy, z + Math.sign(z) * 0.08, 0.11, 0.2, 0.17); }
  st.box(M.tint('carpet', '#5a4636'), 0, y + 0.006, 6.6, 1.0, 0.012, 0.6);
  const sg = group(R, st); R.floorMeshes.push(...sg.children);
  const pr = new Merger(1000), yb = 3.37, ya = F2 + 0.3, yz = yb + 0.25, run = 8.95 - 6.0, ang = Math.atan2(ya - yz, run), Lr = Math.hypot(run, ya - yz);
  pr.box(M.trim, 0, yb + 0.1, 8.35, 13.2, 0.2, 0.24);
  pr.box(M.beadboard, 0, yb + 0.21, 7.25, 12.8, 0.03, 2.4, 0, 1);
  pr.box(M.roof, 0, (ya + yz) / 2 + 0.07, (6 + 8.95) / 2, 13.6, 0.12, Lr, 0, 2, ang, 0);
  pr.box(M.trim, 0, yz - 0.04, 8.97, 13.6, 0.18, 0.04); pr.box(M.trim, 0, yz - 0.1, 9.03, 13.6, 0.1, 0.1);
  const pg = group(R, pr); R.cut.push({ group: pg, meshes: [...pg.children], kind: 'roof', floor: 3 });
  R.lightSources.push({ kind: 'porch', x: 0, y: 3.15, z: 7.3, i: 10, d: 9 }, { kind: 'porch', x: 1.2, y: F1 + 2.3, z: -6.6, i: 6, d: 7 });
}

function shell(R) {
  const { M, e } = R, mg = new Merger(1000);
  mg.box(M.foundation, 0, F1 / 2 - 0.03, 6.06, 18.6, F1 + 0.06, 0.3, 0, 1.5);
  mg.box(M.foundation, 0, F1 / 2 - 0.03, -6.06, 18.6, F1 + 0.06, 0.3, 0, 1.5);
  for (const s of [-1, 1]) mg.box(M.foundation, s * 9.06, F1 / 2 - 0.03, 0, 0.3, F1 + 0.06, 12.4, 0, 1.5);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) mg.box(M.trim, sx * 9.03, (F1 + TOP) / 2, sz * 6.03, 0.2, TOP - F1, 0.2);
  mg.box(M.brick, -9.62, (RIDGE + 1) / 2, 0, 0.9, RIDGE + 1, 1.5, 0, 1.2);
  mg.box(M.tint('stone', '#8e8a84'), -9.62, RIDGE + 1.06, 0, 1.1, 0.12, 1.7, 0, 1);
  group(R, mg);
  e.colliders.addBox(-9.62, 0, 0.45, 0.75, 0, -1, 20, 'wall');
}