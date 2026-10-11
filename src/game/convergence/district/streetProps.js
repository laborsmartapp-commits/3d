import * as THREE from 'three';
import { bench, stall } from '../boulevard/props';
import { NS, EW, BLOCKS, courtCenter, nearSpace, PLAZA, ROAD, TOP } from './layout';
import { lamp, fountain } from './kit';

const nearCross = (v, lines, d = 15) => lines.some((c) => Math.abs(v - c) < d);
const inPlaza = (x, z) => Math.abs(x) < PLAZA.hx + 2 && Math.abs(z) < PLAZA.hz + 2;
const ok = (x, z, pad = 2) => !inPlaza(x, z) && !nearSpace(x, z, pad);
const FLAGS = ['#1e3a8a', '#b91c1c', '#ca8a04', '#15803d'];

function plantTree(e, forest, x, z) {
  forest.add(x, z, 1);
  e.batch.add(e.mats.marble, x, TOP + 0.3, z, 1.5, 0.6, 1.5);
  e.colliders.addBox(x, z, 0.75, 0.75, 0);
}

export function buildStreetProps(e, r, forest) {
  const B = e.batch, M = e.mats;
  for (const c of NS) for (const s of [-1, 1]) for (let z = -150; z <= 150; z += 18) {
    const x = c + s * (ROAD + 1.1);
    if (!nearCross(z, EW) && ok(x, z)) lamp(e, x, z);
    if (c !== 0) continue;
    const tz = z + 9, tx = s * (ROAD + 1.6);
    if (tz < 155 && !nearCross(tz, EW) && ok(tx, tz)) plantTree(e, forest, tx, tz);
    if (!nearCross(z + 4, EW) && ok(x, z + 4)) bench(e, s * (ROAD + 3.6), z + 4, s);
  }
  for (const c of EW) for (const s of [-1, 1]) for (let x = -99; x <= 99; x += 18) {
    const z = c + s * (ROAD + 1.1);
    if (!nearCross(x, NS) && ok(x, z)) lamp(e, x, z);
  }
  // Comet Market: stalls on both pavements and bunting strung across the street.
  for (const s of [-1, 1]) for (let z = -140; z <= 140; z += 14) {
    const x = 110 + s * 10;
    if (!nearCross(z, EW, 16) && !nearSpace(x, z, 9)) stall(e, x, z, r, s > 0 ? -Math.PI / 2 : Math.PI / 2);
  }
  const flags = FLAGS.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, side: THREE.DoubleSide }));
  for (let z = -135; z <= 135; z += 30) {
    if (nearCross(z, EW, 16)) continue;
    B.add(M.iron, 110, TOP + 6.6, z, 26, 0.03, 0.03);
    for (let i = 0; i < 17; i++) B.add(flags[i % 4], 97.5 + i * 1.55, TOP + 6.25, z, 0.7, 0.6, 0.03);
  }
  // Zodiac Plaza stalls and lamps.
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2;
    if (Math.abs(Math.cos(a)) > 0.85) continue;
    stall(e, Math.sin(a) * 23, Math.cos(a) * 24, r);
  }
  for (const [x, z] of [[-18, -24], [18, -24], [-18, 24], [18, 24]]) lamp(e, x, z);
  // Courtyards: a fountain square framed by trees and benches.
  for (const b of BLOCKS) {
    const { x, z } = courtCenter(b), hx = b.central ? 15 : 20, hz = b.central ? 30 : 9;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) plantTree(e, forest, x + sx * hx, z + sz * hz);
    if (!nearSpace(x, z, 1)) fountain(e, x, z);
    for (const sx of [-1, 1]) bench(e, x + sx * (b.central ? 12 : 13), z + (b.central ? 14 : 0), sx);
  }
}