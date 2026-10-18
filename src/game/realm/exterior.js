import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Merger } from '../convergence/market/merge';
import { terrain, DRIVE, WALK, PATIO, SIDEWALK, STREET, FAR_WALK, F1 } from './layout';
import { Door } from './doors';
import { rng } from './textures';

// Organic foliage blob: icosphere with vertex jitter, smooth-shaded.
function blob(r, R) {
  const g = new THREE.IcosahedronGeometry(r, 2); g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const m = mergeVertices(g), p = m.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(0.85 + R() * 0.3); v.y *= 0.85; p.setXYZ(i, v.x, v.y, v.z); }
  m.computeVertexNormals(); m.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(p.count * 2), 2));
  return m;
}

function tree(mg, M, x, z, s, R) {
  const y = terrain(x, z), L = [M.tint('leaf', '#4a7a3a'), M.tint('leaf', '#5c8c42'), M.tint('leaf', '#3d6b33')];
  mg.add(M.tint('wood', '#5a4636'), new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 2.6 * s, 10), x, y + 1.3 * s, z);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, d = i ? 1.1 * s : 0; mg.add(L[i % 3], blob((1.1 + R() * 0.5) * s, R), x + Math.cos(a) * d, y + (3.2 + (i % 3) * 0.55) * s, z + Math.sin(a) * d); }
}

function shrub(mg, M, x, z, r, R, flowers) {
  const y = terrain(x, z);
  mg.add(M.tint('leaf', R() > 0.5 ? '#3f6b35' : '#4f7d3a'), blob(r, R), x, y + r * 0.7, z);
  if (flowers) for (let i = 0; i < 6; i++) { const a = R() * 6.28, d = r * (0.5 + R() * 0.5); mg.add(M.tint('ceramic', flowers[(R() * flowers.length) | 0]), new THREE.IcosahedronGeometry(0.06, 0), x + Math.cos(a) * d, y + r * (0.9 + R() * 0.5), z + Math.sin(a) * d); }
}

function neighbor(R, mg, x, z, back, pal, two, rnd) {
  const { M, e } = R, s = back ? -1 : 1, W = 11, D = 9, f = 0.45, h = two ? 5.8 : 3.2;
  const B = (mat, lx, y, lz, w, hh, d, rx = 0) => mg.box(mat, x + s * lx, y, z + s * lz, w, hh, d, 0, 2, s * rx, 0);
  B(M.foundation, 0, f / 2, 0, W + 0.2, f, D + 0.2);
  B(M.tint('siding', pal), 0, f + h / 2, 0, W, h, D);
  for (const row of two ? [f + 1.5, f + 4.3] : [f + 1.5]) for (const lx of [-3.6, -1.2, 1.4, 3.8]) { if (row < 2 && lx === -1.2) continue; B(M.trim, lx, row, D / 2 + 0.02, 1.36, 1.5, 0.04); B(M.glow.window, lx, row, D / 2 + 0.05, 1.16, 1.3, 0.04); B(M.shutter, lx - 0.85, row, D / 2 + 0.04, 0.36, 1.4, 0.04); B(M.shutter, lx + 0.85, row, D / 2 + 0.04, 0.36, 1.4, 0.04); }
  B(M.tint('gloss', ['#7a1f3d', '#1f3d5a', '#2f5a34'][(rnd() * 3) | 0]), -1.2, f + 1.05, D / 2 + 0.04, 1.0, 2.1, 0.06);
  B(M.trim, -1.2, f + 2.55, D / 2 + 0.9, 2.6, 0.12, 1.8); B(M.trim, -2.3, f + 1.25, D / 2 + 1.6, 0.14, 2.5, 0.14); B(M.trim, -0.1, f + 1.25, D / 2 + 1.6, 0.14, 2.5, 0.14);
  const top = f + h, rise = 2.4, a = Math.atan2(rise, D / 2 + 0.5), L = Math.hypot(D / 2 + 0.5, rise);
  B(M.roof, 0, top + rise / 2, (D / 2 + 0.5) / 2, W + 0.8, 0.14, L, a);
  B(M.roof, 0, top + rise / 2, -(D / 2 + 0.5) / 2, W + 0.8, 0.14, L, -a);
  const sh = new THREE.Shape([new THREE.Vector2(-D / 2, 0), new THREE.Vector2(D / 2, 0), new THREE.Vector2(0, rise)]);
  for (const sx of [-1, 1]) mg.add(M.tint('siding', pal), new THREE.ExtrudeGeometry(sh, { depth: 0.1, bevelEnabled: false }), x + sx * W / 2 - 0.05, top, z, 0, Math.PI / 2, 0);
  mg.box(M.tint('concrete'), x + s * 3.2, 0.03, z + s * (D / 2 + 5), 3.4, 0.05, 10);
  e.colliders.addBox(x, z, W / 2 + 0.1, D / 2 + 0.1, 0, -1, 20, 'wall');
}

