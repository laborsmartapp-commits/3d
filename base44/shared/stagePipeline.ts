import { capabilityDoc, MATERIALS, BUDGETS, FURNITURE_FINISHES } from './stageCapabilities.ts';
import { ROWS, opSchema, LAYOUT_EXTRA, rowRule, parseRows, parseHills, toRows } from './stageSchemas.ts';
import { rules, settingsText, short } from './stagePrompt.ts';
import { walkways } from './stageCirculation.ts';

// Progressive construction: a stage is built by many small AI operations, each validated and saved on its own.
// Measured (claude-sonnet-5): plain row output streams at ~99 chars/s, but spatial design time dominates:
// layout 36.8 s for 1,361 chars, floors+ceilings 14 s for 579 chars, 27 walls 111.9 s for 1,747 chars.
// One AI call is cut at 120 s, so operations are kept to a few design decisions each (walls are split into exterior and
// interior, furniture/decor batches hold at most MAX_PIECES pieces) and a timed-out operation is split in two automatically.
export const OUTPUT_CHAR_LIMIT = 4000;
export const MAX_PIECES = 12;
const PART = { walls: ['only the EXTERIOR perimeter walls with their windows, glass and entrance doors', 'only the INTERIOR walls between rooms with their doors and openings'] };
export const PHASES = [['architecture', 'Architecture'], ['furniture', 'Major furniture'], ['materials', 'Materials & textures'], ['decor', 'Decorative detailing'], ['final', 'Final validation']];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const op = (key, phase, label, sections, caps, x = {}) => ({ key, phase, label, kind: 'rows', sections, caps, status: 'pending', attempts: 0, ...x });

export const initialOps = () => [
  op('a1', 'architecture', 'Layout & room program', ['zones', 'program'], { zones: 10, program: 10 }, { kind: 'layout' }),
  op('a2', 'architecture', 'Floors, ceilings & stairs', ['floors', 'roofs', 'stairs'], { floors: 24, roofs: 16, stairs: 6 }),
  op('a3a', 'architecture', 'Exterior walls & windows', ['walls'], { walls: 24 }, { part: { i: 1, n: 2 } }),
  op('a3b', 'architecture', 'Interior walls & doors', ['walls'], { walls: 20 }, { part: { i: 2, n: 2 } }),
  op('a4', 'architecture', 'Architectural features', ['elements', 'buildings'], { elements: 16, buildings: 8 }),
];

// After the layout exists: one furniture batch and one decor batch per room (up to 8 rooms), sized from the performance budget.
export function planRest(spec, program, target) {
  const B = BUDGETS[target] || BUDGETS.balanced;
  let rooms = program.filter((p) => !/circulation|corridor|hallway|empty/i.test(p.role || '')).map((p) => ({ ...p, z: spec.zones.find((z) => z.id === p.zone) })).filter((p) => p.z);
  if (!rooms.length) rooms = spec.zones.map((z) => ({ zone: z.id, z }));
  if (!rooms.length) rooms = [{ zone: '*', z: { id: '*', name: spec.name, x: 0, z: 0, w: spec.bounds.w, d: spec.bounds.d } }];
  rooms.sort((a, b) => b.z.w * b.z.d - a.z.w * a.z.d);
  const groups = rooms.slice(0, 8).map((r) => [r]);
  for (const r of rooms.slice(8)) groups[7].push(r);
  const area = (g) => g.reduce((n, r) => n + r.z.w * r.z.d, 0), total = groups.reduce((n, g) => n + area(g), 0) || 1;
  const left = Math.max(10, B.furnishings - spec.furnishings.length), name = (g) => g.map((r) => r.z.name).join(' + ').slice(0, 60);
  const lightsEach = clamp(Math.floor((B.lights - 6) / groups.length), 1, 6);
  return [
    ...groups.map((g, i) => op(`b${i + 1}`, 'furniture', `Major furniture · ${name(g)}`, ['furnishings'], { furnishings: clamp(Math.round((left * 0.45 * area(g)) / total), 4, 28) }, { zones: g.map((r) => r.z.id) })),
    op('c1', 'materials', 'Floors, ceilings & features', ['surfaces'], { surfaces: 70 }, { kind: 'surfaces', targets: ['floors', 'roofs', 'stairs', 'elements', 'buildings'] }),
    op('c2', 'materials', 'Wall surfaces', ['surfaces'], { surfaces: 50 }, { kind: 'surfaces', targets: ['walls'] }),
    op('c3', 'materials', 'Furniture finishes', ['surfaces'], { surfaces: 60 }, { kind: 'surfaces', targets: ['furnishings'] }),
    ...groups.map((g, i) => op(`d${i + 1}`, 'decor', `Decor & lighting · ${name(g)}`, ['furnishings', 'lights', 'nature'], { furnishings: clamp(Math.round((left * 0.55 * area(g)) / total), 4, 30), lights: lightsEach, nature: spec.environment === 'outdoor' ? 8 : 2 }, { zones: g.map((r) => r.z.id) })),
    ...finalOps(Math.min(8, B.vfx)),
    op('e2', 'final', 'Final validation', [], {}, { kind: 'validate' }),
  ];
}

