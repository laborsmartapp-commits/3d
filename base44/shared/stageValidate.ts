import { MATERIALS, ELEMENTS, NATURE, VFX, LIGHTS, CATALOG_SET, PLACEMENT, BUDGETS, LIMITS, STYLES } from './stageCapabilities.ts';

const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hex = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v) ? v : undefined);
const str = (v, n = 80) => (typeof v === 'string' ? v.slice(0, n) : '');
const r2 = (v) => Math.round(v * 100) / 100;
const SECTIONS = ['zones', 'floors', 'walls', 'roofs', 'stairs', 'buildings', 'elements', 'nature', 'furnishings', 'vfx', 'lights', 'cameras', 'marks'];
const PREFIX = { zones: 'z', floors: 'f', walls: 'w', roofs: 'r', stairs: 's', buildings: 'b', elements: 'e', nature: 'n', furnishings: 'p', vfx: 'v', lights: 'l', cameras: 'c', marks: 'm' };

// Turns an AI blueprint (or a patched one) into a buildable spec: only registered components, sane
// scale, inside the bounds, within budget, spawn on free walkable ground. Everything dropped is reported.
export function validateSpec(raw, { style, target = 'balanced', environment } = {}) {
  const warn = [], dropped = [], B = BUDGETS[target] || BUDGETS.balanced;
  const s = raw && typeof raw === 'object' ? raw : {};
  const W = clamp(num(s.bounds?.w, 80), LIMITS.boundsMin, LIMITS.boundsMax), D = clamp(num(s.bounds?.d, 80), LIMITS.boundsMin, LIMITS.boundsMax);
  const hx = W / 2, hz = D / 2;
  const inX = (v) => clamp(num(v), -hx, hx), inZ = (v) => clamp(num(v), -hz, hz);
  const far = (o) => Math.abs(num(o.x)) > hx + 4 || Math.abs(num(o.z)) > hz + 4;
  const mat = (m, fb, where) => { if (MATERIALS[m]) return m; if (m) warn.push(`Unknown material "${m}" on ${where} replaced with ${fb}`); return fb; };
  const used = new Set();
  const id = (sec, v, i) => { let k = str(v, 40) || `${PREFIX[sec]}${i + 1}`; while (used.has(k)) k += '_'; used.add(k); return k; };
  const list = (sec) => (Array.isArray(s[sec]) ? s[sec] : []);
  const cap = (sec, arr, n) => { if (arr.length > n) { dropped.push(`${arr.length - n} ${sec} over the ${target} performance budget (${arr.slice(n, n + 12).map((o) => o.id).join(', ')})`); return arr.slice(0, n); } return arr; };
  // Optional finish overrides on architecture: rough / metal 0-1 replace the material's own PBR values.
  const fin = (o) => { const f = {}; for (const k of ['rough', 'metal']) if (o[k] != null && Number.isFinite(+o[k])) f[k] = clamp(+o[k], 0, 1); return f; };

  const out = {
    version: 1, name: str(s.name, 80) || 'Untitled Stage', summary: str(s.summary, 400), category: str(s.category, 40),
    style: STYLES[style] ? style : STYLES[s.style] ? s.style : 'stylized_hires', environment: environment || str(s.environment, 20) || 'outdoor',
    bounds: { w: W, d: D }, ground: { material: mat(s.ground?.material, 'grass', 'ground'), color: hex(s.ground?.color) },
    palette: (Array.isArray(s.palette) ? s.palette : []).map(hex).filter(Boolean).slice(0, 6),
    terrain: { hills: (Array.isArray(s.terrain?.hills) ? s.terrain.hills : []).slice(0, 12).map((h) => ({ x: inX(h.x), z: inZ(h.z), r: clamp(num(h.r, 10), 3, 40), h: clamp(num(h.h, 1), 0.2, 6) })) },
  };

  out.zones = list('zones').slice(0, LIMITS.zones).map((z, i) => ({ id: id('zones', z.id, i), name: str(z.name, 40) || `Area ${i + 1}`, x: inX(z.x), z: inZ(z.z), w: clamp(num(z.w, 10), 1, W), d: clamp(num(z.d, 10), 1, D) }));
  out.floors = cap('floors', list('floors').filter((f) => !far(f)).map((f, i) => ({ id: id('floors', f.id, i), x: inX(f.x), z: inZ(f.z), w: clamp(num(f.w, 4), 0.5, W), d: clamp(num(f.d, 4), 0.5, D), y: clamp(num(f.y, 0), ...LIMITS.floorY), material: mat(f.material, 'oak_wood', `floor ${f.id}`), color: hex(f.color), ...fin(f) })), B.floors);
  out.walls = cap('walls', list('walls').map((w, i) => {
    const x1 = inX(w.x1), z1 = inZ(w.z1), x2 = inX(w.x2), z2 = inZ(w.z2), L = Math.hypot(x2 - x1, z2 - z1);
    if (L < 0.3) return null;
    const h = clamp(num(w.h, 3), ...LIMITS.wallH);
    const ops = (Array.isArray(w.openings) ? w.openings : []).slice(0, 12).map((o) => {
      const kind = ['door', 'window', 'opening', 'glass'].includes(o.kind) ? o.kind : 'window';
      const ow = clamp(num(o.w, kind === 'door' ? 1 : 1.4), 0.5, Math.max(0.6, L - 0.2));
      const oh = clamp(num(o.h, kind === 'window' ? 1.4 : kind === 'glass' ? h - 0.4 : Math.min(2.3, h - 0.2)), 0.4, h - 0.1);
      const sill = kind === 'door' || kind === 'opening' ? 0 : clamp(num(o.sill, kind === 'glass' ? 0.1 : 0.9), 0, h - oh - 0.05);
      return { at: clamp(num(o.at, 0.5), (ow / 2 + 0.05) / L, 1 - (ow / 2 + 0.05) / L), w: r2(ow), kind, sill: r2(sill), h: r2(oh) };
    });
    return { id: id('walls', w.id, i), x1, z1, x2, z2, y: clamp(num(w.y, 0), ...LIMITS.floorY), h, t: clamp(num(w.t, 0.2), 0.08, 0.6), material: mat(w.material, 'painted_wall', `wall ${w.id}`), color: hex(w.color), ...fin(w), openings: ops };
  }).filter(Boolean), B.walls);
  out.roofs = list('roofs').slice(0, 40).filter((r) => !far(r)).map((r, i) => ({ id: id('roofs', r.id, i), x: inX(r.x), z: inZ(r.z), w: clamp(num(r.w, 6), 1, W), d: clamp(num(r.d, 6), 1, D), y: clamp(num(r.y, 3), 2, 40), kind: ['flat', 'gable', 'glass', 'canopy'].includes(r.kind) ? r.kind : 'flat', material: mat(r.material, 'plaster', `roof ${r.id}`), color: hex(r.color), ...fin(r) }));
  out.stairs = list('stairs').slice(0, 16).map((st, i) => {
    const from = clamp(num(st.from_y, 0), 0, 20), to = clamp(num(st.to_y, 3), 0.3, 24), rise = Math.abs(to - from);
    let run = clamp(num(st.run, rise * 1.6), 0.5, 30);
    if (run < rise * 1.3) { warn.push(`Stairs ${st.id || i + 1} were too steep; run lengthened to ${r2(rise * 1.5)} m`); run = rise * 1.5; }
    return { id: id('stairs', st.id, i), x: inX(st.x), z: inZ(st.z), w: clamp(num(st.w, 1.2), 0.8, 8), run: r2(run), from_y: from, to_y: to, dir: num(st.dir, 0), material: mat(st.material, 'oak_wood', `stairs ${st.id}`), ...fin(st) };
  });
  // buildings: solid massing; overlapping ones are dropped
  const blds = [];
  for (const [i, b] of list('buildings').entries()) {
    if (far(b)) { dropped.push(`building ${b.id || i + 1} outside the stage bounds`); continue; }
    const o = { id: id('buildings', b.id, i), x: inX(b.x), z: inZ(b.z), w: clamp(num(b.w, 10), 2, 80), d: clamp(num(b.d, 10), 2, 80), h: clamp(num(b.h, 12), ...LIMITS.buildingH), ry: num(b.ry, 0), storeys: clamp(Math.round(num(b.storeys, 3)), 1, 30), facade: mat(b.facade, 'brick', `building ${b.id}`), color: hex(b.color), trim_color: hex(b.trim_color), roof: ['flat', 'parapet', 'gable'].includes(b.roof) ? b.roof : 'parapet', windows: ['grid', 'storefront', 'none'].includes(b.windows) ? b.windows : 'grid', awning: hex(b.awning), sign: str(b.sign, 24) };
    const hit = blds.find((q) => overlap(q, o) > 0.3);
    if (hit) { dropped.push(`building ${o.id} overlapped ${hit.id}`); continue; }
    blds.push(o);
  }
  out.buildings = cap('buildings', blds, B.buildings);
  out.elements = cap('elements', list('elements').filter((e) => { if (!ELEMENTS[e.type]) { dropped.push(`unsupported element "${e.type}" (${e.id})`); return false; } return true; }).map((e, i) => ({ ...clean({ ...e, id: id('elements', e.id, i) }, inX, inZ, mat), ...fin(e) })), B.elements);
  let nCount = 0;
  out.nature = list('nature').filter((n) => { if (!NATURE[n.type]) { dropped.push(`unsupported nature "${n.type}" (${n.id})`); return false; } return !far(n); }).map((n, i) => {
    const count = clamp(Math.round(num(n.count, 1)), 1, 60); nCount += count;
    return { id: id('nature', n.id, i), type: n.type, x: inX(n.x), z: inZ(n.z), scale: clamp(num(n.scale, 1), 0.3, 3), count, radius: clamp(num(n.radius, count > 1 ? 6 : 0), 0, 60), color: hex(n.color) };
  });
  if (nCount > B.nature) { warn.push(`Vegetation thinned from ${nCount} to about ${B.nature} instances for the ${target} target`); const k = B.nature / nCount; out.nature.forEach((n) => (n.count = Math.max(1, Math.floor(n.count * k)))); }
  const solid = out.buildings;
  out.furnishings = cap('furnishings', list('furnishings').filter((p) => {
    if (!CATALOG_SET.has(p.type)) { dropped.push(`unknown furnishing "${p.type}" (${p.id})`); return false; }
    if (far(p)) { dropped.push(`${p.type} outside the bounds (${p.id})`); return false; }
    if (solid.some((b) => inside(b, num(p.x), num(p.z)))) { dropped.push(`${p.type} placed inside a solid building (${p.id})`); return false; }
    return true;
  }).map((p, i) => {
    const o = { id: id('furnishings', p.id, i), type: p.type, x: inX(p.x), z: inZ(p.z), ry: num(p.ry, 0), scale: clamp(num(p.scale, 1), 0.3, 4), color: hex(p.color) };
    if (p.y != null) o.y = clamp(num(p.y), 0, 30);
    else if (PLACEMENT.surface.includes(p.type)) o.y = 0.76;
    else if (PLACEMENT.wall.includes(p.type)) o.y = 1.4;
    return o;
  }), B.furnishings);
  out.vfx = cap('vfx', list('vfx').filter((v) => { if (!VFX[v.type]) { dropped.push(`unsupported effect "${v.type}" (${v.id})${/rain|snow|fog|storm|lightning|cloud|mist/.test(v.type) ? ' (weather lives in the Weather bubble)' : ''}`); return false; } return true; }).map((v, i) => ({ id: id('vfx', v.id, i), type: v.type, x: inX(v.x), y: clamp(num(v.y, 0), 0, 40), z: inZ(v.z), scale: clamp(num(v.scale, 1), 0.2, 20), count: clamp(Math.round(num(v.count, 8)), 1, 40), color: hex(v.color) })), B.vfx);
  out.lights = cap('lights', list('lights').filter((l) => LIGHTS[l.type] || (dropped.push(`unsupported light "${l.type}" (${l.id})`), false)).map((l, i) => ({ id: id('lights', l.id, i), type: l.type, x: inX(l.x), y: clamp(num(l.y, 2.5), 0.1, 40), z: inZ(l.z), color: hex(l.color) || '#ffd9a8', intensity: clamp(num(l.intensity, 8), 0.5, 40), range: clamp(num(l.range, 7), 1, 30) })), B.lights);

  // spawn on free walkable ground
  const sp = s.spawn || {};
  let spawn = { x: inX(sp.x), z: inZ(sp.z), yaw: num(sp.yaw, Math.PI) };
  if (solid.some((b) => inside(b, spawn.x, spawn.z, 1))) {
    warn.push('Spawn was inside a building and was moved to open ground');
    spawn = freeSpot(solid, hx, hz) || spawn;
  }
  out.spawn = spawn;
  out.cameras = list('cameras').slice(0, LIMITS.cameras).map((c, i) => ({ id: id('cameras', c.id, i), name: str(c.name, 32) || `Camera ${i + 1}`, x: inX(c.x), y: clamp(num(c.y, 1.7), 0.3, 60), z: inZ(c.z), look_x: inX(c.look_x ?? spawn.x), look_y: clamp(num(c.look_y, 1.4), 0, 40), look_z: inZ(c.look_z ?? spawn.z), fov: clamp(num(c.fov, 45), 15, 100) }));
  if (!out.cameras.length) {
    out.cameras = [['Wide', 0.4, 6, 50], ['Medium', 0.15, 2.2, 40], ['Low Angle', 0.1, 0.6, 55]].map(([n, k, y, fov], i) => ({ id: `c${i + 1}`, name: n, x: inX(spawn.x + Math.sin(spawn.yaw) * W * k), y, z: inZ(spawn.z + Math.cos(spawn.yaw) * D * k), look_x: spawn.x, look_y: 1.4, look_z: spawn.z, fov }));
    warn.push('No cameras were proposed; 3 default camera positions were added');
  }
  out.marks = list('marks').slice(0, LIMITS.marks).map((m, i) => ({ id: id('marks', m.id, i), name: str(m.name, 32) || `Mark ${i + 1}`, x: inX(m.x), z: inZ(m.z), yaw: num(m.yaw, 0) }));

  // connectivity checks
  if (out.environment !== 'outdoor' && !out.floors.length) warn.push('Interior requested but no floors were generated; the ground will be used');
  const walkGaps = out.walls.reduce((n, w) => n + w.openings.filter((o) => o.kind === 'door' || o.kind === 'opening').length, 0);
  if (out.walls.length > 3 && !walkGaps) warn.push('Walls have no doors or openings: some rooms may be unreachable');
  const levels = new Set(out.floors.map((f) => Math.round(f.y)));
  if (levels.size > 1 && !out.stairs.length) warn.push('Multiple floor levels but no stairs: upper levels are not reachable on foot');

  return { spec: out, report: report(out, warn, dropped, target) };
}

