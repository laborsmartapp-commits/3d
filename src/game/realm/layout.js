// Krush's Living Realm: one suburban lot. Every floor, stair, porch and patio is a real walkable height,
// so the same ground query drives characters, cameras and furniture placement.
export const F1 = 0.6, H1 = 3.2, F2 = F1 + H1, SLAB = 0.25, TOP = F2 + 2.9, RIDGE = TOP + 2.9;
export const HOUSE = { x0: -9, x1: 9, z0: -6, z1: 6 };
export const STAIR = { x0: 0.8, x1: 2.0, lo: 5.0, hi: 0.5, n: 14 };
export const PORCH = { x0: -6.5, x1: 6.5, z0: 6, z1: 8.6, y: 0.55 };
export const STEPS_F = { x0: -1.3, x1: 1.3, z0: 8.6, z1: 9.9 };
export const STEPS_B = { x0: 0.25, x1: 1.65, z0: -7.3, z1: -6 };
export const PATIO = { x0: -7, x1: 7, z0: -13, z1: -7.3, y: 0.06 };
export const YARD = { x0: -16, x1: 16, z0: -27, z1: -6 };
export const WALK = { x0: -0.9, x1: 0.9, z0: 9.9, z1: 15.5, y: 0.05 };
export const DRIVE = { x0: 10, x1: 13.5, z0: -9, z1: 17.5, y: 0.04 };
export const SIDEWALK = { z0: 15.5, z1: 17.5, y: 0.12 };
export const STREET = { z0: 17.5, z1: 26, y: -0.05 };
export const FAR_WALK = { z0: 26, z1: 28 };
export const SPAWN = { x: 0, z: 16.5, yaw: Math.PI };
export const walkables = []; // set pieces you can stand on (stage risers), kept in sync by the set scene

const inR = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const inHouse = (x, z) => inR(HOUSE, x, z);
export const floorOf = (x, z, y) => (!inHouse(x, z) ? 0 : y >= F2 - 0.5 ? 2 : 1);

export function terrain(x, z) {
  if (z > STREET.z0 && z < STREET.z1) return STREET.y;
  if ((z >= SIDEWALK.z0 && z <= SIDEWALK.z1) || (z >= FAR_WALK.z0 && z <= FAR_WALK.z1)) return SIDEWALK.y;
  if (inR(DRIVE, x, z)) return DRIVE.y;
  if (inR(WALK, x, z)) return WALK.y;
  if (inR(PATIO, x, z)) return PATIO.y;
  const dx = Math.max(HOUSE.x0 - 2 - x, 0, x - HOUSE.x1 - 2), dz = Math.max(HOUSE.z0 - 8 - z, 0, z - HOUSE.z1 - 4);
  const k = clamp(Math.hypot(dx, dz) / 6, 0, 1);
  return 0.02 + k * (0.08 + 0.12 * Math.sin(x * 0.19 + 1.3) * Math.cos(z * 0.16 - 0.4) + 0.05 * Math.sin(x * 0.47 - z * 0.39));
}

// Highest walkable surface at (x, z) that someone standing at height y can reach (stairs, upper floor, risers).
export function groundAt(x, z, y = 0) {
  const lim = y + 0.65;
  let g = baseGroundAt(x, z, y);
  for (const w of walkables) {
    const dx = x - w.x, dz = z - w.z, c = Math.cos(w.rot), s = Math.sin(w.rot);
    if (Math.abs(dx * c - dz * s) <= w.hw && Math.abs(dx * s + dz * c) <= w.hd && w.y <= lim && w.y > g) g = w.y;
  }
  return g;
}

// The lot's own surfaces only (no set pieces). Set placement uses this, so a riser never stacks on itself.
export function baseGroundAt(x, z, y = 0) {
  const lim = y + 0.65;
  let g = terrain(x, z);
  if (inR(PORCH, x, z)) g = Math.max(g, PORCH.y);
  else if (inR(STEPS_F, x, z)) g = Math.max(g, PORCH.y * clamp(1 - (z - STEPS_F.z0) / (STEPS_F.z1 - STEPS_F.z0), 0, 1));
  else if (inR(STEPS_B, x, z)) g = Math.max(g, PATIO.y + (F1 - PATIO.y) * clamp((z - STEPS_B.z0) / (STEPS_B.z1 - STEPS_B.z0), 0, 1));
  if (inHouse(x, z)) {
    g = F1;
    const onStair = x >= STAIR.x0 && x <= STAIR.x1 && z >= STAIR.hi && z <= STAIR.lo;
    if (onStair) { const s = Math.min(F2, F1 + (H1 * (STAIR.lo - z + 0.16)) / (STAIR.lo - STAIR.hi)); if (s <= lim) g = s; }
    else if (F2 <= lim) g = F2;
  }
  for (const w of walkables) {
    const dx = x - w.x, dz = z - w.z, c = Math.cos(w.rot), s = Math.sin(w.rot);
    if (Math.abs(dx * c - dz * s) <= w.hw && Math.abs(dx * s + dz * c) <= w.hd && w.y <= lim && w.y > g) g = w.y;
  }
  return g;
}