// Production setup as two independent operations (cameras/marks vs effects/fill lights) that run side by side.
export const finalOps = (vfx = 8) => [
  op('e1a', 'final', 'Production cameras & marks', ['cameras', 'marks'], { cameras: 6, marks: 8 }, { replace: ['cameras', 'marks'], split_from: 'e1', independent: true, theme: 'production cameras and floor marks' }),
  op('e1b', 'final', 'Effects & fill lights', ['vfx', 'lights'], { vfx, lights: 6 }, { split_from: 'e1', independent: true, theme: 'VFX (fire in the fireplace etc.) and fill lights where a room is still dark' }),
];

// Each operation sees only the part of the capability registry it needs (smaller prompt = faster call).
const DOC = {
  layout: ['engine', 'coordinate_rules', 'not_supported', 'collision_and_navigation'],
  architecture: ['coordinate_rules', 'builders', 'elements', 'materials', 'finish_overrides', 'limits', 'not_supported', 'collision_and_navigation'],
  furniture: ['coordinate_rules', 'furnishings', 'placement', 'collision_and_navigation'],
  decor: ['coordinate_rules', 'furnishings', 'placement', 'lights', 'nature', 'collision_and_navigation'],
  materials: ['materials', 'finish_overrides', 'furniture_finishes'],
  final: ['coordinate_rules', 'vfx', 'lights', 'collision_and_navigation'],
};
const head = (sec) => ROWS[sec].split(' ').map((p) => p.split(':')[0]).join('|');
const mid = (o) => [o.x ?? (o.x1 + o.x2) / 2, o.z ?? (o.z1 + o.z2) / 2];
const inZones = (zs) => (o) => zs.some((z) => z.id === '*' || [[o.x1, o.z1], [o.x2, o.z2], mid(o)].some(([x, y]) => x != null && Math.abs(x - z.x) <= z.w / 2 + 0.6 && Math.abs(y - z.z) <= z.d / 2 + 0.6));