export function buildExterior(R) {
  const { M, e } = R, mg = new Merger(1000), r = rng(91);
  // Lawn: one terrain-following mesh with tonal variation.
  const g = new THREE.PlaneGeometry(260, 260, 130, 130); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv, col = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, terrain(x, z) - 0.015); uv.setXY(i, uv.getX(i) * 90, uv.getY(i) * 90); const k = 0.82 + 0.18 * Math.sin(x * 0.13) * Math.cos(z * 0.11) + (r() - 0.5) * 0.06; col.set([k, k * 1.02, k * 0.95], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals();
  const ground = new THREE.Mesh(g, M.tint('grass')); ground.receiveShadow = true; e.scene.add(ground); R.floorMeshes.push(ground);
  // Street, sidewalks, drive, walk, patio
  const conc = M.tint('concrete');
  mg.box(M.tint('asphalt'), 0, STREET.y - 0.1, (STREET.z0 + STREET.z1) / 2, 260, 0.2, STREET.z1 - STREET.z0, 0, 4);
  for (let x = -128; x < 128; x += 4) mg.box(M.tint('paint', '#e9d76a'), x, STREET.y + 0.002, (STREET.z0 + STREET.z1) / 2, 2, 0.01, 0.12);
  mg.box(conc, 0, SIDEWALK.y - 0.06, (SIDEWALK.z0 + SIDEWALK.z1) / 2, 260, 0.12, SIDEWALK.z1 - SIDEWALK.z0, 0, 1.5);
  mg.box(conc, 0, SIDEWALK.y - 0.06, (FAR_WALK.z0 + FAR_WALK.z1) / 2, 260, 0.12, FAR_WALK.z1 - FAR_WALK.z0, 0, 1.5);
  for (const zc of [STREET.z0, STREET.z1]) mg.box(conc, 0, 0.0, zc, 260, 0.24, 0.2, 0, 1);
  mg.box(conc, (DRIVE.x0 + DRIVE.x1) / 2, DRIVE.y - 0.02, (DRIVE.z0 + SIDEWALK.z0) / 2, DRIVE.x1 - DRIVE.x0, 0.04, SIDEWALK.z0 - DRIVE.z0, 0, 2);
  mg.box(M.tint('pavers'), 0, WALK.y - 0.025, (WALK.z0 + WALK.z1) / 2, WALK.x1 - WALK.x0, 0.05, WALK.z1 - WALK.z0, 0, 2);
  mg.box(M.tint('pavers'), 0, PATIO.y - 0.03, (PATIO.z0 + PATIO.z1) / 2, PATIO.x1 - PATIO.x0, 0.06, PATIO.z1 - PATIO.z0, 0, 2);
  mg.box(M.tint('stone', '#d8d0c4'), 0, PATIO.y, PATIO.z0 - 0.1, PATIO.x1 - PATIO.x0 + 0.4, 0.08, 0.2, 0, 1);
  for (const x of [PATIO.x0 - 0.1, PATIO.x1 + 0.1]) mg.box(M.tint('stone', '#d8d0c4'), x, PATIO.y, (PATIO.z0 + PATIO.z1) / 2, 0.2, 0.08, PATIO.z1 - PATIO.z0, 0, 1);
  // Beds, shrubs and flowers along the porch and back fence
  const FL = ['#f08a9c', '#ffffff', '#b28ad9', '#f6c453', '#ff7a59'];
  for (const [x0, x1] of [[-6.6, -1.45], [1.45, 6.6]]) { mg.box(M.tint('mulch'), (x0 + x1) / 2, 0.03, 9.2, x1 - x0, 0.06, 1.0, 0, 1); for (let x = x0 + 0.5; x < x1; x += 1.1) shrub(mg, M, x, 9.2, 0.45 + r() * 0.15, r, FL); }
  for (const [x0, x1] of [[-9.4, -9.4], [9.4, 9.4]]) for (let z = -5; z < 6; z += 1.6) shrub(mg, M, x0, z, 0.4 + r() * 0.15, r, r() > 0.5 ? FL : null);
  mg.box(M.tint('mulch'), 0, 0.03, -26.1, 31, 0.06, 1.4, 0, 1);
  for (let x = -15; x < 15.5; x += 1.3) shrub(mg, M, x + r() * 0.3, -26.1, 0.5 + r() * 0.25, r, r() > 0.4 ? FL : null);
  for (let z = -24; z < -8; z += 1.5) { shrub(mg, M, -15.2, z, 0.45 + r() * 0.2, r, null); shrub(mg, M, 15.2, z, 0.45 + r() * 0.2, r, null); }
  for (const [x, z, s] of [[-13, 11.5, 1.2], [6.6, 13.2, 1.0], [-13.5, -22.5, 1.3], [12.5, -14, 1.0], [-30, 12, 1.1], [27, 13, 1.2], [-8, 34, 1.0], [19, 34, 1.1], [-40, 34, 1.2], [44, 12, 1.1]]) { tree(mg, M, x, z, s, r); e.colliders.addCircle(x, z, 0.3 * s, -1, 20, 'tree'); }
  // Privacy fence around the backyard + driveway gate
  const FM = M.tint('fence');
  const fence = (ax, c, u0, u1) => { const m = (u0 + u1) / 2, l = u1 - u0; if (ax === 'x') { mg.box(FM, m, 0.92, c, l, 1.8, 0.04, 0, 2); mg.box(M.tint('wood', '#a58564'), m, 1.85, c, l, 0.06, 0.1); e.colliders.addBox(m, c, l / 2, 0.06, 0, -1, 3, 'wall'); } else { mg.box(FM, c, 0.92, m, 0.04, 1.8, l, 0, 2); mg.box(M.tint('wood', '#a58564'), c, 1.85, m, 0.1, 0.06, l); e.colliders.addBox(c, m, 0.06, l / 2, 0, -1, 3, 'wall'); } for (let u = u0; u <= u1 + 0.01; u += 2.4) (ax === 'x' ? mg.box(M.tint('wood', '#8a6a4a'), u, 0.98, c, 0.1, 1.96, 0.1) : mg.box(M.tint('wood', '#8a6a4a'), c, 0.98, u, 0.1, 1.96, 0.1)); };
  fence('x', -6, -16, -9.2); fence('x', -6, 9.2, 10); fence('x', -6, 13.5, 16); fence('z', -16, -27, -6); fence('z', 16, -27, -6); fence('x', -27, -16, 16);
  const gate = new Door(R, { ax: 'x', c: -6, u: 11.75, w: 3.5, h: 1.8, y0: 0, t: 0.04, swing: 'n', label: 'Driveway Gate', open: false, mat: FM, plain: true });
  e.scene.add(gate.pivot); R.doors.push(gate);
  // Mailbox, street lamps, shed
  mg.box(M.tint('wood', '#5a4636'), 9.4, 0.6, 15.0, 0.1, 1.2, 0.1); mg.box(M.tint('gloss', '#1f3d5a'), 9.4, 1.28, 15.0, 0.24, 0.24, 0.5); mg.box(M.tint('gloss', '#c0392b'), 9.53, 1.38, 15.05, 0.02, 0.18, 0.06);
  for (const x of [-24, -8, 18, 34]) { mg.add(M.tint('matte', '#22252a'), new THREE.CylinderGeometry(0.06, 0.09, 4.3, 10), x, 2.15, 15.0); mg.box(M.tint('matte', '#22252a'), x, 4.4, 15.0, 0.4, 0.12, 0.4); mg.box(M.glow.street, x, 4.2, 15.0, 0.3, 0.3, 0.3); e.colliders.addCircle(x, 15.0, 0.12, -1, 6, 'pole'); R.lightSources.push({ kind: 'street', x, y: 4.0, z: 15.0, i: 14, d: 14 }); }
  mg.box(M.tint('siding', '#9fb6b0'), 13, 1.2, -24.6, 3.0, 2.4, 2.4); mg.box(M.trim, 13, 1.05, -23.39, 1.0, 2.0, 0.04); mg.box(M.roof, 13, 2.6, -24.6, 3.4, 0.14, 2.8, 0, 2, 0.08, 0); e.colliders.addBox(13, -24.6, 1.55, 1.25, 0, -1, 4, 'wall');
  for (let z = 0; z < 15; z += 1.2) { mg.add(M.tint('leaf', '#3f6b35'), blob(0.55, r), -17.6, 0.45, z); mg.add(M.tint('leaf', '#3f6b35'), blob(0.55, r), 17.6, 0.45, z); }
  // Neighbourhood for establishing shots
  const PAL = ['#c9d6cf', '#e8d8b8', '#b8c6d9', '#e6c9b8', '#d4d9c2', '#f0eadc'];
  for (const [x, z, back, two] of [[-32, 3, false, true], [32, 3, false, false], [-56, 3, false, false], [56, 3, false, true], [-26, 38, true, true], [0, 38, true, false], [26, 38, true, true], [-52, 38, true, false], [52, 38, true, true]]) neighbor(R, mg, x, z, back, PAL[(r() * PAL.length) | 0], two, r);
  const sg = new THREE.Group(); mg.build(sg); e.scene.add(sg);
  for (const m of sg.children) if (m.material === conc || m.material === M.tint('pavers')) R.floorMeshes.push(m);
  void F1;
}