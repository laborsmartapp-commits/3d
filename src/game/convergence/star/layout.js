// Star Square — The Convergence's late-dusk entertainment district (its own neighbourhood).
// Metres, XZ plane, Y up; the fountain sits at the origin. Two avenues at ±28° from +z cross a
// conventional grid, so blocks become real wedges, flatiron corners and oblique sightlines.
const R = Math.PI / 180;
export const THETA = 28, ENV = { x: 300, z: 240 }, CURB = 0.15;
export const dirOf = (deg) => [Math.sin(deg * R), Math.cos(deg * R)];
export const PLAZA = { rx: 65, rz: 90 };
export const FOUNTAIN = { rx: 24, rz: 15, ring: 8, water: 0.55 };
export const inEllipse = (x, z, rx, rz) => (x / rx) ** 2 + (z / rz) ** 2 <= 1;
export const inPlaza = (x, z, pad = 0) => inEllipse(x, z, PLAZA.rx + pad, PLAZA.rz + pad);
export const hoodAt = (x) => (x < -110 ? 'south' : x > 110 ? 'palm' : 'core');
export function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function street(id, name, a, b, w, sw, kind, hood) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz);
  return { id, name, a, b, w, sw, kind, hood, L, t: [dx / L, dz / L], n: [dz / L, -dx / L], cafe: kind === 'palm' || kind === 'drive' };
}
const D1 = dirOf(THETA), D2 = dirOf(-THETA), TM = 272;
export const STREETS = [
  street('bw', 'Starlight Way', [-TM * D1[0], -TM * D1[1]], [TM * D1[0], TM * D1[1]], 18, 6, 'diag', 'core'),
  street('ov', 'Orbit Avenue', [-TM * D2[0], -TM * D2[1]], [TM * D2[0], TM * D2[1]], 18, 6, 'diag', 'core'),
  street('x1', 'Comet Street', [-300, -130], [235, -130], 14, 5, 'cross'),
  street('x2', 'Meridian Street', [-300, -70], [235, -70], 14, 5, 'cross'),
  street('x3', 'Lyra Street', [-300, 70], [235, 70], 14, 5, 'cross'),
  street('x4', 'Nova Street', [-300, 130], [235, 130], 14, 5, 'cross'),
  street('vr', 'Vinyl Row', [-160, -240], [-160, 240], 12, 5, 'side', 'south'),
  street('cs', 'Coral Street', [160, -240], [160, 240], 12, 5, 'side', 'palm'),
  street('ss', 'Southstar Street', [-300, 0], [-58, 0], 10, 4.5, 'narrow', 'south'),
  street('pa', 'Palm Avenue', [58, 0], [235, 0], 12, 5, 'palm', 'palm'),
  street('np', 'Neon Palm Drive', [235, -240], [235, 240], 14, 6, 'drive', 'palm'),
  street('ma', 'Mosaic Alley', [-120, -70], [-120, 0], 4, 1, 'alley', 'south'),
  street('vp', 'Velvet Passage', [120, 0], [120, 70], 4, 1, 'alley', 'palm'),
];
export const MAIN = STREETS.filter((s) => s.kind !== 'alley');
// Distance from a street's centreline to where buildings may start (café streets keep terrace room).
export const buf = (s) => s.w / 2 + s.sw + (s.cafe ? 4 : 0.4);
export function segDist(s, x, z) {
  const px = x - s.a[0], pz = z - s.a[1], u = Math.max(0, Math.min(s.L, px * s.t[0] + pz * s.t[1]));
  return Math.hypot(px - s.t[0] * u, pz - s.t[1] * u);
}
// Carriageway: roads stop at the pedestrian ellipse — nothing drives through the square.
export const onRoad = (x, z, skip) => !inPlaza(x, z) && MAIN.some((s) => s !== skip && segDist(s, x, z) < s.w / 2);