// Rooms (smaller first so lookups pick the most specific). r = [x0, x1, z0, z1]; fr/cr = floor/ceiling pieces.
const HOLE = [[-2, 0.8, -1, 6], [0.8, 2, -1, 0.5], [0.8, 2, 5, 6]];
export const ROOMS = [
  { id: 'halfbath', name: 'Powder Room', f: 1, r: [-2, -0.4, -6, -3.8], floor: 'mosaic', wall: '#d9e4e4' },
  { id: 'booth', name: 'Vocal Booth', f: 1, r: [-9, -6.6, -6, -1], floor: 'carpet:#3a3442', wall: '#2e2c38' },
  { id: 'studio', name: 'Music Studio', f: 1, r: [-6.6, -2, -6, -1], floor: 'walnut', wall: '#353846' },
  { id: 'living', name: 'Living Room', f: 1, r: [-9, -2, -1, 6], floor: 'oak', wall: '#ece3d3' },
  { id: 'foyer', name: 'Foyer & Stairs', f: 1, r: [-2, 2, -1, 6], floor: 'oak', wall: '#efe8dc', cr: HOLE },
  { id: 'hall1', name: 'Back Hall', f: 1, r: [-2, 2, -6, -1], floor: 'oak', wall: '#efe8dc', fr: [[-0.4, 2, -6, -3.8], [-2, 2, -3.8, -1]] },
  { id: 'dining', name: 'Dining Room', f: 1, r: [2, 9, 1, 6], floor: 'oak', wall: '#d5dccd' },
  { id: 'kitchen', name: 'Kitchen', f: 1, r: [2, 9, -6, 1], floor: 'tile', wall: '#f3efe6' },
  { id: 'krush', name: "Krush's Bedroom", f: 2, r: [-9, -2, 0, 6], floor: 'carpet:#5b6478', wall: '#cdd7e6' },
  { id: 'den', name: 'Upstairs Den', f: 2, r: [-9, -2, -6, 0], floor: 'oak', wall: '#e8dfcf' },
  { id: 'bath', name: 'Hall Bathroom', f: 2, r: [2, 5, -6, -1], floor: 'mosaic', wall: '#dde8ea' },
  { id: 'ensuite', name: 'Primary Bathroom', f: 2, r: [5, 9, -6, -1], floor: 'marble', wall: '#eeefeb' },
  { id: 'parents', name: "Parents' Bedroom", f: 2, r: [2, 9, -1, 6], floor: 'carpet:#cdbfae', wall: '#e9dfd2' },
  { id: 'hall2', name: 'Upstairs Hall', f: 2, r: [-2, 2, -6, 6], floor: 'oak', wall: '#efe8dc', fr: [[-2, 0.8, -6, 6], [0.8, 2, -6, 0.5], [0.8, 2, 5, 6]] },
];

export function roomAt(x, z, y = 0) {
  const f = floorOf(x, z, y);
  return f ? ROOMS.find((o) => o.f === f && x >= o.r[0] && x <= o.r[1] && z >= o.r[2] && z <= o.r[3]) || null : null;
}

export function zoneAt(x, z, y = 0) {
  if (inHouse(x, z)) return roomAt(x, z, y)?.name || 'Inside';
  if (inR(PORCH, x, z) || inR(STEPS_F, x, z)) return 'Front Porch';
  if (inR(PATIO, x, z) || inR(STEPS_B, x, z)) return 'Patio';
  if (z < -6 && x >= YARD.x0 && x <= YARD.x1 && z >= YARD.z0) return 'Backyard';
  if (inR(DRIVE, x, z)) return 'Driveway';
  if (z >= STREET.z0 && z <= STREET.z1) return 'Street';
  if (z >= SIDEWALK.z0 && z <= FAR_WALK.z1) return 'Sidewalk';
  if (Math.abs(x) < 18 && z > -6 && z < SIDEWALK.z0) return 'Front Yard';
  return 'Neighborhood';
}

// Walls: axis 'x' runs along x at z = c; axis 'z' runs along z at x = c. n/p = room on the negative/positive side.
const win = (u, w, o = {}) => ({ k: 'win', u, w, sill: o.sill ?? 0.85, h: o.h ?? 1.45 });
const door = (u, w, o = {}) => ({ k: 'door', u, w, sill: 0, h: 2.15, ...o });
const open = (u, w) => ({ k: 'open', u, w, sill: 0, h: 2.5 });
const glass = (u, w) => ({ k: 'glass', u, w, sill: 0.9, h: 1.25 });
const X = (c, u0, u1, f, n, p, ops = []) => ({ ax: 'x', c, u0, u1, f, n, p, ops });
const Z = (c, u0, u1, f, n, p, ops = []) => ({ ax: 'z', c, u0, u1, f, n, p, ops });