const TASK = {
  a1: 'OPERATION: design the stage footprint and room program only. Return name, summary (1-2 sentences), category, bounds (fit the rooms plus a 2 m margin), ground (material + color), palette (4-6 hex), hills (outdoor stages only, else empty), spawn (inside the main room on open floor, yaw facing into the room), zones = one rectangle per room/area that tile the plan without overlapping, sized generously for the furniture the brief implies (a grand living room is roughly 10-15 m by 8-11 m), program = one row per zone: zone id | role | the major furniture it needs (short phrase) | the decorative detailing it needs (short phrase). No walls or furniture yet.',
  a2: 'OPERATION: floors under every zone (one slab per room, material fitting the room), ceilings as flat roofs over every interior room (y = the room\'s wall height, 3.6-4.5 for a grand room; kind glass for skylights), stairs only when there are several levels.',
  a3: 'OPERATION: straight wall segments around and between the zones. Exterior walls along the outer edges of the rooms (split at corners), interior walls only where the program wants separation. Door/opening gaps so every room is reachable from the spawn; windows or floor-to-ceiling glass in exterior walls (panoramic glass where the brief asks for it). Wall height = the ceiling height above it. Wall base y = its floor\'s y.',
  a4: 'OPERATION: architectural features with real geometry from ELEMENTS: columns, raised platforms (hearth plinth, dais, stage), plinths, railings, arches, planter beds, pools, pergolas. Exterior buildings only when the stage needs a backdrop outside the windows, and they must stay inside the stage bounds (enlarging bounds is not possible in this operation). Furniture-like pieces (fireplaces, shelving, sofas) are NOT elements: they come in the furniture batches.',
  b: (names, need) => `OPERATION: place the MAJOR furniture for ${names}${need ? ` (${need})` : ''}: seating, tables, cabinetry, fireplace, piano, large statement pieces. Compose designed arrangements: seating grouped around a focal point (fireplace, view, TV), coffee table centred in the group, accent chairs angled in, consoles against walls, real proportions for the room's scale. Keep each piece's centre at least half its depth from walls and clear of door/opening gaps; 1.2 m walking lanes. Rugs, lamps, art and small decor come later. Use short ids (p1, p2...).`,
  c: (furn) => (furn ? 'OPERATION: furniture finishes. For each listed piece set material = one FURNITURE_FINISHES name for its MAIN surface (seating: velvet, boucle, linen or leather; tables, consoles, cabinetry and shelving: walnut, oak, ebony, lacquer, marble or travertine; small accents: brass, chrome or glass; rugs, art, plants and lamps: leave material empty) plus a colour, so upholstery, wood, stone and metal form a coordinated, layered luxury palette for the brief (no two adjacent seats identical unless a matched pair). Leave rough and metal empty.' : 'OPERATION: assign registry materials and finishes to the EXISTING objects listed below (id|material|color|rough|metal, one row per object; the ground row has id "ground"). Choose surfaces that fit each object and room (polished stone vs honed stone, oak vs walnut, satin paint vs plaster), coordinate them with the palette and the brief\'s materials, use rough/metal only to refine a finish. Do not add objects.'),
  d: (names, need) => `OPERATION: decorative detailing for ${names}${need ? ` (${need})` : ''}. Rugs under seating groups; wall art, mirrors and wall sconces on walls (y 1.4-1.9, ry facing out of the wall into the room); floor and table lamps; pendant or chandelier over focal points (y near the ceiling); curtains at windows; plants in corners; books, vases, candles, centrepieces and sculptures ON tables and shelves (y = that surface's height: coffee table 0.45, side table 0.6, console 0.8, dining table 0.76). Add an interior lights[] entry at each lamp, sconce or chandelier that should really illuminate (y at the bulb). Do not repeat pieces that already exist; keep lanes clear. Short ids (p1, l1, n1...).`,
  e1: 'OPERATION: production setup. 3-6 production cameras (a wide master, a medium on the main seating group, a close angle at the focal point, a high or low dramatic angle) with clear sightlines to their look target, 4-8 floor marks where actors perform, VFX only where they belong (fire inside a fireplace at its position, y about 0.3), plus fill lights only where a room is still dark.',
};

