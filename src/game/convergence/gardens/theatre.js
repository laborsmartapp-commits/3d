import * as THREE from 'three';
import { THEATRE, CANAL, theatreEdge } from './layout';

const TAU = Math.PI * 2;
const shapeAt = (off, n = 360) => { const s = new THREE.Shape(); for (let i = 0; i <= n; i++) { const p = theatreEdge((i / n) * TAU, off); i ? s.lineTo(p.x, -p.z) : s.moveTo(p.x, -p.z); } return s; };
const flat = (g, y) => g.rotateX(-Math.PI / 2).translate(0, y, 0);

// The Grand Water Theatre: a scalloped stone basin with balustrade, viewing terrace,
// a stone spillway at its head, and a long canal down the Crystal Allée. Returns nozzle sites.
export function buildTheatre(K) {
  const { M, mg, e } = K, T = THEATRE;
  // Basin floor, water, carved rim.
  mg.add(M.stoneDark, flat(new THREE.ShapeGeometry(shapeAt(0)), -0.02), 0, 0, 0);
  const water = new THREE.Mesh(flat(new THREE.ShapeGeometry(shapeAt(0.2)), T.water), M.water); water.receiveShadow = true; e.scene.add(water);
  K.waters.push(water);
  const rim = shapeAt(2.4); rim.holes.push(shapeAt(0));
  mg.add(M.stone, new THREE.ExtrudeGeometry(rim, { depth: 0.85, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.12, bevelSegments: 2, curveSegments: 1 }).rotateX(-Math.PI / 2), 0, 0, 0);
  // Viewing terrace ring of pale stone, then a scalloped clipped-hedge collar with openings.
  const ter = shapeAt(9); ter.holes.push(shapeAt(2.3));
  mg.add(M.stone, flat(new THREE.ShapeGeometry(ter), 0.025), 0, 0, 0);
  const n = 220;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, p = theatreEdge(a, 1.6);
    // Balustrade: turned balusters on the rim, a continuous rail above, colliders keep walkers out of the deep water.
    if (i % 1 === 0) { mg.add(M.stone, new THREE.LatheGeometry([[0.14, 0], [0.2, 0.15], [0.1, 0.45], [0.18, 0.7], [0.1, 0.95], [0.16, 1.05]].map(([x, y]) => new THREE.Vector2(x, y)), 8), p.x, 0.85, p.z); }
    if (i % 2 === 0) e.colliders.addCircle(p.x, p.z, 1.15);
    if (i % 11 === 0) { const q = theatreEdge(a, 1.6); mg.add(M.stone, new THREE.BoxGeometry(0.55, 1.5, 0.55), q.x, 1.6, q.z, 0, -a); mg.add(M.stone, new THREE.LatheGeometry([[0, 0], [0.45, 0.1], [0.55, 0.45], [0.35, 0.75], [0.42, 0.9], [0, 0.95]].map(([x, y]) => new THREE.Vector2(x, y)), 14), q.x, 2.35, q.z); K.urns.push(q); }
    if (i % 22 === 5) { const h = theatreEdge(a, 11); K.benches.push({ x: h.x, z: h.z, yaw: Math.atan2(h.x - T.x, h.z - T.z) + Math.PI }); }
  }
  const rail = new THREE.CatmullRomCurve3(Array.from({ length: 180 }, (_, i) => { const p = theatreEdge((i / 180) * TAU, 1.6); return new THREE.Vector3(p.x, 1.95, p.z); }), true);
  mg.add(M.stone, new THREE.TubeGeometry(rail, 720, 0.16, 6, true), 0, 0, 0);
  for (let i = 0; i < 64; i++) { const a = (i / 64) * TAU; if (Math.abs(Math.sin(a)) > 0.93) continue; const p = theatreEdge(a, 10.5); K.hedges.push({ x: p.x, z: p.z, r: 1.6 + (i % 3) * 0.3 }); }

  // Spillway: stepped cascade wall at the head of the basin, a water curtain pours over its lip.
  const sz = T.z - T.rz - 1.5, sites = { curtain: [] };
  for (let s = 0; s < 4; s++) mg.add(M.stone, new THREE.BoxGeometry(52 - s * 6, 0.9, 2.2), T.x, 0.45 + s * 0.9, sz - 1.6 - s * 1.8);
  mg.add(M.stone, new THREE.BoxGeometry(54, 4.2, 1.2), T.x, 2.1, sz - 9);
  for (let k = -3; k <= 3; k++) { mg.add(M.bronze, new THREE.TorusGeometry(1.1, 0.12, 8, 24, Math.PI), T.x + k * 7, 4.2, sz - 8.35); }
  for (let x = -22; x <= 22; x += 1.15) sites.curtain.push([x, 3.65, sz - 1.8]);
  e.colliders.addBox(T.x, sz - 5, 28, 5.5, 0);

  // Canal with a head pool and a tail pool.
  const C = CANAL, len = C.z1 - C.z0, cz = (C.z0 + C.z1) / 2;
  mg.add(M.stoneDark, new THREE.BoxGeometry(C.w, 0.05, len), C.x, 0.0, cz);
  const cw = new THREE.Mesh(new THREE.PlaneGeometry(C.w, len).rotateX(-Math.PI / 2), M.water); cw.position.set(C.x, 0.34, cz); e.scene.add(cw); K.waters.push(cw);
  for (const sx of [-1, 1]) { mg.add(M.stone, new THREE.BoxGeometry(0.7, 0.7, len), C.x + sx * (C.w / 2 + 0.35), 0.35, cz); e.colliders.addBox(C.x + sx * (C.w / 2 + 0.2), cz, 0.55, len / 2, 0); }
  for (const z of [C.z0, C.z1]) {
    mg.add(M.stone, new THREE.CylinderGeometry(4.6, 4.8, 0.8, 40), C.x, 0.4, z);
    const pw = new THREE.Mesh(new THREE.CircleGeometry(4, 40).rotateX(-Math.PI / 2), M.water); pw.position.set(C.x, 0.82, z); e.scene.add(pw); K.waters.push(pw);
    e.colliders.addCircle(C.x, z, 5);
  }
  sites.chase = [];
  for (let k = 0; k < 10; k++) { const z = C.z0 + 8 + k * ((len - 16) / 9); sites.chase.push([C.x - 1, 0.45, z, k], [C.x + 1, 0.45, z, k]); }
  sites.poolCrowns = [[C.x, 0.9, C.z0], [C.x, 0.9, C.z1]];
  return sites;
}

// A bronze nozzle collar with petal lip, sitting just above the water.
export function nozzle(K, x, y, z, big) {
  const { M, mg } = K, s = big ? 1.6 : 1;
  mg.add(M.bronze, new THREE.CylinderGeometry(0.12 * s, 0.2 * s, 0.35, 10), x, y - 0.05, z);
  mg.add(M.gold, new THREE.TorusGeometry(0.2 * s, 0.05 * s, 6, 14), x, y + 0.12, z, Math.PI / 2);
}