function clean(e, inX, inZ, mat) {
  const o = { id: e.id, type: e.type };
  for (const k of ['x', 'z', 'x1', 'z1', 'x2', 'z2']) if (e[k] != null) o[k] = k.startsWith('x') ? inX(e[k]) : inZ(e[k]);
  for (const k of ['w', 'd', 'h', 'r', 'y', 'ry', 'lanes']) if (e[k] != null) o[k] = num(e[k]);
  if (o.w != null) o.w = clamp(o.w, 0.3, 240); if (o.d != null) o.d = clamp(o.d, 0.3, 240); if (o.h != null) o.h = clamp(o.h, 0.1, 30); if (o.r != null) o.r = clamp(o.r, 0.1, 20);
  if (e.material) o.material = mat(e.material, 'concrete', e.type);
  if (hex(e.color)) o.color = hex(e.color);
  return o;
}
function rect(b) { return { x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 }; }
function overlap(a, b) { const A = rect(a), Bb = rect(b), ix = Math.max(0, Math.min(A.x1, Bb.x1) - Math.max(A.x0, Bb.x0)), iz = Math.max(0, Math.min(A.z1, Bb.z1) - Math.max(A.z0, Bb.z0)); return (ix * iz) / Math.min(a.w * a.d, b.w * b.d); }
function inside(b, x, z, m = 0) { const c = Math.cos(b.ry || 0), s = Math.sin(b.ry || 0), dx = x - b.x, dz = z - b.z; return Math.abs(dx * c - dz * s) < b.w / 2 + m && Math.abs(dx * s + dz * c) < b.d / 2 + m; }
function freeSpot(solid, hx, hz) { for (let r = 2; r < Math.max(hx, hz); r += 2) for (let a = 0; a < 6.28; a += 0.5) { const x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(x) < hx - 1 && Math.abs(z) < hz - 1 && !solid.some((b) => inside(b, x, z, 1.2))) return { x, z, yaw: a + Math.PI }; } return null; }

