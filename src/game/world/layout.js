import * as THREE from 'three';

export const R = 210;
export const WATER = 3;
export const MOUNTAIN = { x: 10, z: -20 };
export const LAGOON = { x: -80, z: 70, r: 36 };
export const VILLAGE = { x: 90, z: 88, r: 32 };
export const GROTTO = { x: -62, z: -76, r: 13 };
export const SPAWN = { x: 134, z: -58, yaw: -Math.PI / 2, camYaw: Math.PI / 2 };
export const ISLET = { x: 252, z: -60, r: 14 };

export function sampleCurve(pts, step = 2) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], 0, p[1])), false, 'centripetal');
  const n = Math.max(2, Math.ceil(c.getLength() / step));
  return c.getSpacedPoints(n).map((v) => [v.x, v.z]);
}

export const RIVER = [[22, 12], [34, 42], [52, 68], [57, 96], [64, 140], [72, 205]];
export const STREAM = [[-25, 28], [-42, 45], [-58, 58]];
export const OUTLET = [[-112, 82], [-150, 96], [-210, 110]];
export const RIVER_S = sampleCurve(RIVER, 2);
export const STREAM_S = sampleCurve(STREAM, 2);
export const OUTLET_S = sampleCurve(OUTLET, 2);

const vb = (id, type, x, z, fd) => ({ id, type, x, z, fd, rot: Math.atan2(VILLAGE.x - x, VILLAGE.z - z) });
export const VILLAGE_BUILDINGS = [
  vb('v_tavern', 'tavern', 108, 72, 9),
  vb('v_store', 'general_store', 72, 76, 7),
  vb('v_forge', 'blacksmith', 76, 103, 8),
  vb('v_bakery', 'bakery', 106, 106, 7),
  vb('v_market', 'market', 91, 65, 7),
  vb('v_h1', 'cottage', 121, 89, 6),
  vb('v_h2', 'cottage', 90, 121, 6),
  vb('v_h3', 'cabin', 76, 56, 5),
  vb('v_garden', 'garden', 122, 112, 10),
];
export const doorPoint = (b, extra = 1.6) => ({
  x: b.x + Math.sin(b.rot) * (b.fd / 2 + extra),
  z: b.z + Math.cos(b.rot) * (b.fd / 2 + extra),
});
export const DOCK = { x: 64, z: 84, rot: -Math.PI / 2 };

const villagePaths = VILLAGE_BUILDINGS.map((b) => {
  const d = doorPoint(b, 1);
  const mx = (VILLAGE.x + d.x) / 2 + Math.sin(b.x) * 1.2;
  const mz = (VILLAGE.z + d.z) / 2 + Math.cos(b.z) * 1.2;
  return { type: 'stone', w: 1.6, pts: [[VILLAGE.x, VILLAGE.z], [mx, mz], [d.x, d.z]] };
});

export const PATHS = [
  { type: 'dirt', w: 2.2, pts: [[134, -58], [129, -26], [119, 14], [104, 50], [93, 77]] },
  { type: 'stone', w: 2.0, pts: [[82, 90], [73, 93]] },
  { type: 'dirt', w: 2.0, pts: [[41, 97], [10, 108], [-30, 118], [-70, 128], [-104, 119], [-120, 106]] },
  { type: 'stone', w: 2.2, pts: [[-131, 72], [-135, 40], [-131, 5], [-122, -36]] },
  { type: 'crystal', w: 1.8, pts: [[-122, -36], [-100, -58], [-74, -70]] },
  { type: 'dirt', w: 1.8, pts: [[-50, -88], [-35, -102], [-20, -116], [20, -122], [55, -112], [95, -92], [120, -72], [134, -58]] },
  { type: 'dirt', w: 1.8, pts: [[96, 99], [101, 128], [93, 150], [86, 164]] },
  { type: 'dirt', w: 1.5, pts: [[20, -122], [26, -96], [10, -78], [28, -62], [12, -46], [18, -32], [10, -21]] },
  { type: 'crystal', w: 1.6, pts: [[134, -58], [160, -61], [182, -60]] },
  { type: 'stone', w: 1.6, pts: [[VILLAGE.x, VILLAGE.z], [74, 86], [65, 84]] },
  ...villagePaths,
];