export const COURTS = [
  { id: 'sc1', name: 'Southstar Courts', x: -205, z: -38, hw: 20, hd: 13, fights: true },
  { id: 'sc2', name: 'Red Comet Yard', x: -205, z: 100, hw: 20, hd: 13, fights: true },
  { id: 'sc3', name: 'Vinyl Junction', x: -255, z: -100, hw: 20, hd: 13, fights: true },
  { id: 'nc1', name: 'Palm Courts', x: 195, z: -38, hw: 20, hd: 13, fights: true },
  { id: 'nc2', name: 'Tempo Court', x: 195, z: 100, hw: 20, hd: 13, fights: true },
  { id: 'nc3', name: 'Coral Court', x: 195, z: -185, hw: 20, hd: 13, fights: true },
  { id: 'gal', name: 'Mosaic Alley Gallery', x: -122, z: -40, hw: 13, hd: 11, kind: 'gallery' },
  { id: 'stage', name: 'Velvet Courtyard Stage', x: 120, z: 40, hw: 10, hd: 12, kind: 'stage' },
];
export const ART = [
  { id: 'ribbon', name: 'Orbital Ribbon', x: 30, z: -66, r: 4 },
  { id: 'prism', name: 'Liquid Prism', x: -30, z: -66, r: 4 },
  { id: 'bloom', name: 'Magnetic Bloom', x: 30, z: 66, r: 4 },
  { id: 'column', name: 'The Starfall Column', x: -30, z: 66, r: 3 },
  { id: 'roots', name: 'Neon Roots', x: -122, z: -50.4, r: 0 },
  { id: 'mosaic', name: 'Pulse Mosaic', x: -122, z: -40, r: 0 },
  { id: 'cloud', name: 'Chromatic Cloud', x: -160, z: 0, r: 0 },
];
const sp = (id, zone, x, z, yaw = 0) => ({ id, zone, x, z, r: 6, yaw });
// 20 protected battle footprints: 8 on the square's promenade, 6 Southstar courts, 6 Neon Palm courts.
export const SPACES = [
  sp('ss-c-1', 'Star Square', -46, -30), sp('ss-c-2', 'Star Square', 46, -30), sp('ss-c-3', 'Star Square', -46, 30), sp('ss-c-4', 'Star Square', 46, 30),
  sp('ss-c-5', 'Star Square', -52, 0), sp('ss-c-6', 'Star Square', 52, 0), sp('ss-c-7', 'Star Square', 0, -62), sp('ss-c-8', 'Star Square', 0, 62, Math.PI),
  ...COURTS.filter((c) => c.fights).flatMap((c) => [sp(`ss-${c.id}-1`, c.name, c.x - 10, c.z), sp(`ss-${c.id}-2`, c.name, c.x + 10, c.z)]),
];
export const SPAWN = { x: 0, z: -40, yaw: 0 };

export function zoneAt(x, z) {
  if (inPlaza(x, z)) return 'Star Square';
  for (const c of COURTS) if (Math.abs(x - c.x) < c.hw && Math.abs(z - c.z) < c.hd) return c.name;
  let best = null, bd = 1e9;
  for (const s of STREETS) { const d = segDist(s, x, z); if (d < bd) { bd = d; best = s; } }
  return bd < 16 ? best.name : { south: 'Southstar', core: 'Star Square Core', palm: 'Neon Palm Drive' }[hoodAt(x)];
}