export function buildPrompt(spec, job, o) {
  const st = job.settings || {}, phase = o.kind === 'layout' ? 'layout' : o.phase === 'final' ? 'final' : o.phase;
  const doc = capabilityDoc(), reg = Object.fromEntries(DOC[phase].map((k) => [k, doc[k]]));
  const zs = o.zones ? (o.zones.includes('*') ? [{ id: '*' }] : spec.zones.filter((z) => o.zones.includes(z.id))) : null;
  const bk = o.split_from || o.key; // split parts see exactly what their parent operation would see
  const ctx = [`name: ${spec.name}; summary: ${spec.summary || '-'}; environment: ${spec.environment}; bounds ${spec.bounds.w} x ${spec.bounds.d} m; palette ${(spec.palette || []).join(' ') || '-'}; spawn ${spec.spawn?.x},${spec.spawn?.z}`];
  const add = (sec, list) => { if (list?.length) ctx.push(`${sec} (${head(sec)}):\n${toRows(sec, list).join('\n')}`); };
  if (bk !== 'a1') { add('zones', zs && !zs.some((z) => z.id === '*') ? zs : spec.zones); if (job.program?.length) ctx.push(`program (zone|role|major|decor):\n${toRows('program', job.program).join('\n')}`); }
  const near = zs ? inZones(zs) : () => true;
  const walls = o.sections.includes('walls');
  if (walls || bk === 'a4' || o.zones || bk === 'e1') { add('floors', spec.floors); add('roofs', walls || bk === 'a4' ? spec.roofs : []); }
  if (walls || bk === 'a4' || o.zones || bk === 'e1') { add('walls', spec.walls.filter(near)); add('elements', spec.elements.filter(near)); add('buildings', bk === 'a4' ? spec.buildings : []); }
  if (o.zones || bk === 'e1') { add('furnishings', spec.furnishings.filter(near)); add('lights', spec.lights.filter(near)); }
  if (o.zones && o.sections?.includes('furnishings') && spec.walls.length) {
    const ww = walkways(spec, o.zones).text;
    if (ww.length) ctx.push(`reserved walkways (keep ~1 m clear along these routes; place solid furniture beside them, never on them; pieces that block a route are moved or rejected):\n${ww.join('\n')}`);
  }
  if (bk === 'e1') { add('cameras', spec.cameras.filter((c) => String(c.id).startsWith('e1'))); add('vfx', spec.vfx); add('marks', spec.marks.filter((m) => String(m.id).startsWith('e1'))); }
  if (o.kind === 'surfaces') {
    const list = o.targets.flatMap((sec) => spec[sec].map((x) => `${x.id}|${sec}${x.type ? `:${x.type}` : ''}|${x.material || x.facade || x.finish || ''}|${x.color || ''}`));
    if (o.targets.includes('floors')) list.unshift(`ground|ground|${spec.ground.material}|${spec.ground.color || ''}`);
    const mineList = o.part ? list.filter((_, j) => j % o.part.n === o.part.i - 1) : list;
    ctx.push(`objects to finish in this operation (id|kind|current material|current color):\n${mineList.join('\n')}`);
  }
  const prog = (zs || []).map((z) => job.program?.find((p) => p.zone === z.id)).filter(Boolean);
  const names = zs ? (zs.some((z) => z.id === '*') ? 'the whole stage' : zs.map((z) => `${z.name} (${z.id})`).join(', ')) : '';
  const base = o.split_from || o.key, tk = /^a3/.test(base) ? 'a3' : base;
  const task = ['a1', 'a2', 'a3', 'a4', 'e1'].includes(tk) ? TASK[tk]
    : o.phase === 'furniture' ? TASK.b(names, prog.map((p) => p.major).filter(Boolean).join('; ')) : o.phase === 'decor' ? TASK.d(names, prog.map((p) => p.decor).filter(Boolean).join('; ')) : TASK.c(o.targets.includes('furnishings'));
  const caps = Object.entries(o.caps).map(([k, v]) => `${k} <= ${v}`).join(', ');
  const sec = o.sections[0], part = o.kind === 'surfaces' ? '' : o.theme ? ` This part covers ONLY: ${o.theme}. Other parts of this batch place the other kinds of objects at the same time, so stay within this theme.` : o.part ? (PART[sec] ? ` This part: ${PART[sec][o.part.i - 1]}.` : ` This is part ${o.part.i} of ${o.part.n} of this batch: ${o.part.i === 1 ? 'place the most important pieces first (the main group and focal point)' : 'complete it with the remaining pieces, complementing what earlier parts already placed (listed above)'}.`) : '';
  return `${rules(spec.style)}

CAPABILITY REGISTRY (subset for this operation):
${JSON.stringify(reg)}

DIRECTOR'S STRUCTURED BRIEF:
${settingsText(st)}${job.prompt ? `SPECIAL CREATIVE DETAILS: "${job.prompt}"\n` : ''}${job.variation_of ? `This is a VARIATION of an existing stage ("${job.variation_of}"): same brief, clearly different layout and detailing.\n` : ''}
${bk === 'a1' ? '' : `STAGE BUILT SO FAR (keep it; do not repeat it):\n${ctx.join('\n')}\n`}
This stage is constructed in small operations; this is "${o.label}". ${task}${part}
Limits for this operation: ${caps}. Keep the whole answer under ${OUTPUT_CHAR_LIMIT} characters: spend detail on design decisions, not on repetition. "substitutions" = one plain sentence per requested thing the registry cannot build (empty if none).

${rowRule(o.kind === 'surfaces' ? ['surfaces'] : o.sections)}`;
}