function report(s, warnings, dropped, target) {
  const n = (k) => s[k].length, inst = s.nature.reduce((a, x) => a + x.count, 0);
  const tris = n('buildings') * 900 + n('walls') * 150 + n('floors') * 24 + n('elements') * 400 + inst * (s.style === 'low_poly' ? 60 : 500) + n('furnishings') * 1500 + n('vfx') * 300;
  const score = n('buildings') * 3 + n('walls') + n('elements') + n('furnishings') + inst / 6 + n('vfx') * 3;
  return {
    counts: { zones: n('zones'), floors: n('floors'), walls: n('walls'), roofs: n('roofs'), stairs: n('stairs'), buildings: n('buildings'), elements: n('elements'), nature_instances: inst, furnishings: n('furnishings'), vfx: n('vfx'), lights: n('lights'), cameras: n('cameras'), marks: n('marks') },
    est_triangles: Math.round(tris), target, complexity: score < 60 ? 'light' : score < 180 ? 'medium' : 'heavy',
    walkable: { floors: n('floors'), stairs: n('stairs'), levels: [...new Set(s.floors.map((f) => f.y))].sort((a, b) => a - b) },
    warnings: warnings.slice(0, 40), dropped: dropped.slice(0, 40), validated_at: new Date().toISOString(),
  };
}

// Refinement patch: only listed ids change; everything else in the stage is kept exactly as it was.
export function applyPatch(spec, patch) {
  const out = JSON.parse(JSON.stringify(spec)), rm = new Set(Array.isArray(patch?.remove) ? patch.remove : []);
  for (const sec of SECTIONS) if (Array.isArray(out[sec])) out[sec] = out[sec].filter((o) => !rm.has(o.id));
  for (const u of Array.isArray(patch?.update) ? patch.update : []) {
    for (const sec of SECTIONS) { const o = (out[sec] || []).find((x) => x.id === u.id); if (o) Object.assign(o, u.set || {}, { id: o.id }); }
  }
  for (const sec of SECTIONS) { const add = patch?.add?.[sec]; if (Array.isArray(add)) out[sec] = [...(out[sec] || []), ...add.map((a) => ({ ...a, id: undefined }))]; }
  if (patch?.terrain_hills) out.terrain = { hills: [...(out.terrain?.hills || []), ...patch.terrain_hills] };
  if (patch?.ground?.material) out.ground = { ...out.ground, ...patch.ground };
  if (patch?.spawn) out.spawn = patch.spawn;
  if (patch?.bounds) out.bounds = patch.bounds;
  return out;
}