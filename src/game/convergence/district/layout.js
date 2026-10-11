import { BASE, CURB, ROAD, WALK, PLAZA } from '../boulevard/layout';

export { BASE, CURB, ROAD, WALK, PLAZA };
// The Convergence district: Astral Boulevard (x = 0) is the spine. Park Lane (x = -110)
// and Comet Market (x = 110) run parallel to it, and four cross streets link all three.
export const TOP = BASE + CURB;
export const NS = [-110, 0, 110];
export const EW = [-150, -70, 70, 150];
export const LIM = { x: 117, z: 163 };
export const PARK = { x0: -275, x1: -117, z0: -163, z1: 163 };
export const SPAWN = { x: 0, z: -86, yaw: 0 };

export const BLOCKS = [];
for (const [x0, x1] of [[-97, -13], [13, 97]]) for (const [z0, z1] of [[-137, -83], [-57, 57], [83, 137]]) BLOCKS.push({ x0, x1, z0, z1, central: z0 === -57 });

export function courtCenter(b) {
  const cx = b.central ? Math.sign(b.x0 + b.x1) * 61.5 : (b.x0 + b.x1) / 2;
  return { x: cx, z: (b.z0 + b.z1) / 2 };
}

// Open gathering spaces, kept clear of props.
export const SPACES = [
  { id: 'blvd-s', x: 0, z: -110, r: 6 }, { id: 'blvd-n', x: 0, z: 110, r: 6 },
  { id: 'plaza-s', x: 0, z: -17, r: 6 }, { id: 'plaza-n', x: 0, z: 17, r: 6 },
  { id: 'mkt-s', x: 110, z: -110, r: 6 }, { id: 'mkt-c', x: 110, z: 0, r: 6 }, { id: 'mkt-n', x: 110, z: 110, r: 6 },
  { id: 'orion', x: 55, z: -150, r: 6 }, { id: 'lyra', x: -55, z: -70, r: 6 }, { id: 'vega', x: 55, z: 70, r: 6 }, { id: 'draco', x: -55, z: 150, r: 6 },
  { id: 'court-se', x: 55, z: -110, r: 7 }, { id: 'court-nw', x: -55, z: 110, r: 7 }, { id: 'court-e', x: 61.5, z: 0, r: 7 }, { id: 'court-w', x: -61.5, z: 0, r: 7 },
  { id: 'park-1', x: -160, z: -120, r: 7 }, { id: 'park-2', x: -228, z: -70, r: 7 }, { id: 'park-3', x: -165, z: -30, r: 7 },
  { id: 'park-4', x: -230, z: 30, r: 7 }, { id: 'park-5', x: -168, z: 80, r: 7 }, { id: 'park-6', x: -230, z: 130, r: 7 },
];
export const nearSpace = (x, z, pad = 0) => SPACES.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + pad);

export function groundAt(x, z) {
  const ax = Math.abs(x), az = Math.abs(z);
  if (ax < PLAZA.hx && az < PLAZA.hz) return TOP;
  if (az < LIM.z) for (const c of NS) if (Math.abs(x - c) < ROAD) return BASE;
  if (x > -LIM.x && x < LIM.x) for (const c of EW) if (Math.abs(z - c) < ROAD) return BASE;
  return TOP;
}

const EW_NAMES = { '-150': 'Orion Row', '-70': 'Lyra Street', '70': 'Vega Street', '150': 'Draco Row' };
export function zoneAt(x, z) {
  if (x < PARK.x1) return 'Celestial Park';
  if (Math.abs(x) < PLAZA.hx && Math.abs(z) < PLAZA.hz) return 'Zodiac Plaza';
  if (x > 97) return 'Comet Market';
  for (const c of EW) if (Math.abs(z - c) < WALK) return EW_NAMES[c];
  if (Math.abs(x) < WALK) return 'Astral Boulevard';
  if (Math.abs(x + 110) < WALK) return 'Park Lane';
  return 'Courtyard Quarter';
}