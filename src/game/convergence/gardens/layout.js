// Galatical Gardens — a celestial botanical estate in The Convergence (its own neighbourhood).
// Everything curves: the Water Theatre is a scalloped oval, paths are splines, beds are ribbons.
export const HALF = 150;

// The Grand Water Theatre basin — a softened, scalloped oval.
export const THEATRE = { x: 0, z: -22, rx: 62, rz: 25, water: 0.42 };
export const CANAL = { x: 0, z0: 30, z1: 100, w: 3.2 };

export const ZONES = [
  { name: 'Grand Water Theatre', x: 0, z: -22, r: 70 },
  { name: 'Paradise Conservatory', x: 0, z: -88, r: 24 },
  { name: 'Crystal Allée', x: 0, z: 58, r: 20, box: [-16, 16, 8, 108] },
  { name: 'Ornament Grove', x: -80, z: 52, r: 32 },
  { name: 'Ribbon Gardens', x: 82, z: 52, r: 34 },
  { name: 'Orchid Grotto', x: 98, z: -72, r: 20 },
  { name: 'Celestial Courtyards', x: -104, z: -14, r: 40 },
];

// ~20 protected battle clearings, all on broad courts away from water, beds and fountain landings.
export const SPACES = [
  ['gg-cc-1', 'Celestial Courtyards', -118, -42], ['gg-cc-2', 'Celestial Courtyards', -118, -14], ['gg-cc-3', 'Celestial Courtyards', -118, 14],
  ['gg-cc-4', 'Celestial Courtyards', -88, -42], ['gg-cc-5', 'Celestial Courtyards', -88, -14], ['gg-cc-6', 'Celestial Courtyards', -88, 14],
  ['gg-wt-1', 'Grand Water Theatre', -48, 34], ['gg-wt-2', 'Grand Water Theatre', 48, 34], ['gg-wt-3', 'Grand Water Theatre', -48, -66], ['gg-wt-4', 'Grand Water Theatre', 48, -66],
  ['gg-al-1', 'Crystal Allée', -30, 78], ['gg-al-2', 'Crystal Allée', 30, 78],
  ['gg-rb-1', 'Ribbon Gardens', 118, 20], ['gg-rb-2', 'Ribbon Gardens', 112, 96],
  ['gg-og-1', 'Ornament Grove', -58, 96], ['gg-og-2', 'Ornament Grove', -120, 62],
  ['gg-s-1', 'Crystal Allée', -34, 128], ['gg-s-2', 'Crystal Allée', 34, 128],
  ['gg-e-1', 'Orchid Grotto', 102, -30], ['gg-e-2', 'Grand Water Theatre', 80, -38],
].map(([id, zone, x, z]) => ({ id, zone, x, z, r: 6 }));

export const SPAWN = { x: -9, z: 26, yaw: Math.PI };
export const groundAt = () => 0;
export function zoneAt(x, z) {
  for (const Z of ZONES.slice(1)) {
    if (Z.box ? x > Z.box[0] && x < Z.box[1] && z > Z.box[2] && z < Z.box[3] : Math.hypot(x - Z.x, z - Z.z) < Z.r) return Z.name;
  }
  return (x / 70) ** 2 + ((z + 22) / 45) ** 2 < 1 ? ZONES[0].name : 'Galatical Gardens';
}

// Scalloped oval outline of the theatre basin at a given outward offset.
export function theatreEdge(a, off = 0) {
  const T = THEATRE, sc = 1 + 0.035 * Math.cos(a * 18);
  return { x: T.x + Math.cos(a) * (T.rx * sc + off), z: T.z + Math.sin(a) * (T.rz * sc + off) };
}

// Paths: [kind, width, points, closed]. kind picks the crystal paving (cream | rose | blue).
const ellipse = (cx, cz, rx, rz, n = 28, wob = 0) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; const w = 1 + wob * Math.sin(a * 3); return [cx + Math.cos(a) * rx * w, cz + Math.sin(a) * rz * w]; });
export const PATHS = [
  ['cream', 7, ellipse(0, -22, 78, 42), true],
  ['rose', 5, [[-9, 8], [-9, 40], [-9, 70], [-9, 108]]],
  ['rose', 5, [[9, 8], [9, 40], [9, 70], [9, 108]]],
  ['rose', 6, [[-9, 108], [-24, 122], [0, 134], [24, 122], [9, 108]]],
  ['blue', 4.5, ellipse(-80, 52, 24, 22, 20, 0.08), true],
  ['rose', 4, [[62, 38], [74, 30], [86, 46], [78, 62], [94, 72], [104, 60], [112, 78], [104, 90]]],
  ['cream', 4.5, [[62, 48], [78, 70], [96, 84], [100, 90]]],
  ['blue', 4.5, [[-100, -58], [-104, -28], [-102, 0], [-104, 28], [-96, 46]]],
  ['cream', 4, [[-72, -30], [-88, -28], [-104, -28], [-118, -28]]],
  ['cream', 4, [[-72, 0], [-104, 0], [-118, 0]]],
  ['cream', 4, [[-78, 20], [-104, 28], [-118, 30]]],
  ['cream', 4.5, [[-64, 2], [-72, 20], [-78, 32]]],
  ['cream', 4.5, [[64, 2], [70, 18], [62, 38]]],
  ['blue', 4, [[62, -48], [80, -56], [92, -64], [100, -74], [112, -66], [122, -40], [118, -10], [96, 0], [70, 8]]],
  ['cream', 6, [[0, -64], [0, -70], [0, -76]]],
  ['cream', 4.5, [[-66, 74], [-74, 92], [-60, 112], [-30, 124]]],
  ['cream', 4.5, [[-56, 60], [-86, 72], [-104, 68]]],
];
// Decorative celestial inlays where paths meet.
export const INLAYS = [[0, 20], [-9, 108], [9, 108], [0, -64], [-64, 2], [64, 2], [-104, 0], [-78, -28], [62, 38], [-66, 74], [92, -64]];