// Split an operation into n smaller parts (new keys, so ids never collide). Used before running a batch that is
// too large, and automatically once when an operation times out.
// Decor batches split by theme instead of order, so their parts are independent and can run side by side.
const THEMES = [['rugs, curtains and soft textiles', null], ['wall art, mirrors and wall sconces', null], ['floor lamps, table lamps, pendants and chandeliers, each with an interior lights[] entry at its bulb', 'lights'], ['plants and tabletop decor (books, vases, candles, centrepieces, sculptures on the existing tables and shelves)', 'nature']];
function themedSplit(o, n, why) {
  const k = Math.max(2, n), groups = Array.from({ length: k }, (_, i) => (k >= 4 ? [THEMES[i % 4]] : THEMES.filter((_, j) => j % k === i)));
  const owner = (sec) => Math.max(0, groups.findIndex((g) => g.some((t) => t[1] === sec)));
  return groups.map((g, i) => {
    const caps = { furnishings: Math.max(1, Math.ceil((o.caps.furnishings || 0) / k)) };
    for (const sec of ['lights', 'nature']) if (o.caps[sec] && owner(sec) === i) caps[sec] = o.caps[sec];
    return { ...o, key: `${o.key}${'abcdefgh'[i]}`, label: `${o.label} · ${g.map((t) => t[0].split(',')[0].split(' (')[0]).join(' + ')}${i >= 4 ? ' (2nd set)' : ''}`, status: 'pending', attempts: 0, error: '', split_from: o.split_from || o.key, split_reason: why, independent: true,
      theme: g.map((t) => t[0]).join('; ') + (i >= 4 ? ' (a second set, in other parts of the room)' : ''), sections: Object.keys(caps), caps, part: undefined };
  });
}
export function splitOp(o, n = 2, why = '') {
  if (o.phase === 'decor' && !o.theme && o.caps.furnishings && !(o.zones?.length > 1)) return themedSplit(o, n, why);
  const zs = o.zones?.length > 1 ? o.zones : null, k = zs ? Math.min(n, zs.length) : n;
  return Array.from({ length: k }, (_, i) => ({
    ...o, key: `${o.key}${'abcdefgh'[i]}`, label: `${o.label} (${i + 1}/${k})`, status: 'pending', attempts: 0, error: '', split_from: o.split_from || o.key, split_reason: why,
    zones: zs ? zs.filter((_, j) => j % k === i) : o.zones,
    caps: Object.fromEntries(Object.entries(o.caps).map(([s, v]) => [s, Math.max(1, Math.ceil(v / k))])),
    part: zs ? o.part : { i: i + 1, n: k },
  }));
}
// Pre-emptive sizing from measured timings: placed objects cost ~4.1-5 s each (27 walls 111.9 s, 20 features 100.2 s),
// finish rows ~1.2 s each (12 slabs 14 s), plus ~8 s fixed overhead. Every operation is kept under OP_BUDGET_S,
// well clear of the 120 s cut-off, by splitting it before it runs.
const SEC_PER_ROW = { surfaces: 1.3 }, PLACED_S = 4.8, OVERHEAD_S = 8;
export const OP_BUDGET_S = 55;
// Self-calibrating: once operations of a phase have run, their measured seconds per row replace the default
// (furniture measured ~8.3 s per piece: 6 pieces in 57.6 s), so later batches are sized from real timings.
export function measuredRate(ops, o) {
  const done = ops.filter((x) => x.status === 'done' && x.phase === o.phase && x.kind === o.kind && x.requested > 0 && x.seconds);
  const rows = done.reduce((n, x) => n + x.requested, 0);
  return rows ? done.reduce((n, x) => n + Math.max(0, x.seconds - OVERHEAD_S), 0) / rows : null;
}
export const estimateSeconds = (o, rate = null) => OVERHEAD_S + Object.entries(o.caps || {}).reduce((n, [s, v]) => n + v * Math.max(SEC_PER_ROW[s] ?? PLACED_S, rate ?? 0), 0);
// Parent batches split at the budget; already-split parts split again only if they would approach the cut-off.
export const oversized = (o, rate) => (o.kind === 'rows' || o.kind === 'surfaces') && estimateSeconds(o, rate) > (o.split_from ? 80 : OP_BUDGET_S) && Math.max(...Object.values(o.caps)) > 1;
export const piecesSplit = (o, rate) => {
  const est = Math.round(estimateSeconds(o, rate));
  return splitOp(o, Math.ceil((est - OVERHEAD_S) / (OP_BUDGET_S - OVERHEAD_S)), `estimated ${est} s from measured timings (${rate ? `${rate.toFixed(1)} s per row measured in this phase` : 'default rate'}), over the ${OP_BUDGET_S} s per-operation budget`).map((p, i) => ({ ...p, est_seconds: Math.round(estimateSeconds(p, rate)), replace: i === 0 ? p.replace : undefined }));
};