export const WALLS = [
  X(6, -9, -2, 1, 'living', 'out', [win(-7, 1.7), win(-4.2, 1.7)]),
  X(6, -2, 2, 1, 'foyer', 'out', [win(-0.95, 0.4, { sill: 0.12, h: 2.0 }), door(0, 1.05, { label: 'Front Door', swing: 'n', ext: true }), win(0.95, 0.4, { sill: 0.12, h: 2.0 })]),
  X(6, 2, 9, 1, 'dining', 'out', [win(4, 1.7), win(7, 1.7)]),
  X(-6, -9, -6.6, 1, 'out', 'booth'),
  X(-6, -6.6, -2, 1, 'out', 'studio', [win(-4.3, 1.4)]),
  X(-6, -2, -0.4, 1, 'out', 'halfbath', [win(-1.2, 0.6, { sill: 1.5, h: 0.7 })]),
  X(-6, -0.4, 2, 1, 'out', 'hall1', [door(0.95, 0.95, { label: 'Back Door', swing: 'p', ext: true })]),
  X(-6, 2, 9, 1, 'out', 'kitchen', [win(5.6, 2.0, { sill: 1.1, h: 1.15 })]),
  Z(-9, -6, -1, 1, 'out', 'booth'),
  Z(-9, -1, 6, 1, 'out', 'living', [win(2.5, 1.7)]),
  Z(9, -6, 1, 1, 'kitchen', 'out', [win(-2.5, 1.4)]),
  Z(9, 1, 6, 1, 'dining', 'out', [win(3.5, 1.7)]),
  Z(-2, -1, 6, 1, 'living', 'foyer', [open(3, 3.0)]),
  Z(-2, -3.8, -1, 1, 'studio', 'hall1', [door(-2.45, 0.9, { label: 'Studio Door', swing: 'n' })]),
  Z(-2, -6, -3.8, 1, 'studio', 'halfbath'),
  X(-1, -9, -6.6, 1, 'booth', 'living'),
  X(-1, -6.6, -2, 1, 'studio', 'living'),
  Z(-6.6, -6, -1, 1, 'booth', 'studio', [glass(-4.1, 2.0), door(-1.75, 0.85, { label: 'Booth Door', swing: 'n' })]),
  X(-3.8, -2, -0.4, 1, 'halfbath', 'hall1', [door(-1.2, 0.8, { label: 'Powder Room Door', swing: 'n' })]),
  Z(-0.4, -6, -3.8, 1, 'halfbath', 'hall1'),
  X(-1, -2, 2, 1, 'hall1', 'foyer', [open(-0.5, 2.2)]),
  Z(2, -6, -1, 1, 'hall1', 'kitchen', [open(-2.9, 1.4)]),
  Z(2, -1, 1, 1, 'foyer', 'kitchen'),
  Z(2, 1, 6, 1, 'foyer', 'dining'),
  X(1, 2, 9, 1, 'kitchen', 'dining', [open(5.7, 3.0)]),
  X(6, -9, -2, 2, 'krush', 'out', [win(-7, 1.4), win(-4, 1.4)]),
  X(6, -2, 2, 2, 'hall2', 'out', [win(0, 1.1)]),
  X(6, 2, 9, 2, 'parents', 'out', [win(4, 1.4), win(7, 1.4)]),
  X(-6, -9, -2, 2, 'out', 'den', [win(-5.5, 1.4)]),
  X(-6, -2, 2, 2, 'out', 'hall2', [win(0, 0.9)]),
  X(-6, 2, 5, 2, 'out', 'bath', [win(3.5, 0.8, { sill: 1.4, h: 0.8 })]),
  X(-6, 5, 9, 2, 'out', 'ensuite', [win(7, 1.0, { sill: 1.3, h: 0.9 })]),
  Z(-9, 0, 6, 2, 'out', 'krush', [win(3, 1.4)]),
  Z(-9, -6, 0, 2, 'out', 'den', [win(-3, 1.4)]),
  Z(9, -1, 6, 2, 'parents', 'out', [win(2.5, 1.4)]),
  Z(9, -6, -1, 2, 'ensuite', 'out', [win(-3.5, 0.9, { sill: 1.3, h: 0.9 })]),
  Z(-2, 0, 6, 2, 'krush', 'hall2', [door(2.95, 0.9, { label: "Krush's Door", swing: 'n' })]),
  Z(-2, -6, 0, 2, 'den', 'hall2', [door(-0.95, 0.9, { label: 'Den Door', swing: 'n' })]),
  X(0, -9, -2, 2, 'den', 'krush'),
  Z(2, -1, 6, 2, 'hall2', 'parents', [door(-0.45, 0.85, { label: "Parents' Door", swing: 'p' })]),
  Z(2, -6, -1, 2, 'hall2', 'bath', [door(-3.55, 0.85, { label: 'Bathroom Door', swing: 'p' })]),
  X(-1, 2, 5, 2, 'bath', 'parents'),
  X(-1, 5, 9, 2, 'ensuite', 'parents', [door(6.95, 0.9, { label: 'Primary Bath Door', swing: 'n' })]),
  Z(5, -6, -1, 2, 'bath', 'ensuite'),
];