// ---- Parcels: a 2 m reservation grid of streets, plaza, courts, art and fights; lots fill the rest.
const CW = 2, GX = ENV.x, GZ = ENV.z;
const RES = new Uint8Array(GX * GZ), OCC = new Uint8Array(GX * GZ);
const cell = (x, z) => { const i = Math.floor((x + ENV.x) / CW), j = Math.floor((z + ENV.z) / CW); return i < 0 || j < 0 || i >= GX || j >= GZ ? -1 : j * GX + i; };
function reservedAt(x, z) {
  if (Math.abs(x) > 292 || Math.abs(z) > 232 || x > 221 || inPlaza(x, z, 5)) return true;
  for (const s of STREETS) if (segDist(s, x, z) < buf(s)) return true;
  for (const c of COURTS) if (Math.abs(x - c.x) < c.hw + 1.5 && Math.abs(z - c.z) < c.hd + 1.5) return true;
  for (const a of ART) if (a.r && Math.hypot(x - a.x, z - a.z) < a.r + 3) return true;
  return SPACES.some((s) => Math.hypot(x - s.x, z - s.z) < s.r + 5);
}
for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) RES[j * GX + i] = reservedAt(-ENV.x + i * CW + 1, -ENV.z + j * CW + 1) ? 1 : 0;
const free = (x, z) => { const k = cell(x, z); return k >= 0 && !RES[k] && !OCC[k]; };
export const pip = (poly, x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

function rectFree(F, t, n, w, d, mark) {
  for (let a = -w / 2 + 0.75; a <= w / 2 - 0.75; a += 1.5) for (let b = 0.75; b <= d - 0.75; b += 1.5) {
    const x = F[0] + t[0] * a + n[0] * b, z = F[1] + t[1] * a + n[1] * b;
    if (mark) { const k = cell(x, z); if (k >= 0) OCC[k] = 1; } else if (!free(x, z)) return false;
  }
  return true;
}
function occupyPoly(poly) {
  const xs = poly.map((p) => p[0]), zs = poly.map((p) => p[1]);
  for (let x = Math.min(...xs); x <= Math.max(...xs); x += CW) for (let z = Math.min(...zs); z <= Math.max(...zs); z += CW) if (pip(poly, x, z)) { const k = cell(x, z); if (k >= 0) OCC[k] = 1; }
}

// Wedges where the diagonals meet Nova and Comet Streets: sharp flatiron corners (chamfered tips)
// facing outward, and two tapering blocks between the avenues facing the square itself.
const cross = (s, z0) => [s.t[0] * (z0 / s.t[1]), z0];
const P = (C, u, v, a, b) => [C[0] + u[0] * a + v[0] * b, C[1] + u[1] * a + v[1] * b];
function corner(ds, es, su, sv) {
  const u = [ds.t[0] * su, ds.t[1] * su], v = [es.t[0] * sv, es.t[1] * sv], sin = Math.abs(u[0] * v[1] - u[1] * v[0]);
  const I = cross(ds, es.a[1]);
  return { C: P(I, u, v, (buf(es) + 0.6) / sin, (buf(ds) + 0.6) / sin), u, v };
}
const S = Object.fromEntries(STREETS.map((s) => [s.id, s]));
export const WEDGES = [];
for (const [d, e, su, sv] of [['bw', 'x4', 1, 1], ['bw', 'x1', -1, -1], ['ov', 'x4', 1, -1], ['ov', 'x1', -1, 1]]) {
  const { C, u, v } = corner(S[d], S[e], su, sv);
  for (const L of [26, 18]) {
    const poly = [P(C, u, v, 3.2, 0), P(C, u, v, L, 0), P(C, u, v, L * 0.72, L * 0.72), P(C, u, v, 0, L), P(C, u, v, 0, 3.2)];
    const cx = poly.reduce((a, p) => a + p[0], 0) / 5, cz = poly.reduce((a, p) => a + p[1], 0) / 5;
    if (!poly.every(([x, z]) => free(x + (cx - x) * 0.15, z + (cz - z) * 0.15))) continue;
    occupyPoly(poly); WEDGES.push({ id: `fi-${d}-${e}`, kind: 'flatiron', poly, x: cx, z: cz }); break;
  }
}
{
  const r = corner(S.bw, S.x4, -1, -1).C, l = corner(S.ov, S.x4, -1, 1).C, zb = 97;
  const onSlant = (C, D) => { const k = (zb - C[1]) / D[1]; return [C[0] + D[0] * k, zb]; };
  const north = [onSlant(l, D2), onSlant(r, D1), [r[0] - D1[0] * 3.2, r[1] - D1[1] * 3.2], [r[0] - 3.2, r[1]], [l[0] + 3.2, l[1]], [l[0] - D2[0] * 3.2, l[1] - D2[1] * 3.2]];
  const south = north.map(([x, z]) => [x, -z]);
  for (const [id, poly] of [['broadcast', north], ['apex', south]]) { occupyPoly(poly); WEDGES.push({ id, kind: 'block', poly, x: 0, z: Math.sign(poly[0][1]) * 107 }); }
}

const HOOD = {
  south: { w: [5, 10], big: [12, 19], bigP: 0.24, d: 16, gap: 0.1 },
  core: { w: [14, 26], big: [28, 38], bigP: 0.18, d: 26, gap: 0.08 },
  palm: { w: [10, 18], big: [19, 26], bigP: 0.22, d: 17, gap: 0.14 },
};
export const LOTS = [];
const R0 = rng(20260929);
const pick = ([a, b]) => a + R0() * (b - a);
function tryLot(F, t, n, w, dmax) {
  for (let d = dmax; d >= 6; d -= 2.5) if (rectFree(F, t, n, w, d)) return d;
  return 0;
}
function addLot(F, t, n, w, d, hood, s) {
  rectFree(F, t, n, w, d, true);
  LOTS.push({ id: LOTS.length, x: F[0] + n[0] * d / 2, z: F[1] + n[1] * d / 2, yaw: Math.atan2(-n[0], -n[1]), w, d, hood, t, n, fx: F[0], fz: F[1], street: s?.id || 'plaza', streetName: s?.name || 'Star Square', cafe: !!s?.cafe });
}
// The square's own frontage first: lots tangent to the ellipse, facing the fountain.
{
  let a = 0.001;
  const ex = PLAZA.rx + 6.5, ez = PLAZA.rz + 6.5;
  while (a < Math.PI * 2) {
    const F = [Math.cos(a) * ex, Math.sin(a) * ez], nl = Math.hypot(Math.cos(a) / ex, Math.sin(a) / ez);
    const n = [Math.cos(a) / ex / nl, Math.sin(a) / ez / nl], t = [-n[1], n[0]], w = 16 + R0() * 12, arc = Math.hypot(ex * Math.sin(a), ez * Math.cos(a));
    const c = [F[0] + t[0] * w / 2, F[1] + t[1] * w / 2], d = tryLot(c, t, n, w, 24);
    if (d) addLot(c, t, n, w, d, 'core', null);
    a += (d ? w : 3) / arc;
  }
}
for (const s of STREETS.filter((x) => x.kind !== 'alley')) for (const side of [1, -1]) {
  const n = [s.n[0] * side, s.n[1] * side], off = buf(s) + 1.2;
  let u = 3;
  while (u < s.L - 3) {
    const mx = s.a[0] + s.t[0] * u, H = HOOD[s.hood || hoodAt(mx)];
    let done = 0;
    for (const w of [R0() < H.bigP ? pick(H.big) : pick(H.w), H.w[0] + 1]) {
      const cu = u + w / 2, F = [s.a[0] + s.t[0] * cu + n[0] * off, s.a[1] + s.t[1] * cu + n[1] * off], d = tryLot(F, s.t, n, w, H.d);
      if (d) { addLot(F, s.t, n, w, d, s.hood || hoodAt(F[0]), s); done = w; break; }
    }
    u += done ? done + (R0() < H.gap ? 3 + R0() * 3 : 0) : 2.5;
  }
}

// Named venues claim the nearest suitable lot in their neighbourhood.
export const VENUES = [
  ['ASTRA MAISON', 'core', 'flagship', 74, -30, 20], ['NOIR ORBIT', 'core', 'noir', 74, 32, 12], ['CELESTE ATELIER', 'core', 'white', -74, -30, 13, 'showroom'],
  ['PRISM VAULT', 'core', 'noir', -74, 34, 10], ['THE NOVA GRAND', 'core', 'theater', 58, -66, 16], ['ORBIT PICTURE PALACE', 'core', 'cinema', -58, -66, 14],
  ['STARLINE LIVE', 'core', 'entertainment', -58, 66, 16], ['THE CONSTELLATION ROOM', 'core', 'sandstone', 58, 66, 10],
  ['STATIC RECORDS', 'south', 'row', -135, -12, 11, 'records'], ['RED COMET', 'south', 'theater', -95, 12, 12], ['PUNCHLINE PLANET', 'south', 'theater', -150, 40, 10],
  ['SIDEQUEST ARCADE', 'south', 'garage', -195, 12, 12, 'arcade'], ['ZODIAC INK', 'south', 'row', -110, 12, 5], ['SECOND ORBIT', 'south', 'sandstone', -215, -12, 7],
  ['PANEL & PORTAL', 'south', 'row', -240, 12, 6], ['SOLAR SLICE', 'south', 'diner', -178, -12, 5], ['CORNER FREQUENCY', 'south', 'row', -145, 12, 5],
  ['THE LATE PLATE', 'south', 'diner', -265, -12, 11, 'diner'],
  ['HOTEL AFTERGLOW', 'palm', 'decoHotel', 212, -150, 14], ['THE BLUE COMET', 'palm', 'streamline', 212, -110, 13], ['PALM STATIC INN', 'palm', 'budget', 212, 40, 12],
  ['THE PEARL CURRENT', 'palm', 'decoHotel', 212, 160, 14, 'lobby'], ['TROPIC TEMPO', 'palm', 'streamline', 212, 200, 12], ['VELVET TIDE', 'palm', 'decoHotel', 150, 14, 12],
  ['SUNSET SODA', 'palm', 'streamline', 100, -14, 10], ['SALT & SOL', 'palm', 'budget', 212, -205, 12], ['CAFÉ BRISA', 'palm', 'decoHotel', 212, 75, 12],
].map(([name, hood, arch, x, z, minW, enter]) => ({ name, hood, arch, x, z, minW, enter }));
for (const v of VENUES) {
  let best = null, bd = 1e9;
  for (const l of LOTS) {
    if (l.venue || l.hood !== v.hood || l.w < v.minW || (v.enter && l.d < 12)) continue;
    const d = Math.hypot(l.x - v.x, l.z - v.z); if (d < bd) { bd = d; best = l; }
  }
  if (best) { best.venue = v; v.lot = best; }
}
WEDGES.find((w) => w.id === 'broadcast').venue = { name: 'STAR SQUARE BROADCAST HOUSE' };
WEDGES.find((w) => w.id === 'apex').venue = { name: 'APEX ROOFTOP' };

// Sidewalk runs (for paving and pedestrian lanes): each street side, broken where another road crosses.
export const SIDEWALKS = [];
for (const s of STREETS) for (const side of [1, -1]) {
  let u0 = null;
  const out = buf(s) + 1.2;
  for (let u = 0; u <= s.L; u += 1) {
    const m = s.w / 2 + (out - s.w / 2) / 2, x = s.a[0] + s.t[0] * u + s.n[0] * side * m, z = s.a[1] + s.t[1] * u + s.n[1] * side * m;
    const ok = !onRoad(x, z, s) && !inPlaza(x, z, 4) && Math.abs(x) < 300 && Math.abs(z) < 240 && !(s.id === 'np' && side < 0 && false);
    if (ok && u0 === null) u0 = u;
    if ((!ok || u === Math.floor(s.L)) && u0 !== null) { if (u - u0 > 3) SIDEWALKS.push({ s, side, u0, u1: u, inner: s.w / 2, outer: out }); u0 = null; }
  }
}

// Walkable height: roads and service gaps at 0, raised paving at the curb height.
const HG = new Uint8Array(600 * 480);
const hset = (x, z, v) => { const i = Math.floor(x + 300), j = Math.floor(z + 240); if (i >= 0 && j >= 0 && i < 600 && j < 480) HG[j * 600 + i] = v; };
function rasterRect(cx, cz, t, n, hw, hd, v) {
  const r = Math.hypot(hw, hd);
  for (let x = Math.floor(cx - r); x <= cx + r; x++) for (let z = Math.floor(cz - r); z <= cz + r; z++) {
    const dx = x + 0.5 - cx, dz = z + 0.5 - cz;
    if (Math.abs(dx * t[0] + dz * t[1]) <= hw && Math.abs(dx * n[0] + dz * n[1]) <= hd) hset(x, z, v);
  }
}
for (const w of SIDEWALKS) {
  const { s, side } = w, m = (w.inner + w.outer) / 2, cu = (w.u0 + w.u1) / 2;
  rasterRect(s.a[0] + s.t[0] * cu + s.n[0] * side * m, s.a[1] + s.t[1] * cu + s.n[1] * side * m, s.t, s.n, (w.u1 - w.u0) / 2, (w.outer - w.inner) / 2, 1);
}
for (let x = -80; x <= 80; x++) for (let z = -100; z <= 100; z++) if (inPlaza(x + 0.5, z + 0.5, 9) && !onRoad(x + 0.5, z + 0.5)) hset(x, z, 1);
for (const c of COURTS) rasterRect(c.x, c.z, [1, 0], [0, 1], c.hw + 1.5, c.hd + 1.5, 1);
for (const l of LOTS) rasterRect(l.x, l.z, l.t, l.n, l.w / 2, l.d / 2, 1);
for (let x = 242; x < 300; x++) for (let z = -240; z < 240; z++) hset(x, z, x < 262 ? 1 : 2);
export const groundAt = (x, z) => { const i = Math.floor(x + 300), j = Math.floor(z + 240); const v = i >= 0 && j >= 0 && i < 600 && j < 480 ? HG[j * 600 + i] : 0; return v === 1 ? CURB : v === 2 ? 0.08 : 0; };

// Geometry checks shown in the admin overhead view and logged on load.
export function validate() {
  const ang = Math.acos(D1[0] * D2[0] + D1[1] * D2[1]) / R;
  const fountainClear = MAIN.every((s) => { for (let u = 0; u <= s.L; u += 2) { const x = s.a[0] + s.t[0] * u, z = s.a[1] + s.t[1] * u; if (!inPlaza(x, z) && inEllipse(x, z, FOUNTAIN.rx + FOUNTAIN.ring + s.w / 2, FOUNTAIN.rz + FOUNTAIN.ring + s.w / 2)) return false; } return true; });
  const spacesClear = SPACES.every((s) => !onRoad(s.x, s.z) && !inEllipse(s.x, s.z, FOUNTAIN.rx + FOUNTAIN.ring + s.r, FOUNTAIN.rz + FOUNTAIN.ring + s.r));
  const byHood = LOTS.reduce((a, l) => ((a[l.hood] = (a[l.hood] || 0) + 1), a), {});
  return { crossingAngle: +ang.toFixed(2), check150: [+(150 * D1[0]).toFixed(2), +(150 * D1[1]).toFixed(2)], plazaArea: Math.round(Math.PI * PLAZA.rx * PLAZA.rz), fountainClear, spacesClear, lots: LOTS.length, wedges: WEDGES.length, byHood, venues: VENUES.filter((v) => v.lot).length + 2, spaces: SPACES.length };
}