// Walls must reach the ceiling above them (a room's flat roof sits at its ceiling height).
export function fitWalls(spec) {
  const notes = [];
  for (const w of spec.walls || []) {
    const dx = w.x2 - w.x1, dz = w.z2 - w.z1, L = Math.hypot(dx, dz) || 1, nx = -dz / L, nz = dx / L, mx = (w.x1 + w.x2) / 2, mz = (w.z1 + w.z2) / 2;
    const tops = [1, -1].flatMap((s) => (spec.roofs || []).filter((r) => r.y > (w.y || 0) && Math.abs(mx + nx * s * 0.4 - r.x) <= r.w / 2 && Math.abs(mz + nz * s * 0.4 - r.z) <= r.d / 2).map((r) => r.y));
    const need = tops.length ? Math.max(...tops) - (w.y || 0) : 0;
    if (need > (w.h || 0) + 0.05 && need <= 12) { notes.push(`Wall ${w.id} raised from ${w.h} m to ${Math.round(need * 100) / 100} m to meet the ceiling`); w.h = Math.round(need * 100) / 100; }
  }
  return notes;
}

// Independent operations of one phase (different rooms, or different surface targets) run side by side in a
// single step, each still its own < 120 s AI call. Parts of one split batch build on each other, so they stay
// sequential; architecture and final operations always run alone.
export const MAX_PARALLEL = 6;
export function pickBatch(ops) {
  const out = [], root = (x) => (x.independent ? x.key : x.split_from || x.key), par = (x) => (x.kind === 'rows' || x.kind === 'surfaces') && x.phase !== 'architecture';
  for (let i = 0; i < ops.length && out.length < MAX_PARALLEL; i++) {
    let o = ops[i];
    if (o.status === 'done' || o.status === 'split') continue;
    if (out.length && (o.status !== 'pending' || !par(o) || o.phase !== out[0].phase)) break;
    const rate = measuredRate(ops, o);
    if (o.status === 'pending' && oversized(o, rate)) { const parts = piecesSplit(o, rate); ops.splice(i, 1, ...parts); o = parts[0]; }
    if (out.some((x) => root(x) === root(o))) continue;
    out.push(o);
    if (o.status !== 'pending' || !par(o)) break;
  }
  return out;
}

export const schemaFor = (o) => (o.kind === 'layout' ? opSchema(['zones', 'program'], LAYOUT_EXTRA) : opSchema(o.sections));