const P = (id, name, x, z, r, size, biome, price, unlock = 'purchase', style = 'stones') => ({ id, name, x, z, r, size, biome, price, unlock, style });
export const PLOTS = [
  P('p1', 'Veilfall Clearing', 110, 150, 12, 'Medium', 'Cliffside meadow above the falls', 0, 'free', 'clearing'),
  P('p2', 'Riverside Terrace', 30, 70, 9, 'Small', 'River terrace', 300),
  P('p3', 'Moonpetal Meadow', 140, 28, 16, 'Large', 'Open meadow', 900, 'purchase', 'clearing'),
  P('p4', 'Overlook Ledge', 165, -30, 9, 'Small', 'Cliff overlook', 350, 'purchase', 'platform'),
  P('p5', 'Whispering Grove', 80, -80, 12, 'Medium', 'Forest clearing', 550),
  P('p6', 'Ruin Foundation', -100, -20, 12, 'Landmark', 'Ancient ruins', 1200, 'purchase', 'foundation'),
  P('p7', 'Lagoon Shore', -35, 84, 11, 'Medium', 'Waterfront', 650),
  P('p8', 'Western Bluff', -165, 20, 18, 'Estate', 'Windswept bluff', 1600, 'purchase', 'clearing'),
  P('p9', 'Grotto Steps', -40, -48, 8, 'Small', 'Mountain terrace', 300, 'purchase', 'platform'),
  P('p10', 'Starwell Plateau', -15, -150, 16, 'Large', 'High plateau', 0, 'quest', 'foundation'),
  P('p11', 'Orchard Fields', 145, 95, 15, 'Agricultural', 'Fertile lowland', 800, 'purchase', 'clearing'),
  P('p12', 'Summit Shelf', 35, -45, 7, 'Decorative', 'Mountain shelf', 450, 'purchase', 'platform'),
  P('p13', 'Hidden Hollow', -150, -100, 9, 'Secret', 'Enclosed hollow', 0, 'discover:hollow', 'foundation'),
  P('p14', 'Market Row', 126, 64, 10, 'Commercial', 'Village edge', 700),
];

export const DISCOVERIES = [
  { id: 'overlook', name: 'Starfall Overlook', x: 134, z: -58, r: 14 },
  { id: 'village', name: 'Duskmere Village', x: 90, z: 88, r: 26 },
  { id: 'veilfall', name: 'Veilfall Lookout', x: 86, z: 166, r: 12 },
  { id: 'lagoon', name: 'Moonwater Lagoon', x: -80, z: 70, r: 52 },
  { id: 'ruins', name: 'Obsidian Ruins', x: -120, z: -40, r: 18 },
  { id: 'grotto', name: 'Amethyst Grotto', x: -62, z: -76, r: 11 },
  { id: 'summit', name: "Scorpion's Crown", x: 10, z: -20, r: 12 },
  { id: 'grove', name: 'Whispering Grove', x: 40, z: -110, r: 16 },
  { id: 'hollow', name: 'Hidden Hollow', x: -150, z: -100, r: 10, secret: true },
  { id: 'wreck', name: 'Wreck of the Stellar Tide', x: -186, z: -26, r: 14 },
  { id: 'spire', name: 'Starfall Spire', x: 252, z: -60, r: 12 },
];

export const BRIDGES = [
  { id: 'stone', type: 'stone', a: [73, 93], b: [41, 97], w: 3.6, arch: 1.4 },
  { id: 'rope', type: 'rope', a: [-120, 106], b: [-131, 72], w: 2.4, arch: -0.6 },
  { id: 'crystal', type: 'crystal', a: [182, -60], b: [239, -60], w: 2.6, arch: 1.2 },
];

const facing = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
export const BENCHES = [
  ...[0, 1, 2, 3].map((i) => {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const x = VILLAGE.x + Math.cos(a) * 7.5, z = VILLAGE.z + Math.sin(a) * 7.5;
    return { id: 'bench' + i, x, z, rot: facing(x, z, VILLAGE.x, VILLAGE.z), kind: 'bench' };
  }),
  { id: 'lookout', x: 88, z: 163, rot: facing(88, 163, 72, 195), kind: 'bench' },
  { id: 'lagoonbench', x: -62, z: 124, rot: facing(-62, 124, -80, 70), kind: 'bench' },
  { id: 'overlookrock', x: 138, z: -54, rot: -Math.PI / 2, kind: 'rock' },
  { id: 'camplog1', x: 42, z: -105, rot: facing(42, -105, 40, -108), kind: 'log' },
  { id: 'camplog2', x: 37, z: -110, rot: facing(37, -110, 40, -108), kind: 'log' },
];

export const EXCLUDE = [
  ...PLOTS.map((p) => ({ x: p.x, z: p.z, r: p.r + 3 })),
  { x: VILLAGE.x, z: VILLAGE.z, r: 40 },
  { x: -120, z: -40, r: 18 },
  { x: GROTTO.x, z: GROTTO.z, r: 18 },
  { x: 40, z: -108, r: 8 },
  { x: SPAWN.x, z: SPAWN.z, r: 10 },
  { x: 86, z: 166, r: 8 },
  { x: -150, z: -100, r: 15 },
  { x: -186, z: -26, r: 13 },
  { x: 10, z: -20, r: 10 },
  { x: -131, z: 5, r: 9 },
  { x: 57, z: 95, r: 18 },
  { x: -125, z: 89, r: 18 },
  { x: 170, z: -60, r: 14 },
];