// Merge one operation's result into the stage. Ids are prefixed with the operation key, and a retry first removes
// that operation's earlier objects, so re-running an operation can never duplicate or overwrite other work.
export function applyOp(spec, job, o, raw) {
  const next = JSON.parse(JSON.stringify(spec)), notes = [];
  if (o.kind === 'layout') {
    const zones = parseRows('zones', raw.zones).slice(0, o.caps.zones), program = parseRows('program', raw.program).slice(0, o.caps.program);
    Object.assign(next, { name: short(job.settings?.name, 80) || short(raw.name, 80) || spec.name, summary: raw.summary, category: job.settings?.category || raw.category, bounds: raw.bounds, ground: raw.ground, palette: raw.palette, terrain: { hills: parseHills(raw.hills) }, spawn: raw.spawn, zones });
    return { next, requested: zones.length, applied: zones.length, program, notes };
  }
  if (o.kind === 'surfaces') {
    const list = parseRows('surfaces', raw.surfaces), use = list.slice(0, o.caps.surfaces);
    if (!list.length) throw new Error('The AI returned no finish rows for this batch; it will be retried');
    if (list.length > use.length) notes.push(`${list.length - use.length} surface rows over this batch's limit were not applied`);
    let applied = 0;
    for (const r of use) {
      const hit = r.id === 'ground' ? ['ground', next.ground] : o.targets.map((sec) => [sec, next[sec].find((x) => x.id === r.id)]).find(([, x]) => x);
      if (!hit) { notes.push(`No object with id ${r.id}: finish not applied`); continue; }
      const [sec, x] = hit, furn = sec === 'furnishings';
      if (r.material && furn) { if (FURNITURE_FINISHES[r.material]) x.finish = r.material; else notes.push(`Unknown furniture finish "${r.material}" for ${r.id}: kept its built-in finish`); }
      if (r.material && !furn) { if (MATERIALS[r.material]) x[sec === 'buildings' ? 'facade' : 'material'] = r.material; else notes.push(`Unknown material "${r.material}" for ${r.id}: kept ${x.material || x.facade}`); }
      if (typeof r.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(r.color)) x.color = r.color;
      if (!furn && sec !== 'buildings' && sec !== 'ground') for (const k of ['rough', 'metal']) if (r[k] != null) x[k] = r[k];
      applied++;
    }
    return { next, requested: use.length, applied, notes };
  }
  let requested = 0;
  for (const sec of o.sections) {
    const got = parseRows(sec, raw[sec]), use = got.slice(0, o.caps[sec] ?? 40);
    if (got.length > use.length) notes.push(`AI returned ${got.length} ${sec}; ${got.length - use.length} over this batch's limit of ${use.length} were not used`);
    requested += use.length;
    const keep = o.replace?.includes(sec) ? [] : (next[sec] || []).filter((x) => !String(x.id).startsWith(`${o.key}.`));
    const own = (v) => String(v || '').replace(/^([a-z]\d+[a-z]?\.)+/i, '');
    next[sec] = [...keep, ...use.map((x, i) => ({ ...x, id: `${o.key}.${short(own(x.id), 24) || i + 1}` }))];
  }
  if (!requested && o.sections.length) throw new Error('The AI returned no objects for this operation; it will be retried');
  return { next, requested, applied: requested, notes, adjust: fitWalls(next) };
}

// What this operation asked for vs what the validator actually let through (nothing is dropped silently).
export function opResult(spec, report, o, a, raw) {
  const mine = (m) => new RegExp(`(^|[^a-z0-9])${o.key}\\.`).test(m);
  const ids = o.kind === 'rows' ? o.sections.flatMap((s) => spec[s].filter((x) => String(x.id).startsWith(`${o.key}.`)).map((x) => x.id)) : [];
  return {
    requested: a.requested, constructed: o.kind === 'rows' ? ids.length : a.applied, ids: ids.slice(0, 80),
    not_built: [...report.dropped.filter(mine), ...a.notes].slice(0, 30), warnings: report.warnings.filter(mine).slice(0, 20), adjusted: (a.adjust || []).slice(0, 40),
    substitutions: (Array.isArray(raw?.substitutions) ? raw.substitutions : []).filter((s) => typeof s === 'string').map((s) => s.slice(0, 200)).slice(0, 10),
  };
}