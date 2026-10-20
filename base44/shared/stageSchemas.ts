// Stage AI response format. Strict schemas with many nested objects exceed the AI service's grammar limit,
// so every blueprint section is a list of compact rows: values separated by "|" in a fixed field order.
// The server parses rows back into objects; empty values fall back to the validator's defaults.
const S = { type: 'string' }, N = { type: 'number' };
export const obj = (props: Record<string, unknown>) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });
export const rows = { type: 'array', items: S };

export const ROWS: Record<string, string> = {
  zones: 'id name:s x z w d',
  program: 'zone:s role:s major:s decor:s',
  floors: 'id x z w d y material:s color:s rough metal',
  walls: 'id x1 z1 x2 z2 y h t material:s color:s rough metal openings:o',
  roofs: 'id x z w d y kind:s material:s color:s rough metal',
  stairs: 'id x z w run from_y to_y dir material:s rough metal',
  buildings: 'id x z w d h ry storeys facade:s color:s trim_color:s roof:s windows:s awning:s sign:s',
  elements: 'id type:s x z x1 z1 x2 z2 w d h r y ry lanes material:s color:s rough metal',
  nature: 'id type:s x z scale count radius color:s',
  furnishings: 'id type:s x y z ry scale color:s',
  vfx: 'id type:s x y z scale count color:s',
  lights: 'id type:s x y z color:s intensity range',
  cameras: 'id name:s x y z look_x look_y look_z fov',
  marks: 'id name:s x z yaw',
  surfaces: 'id material:s color:s rough metal',
};
const FIELDS: Record<string, string[][]> = Object.fromEntries(Object.entries(ROWS).map(([k, v]) => [k, v.split(' ').map((p) => { const [n, t] = p.split(':'); return [n, n === 'id' ? 's' : t || 'n']; })]));
const fmt = (keys: string[]) => keys.map((k) => `${k} = ${ROWS[k].split(' ').map((p) => p.split(':')[0]).join('|')}`).join('\n');

// One AI operation's response schema: optional fixed fields + one row list per section.
export const opSchema = (keys: string[], extra: Record<string, unknown> = {}) => obj({ ...extra, ...Object.fromEntries(keys.map((k) => [k, rows])), substitutions: rows });
export const LAYOUT_EXTRA = { name: S, summary: S, category: S, bounds: obj({ w: N, d: N }), ground: obj({ material: S, color: S }), palette: rows, hills: rows, spawn: obj({ x: N, z: N, yaw: N }) };
export const PATCH = obj({ summary: S, add: obj(Object.fromEntries(['zones', 'floors', 'walls', 'roofs', 'stairs', 'buildings', 'elements', 'furnishings', 'nature', 'vfx', 'lights', 'cameras', 'marks'].map((k) => [k, rows]))), remove: rows, update: { type: 'array', items: obj({ id: S, set: S }) }, substitutions: rows });

export const rowRule = (keys: string[]) => `RESPONSE FORMAT: every section is a list of rows; each row is one object with its values separated by "|" in exactly this field order:
${fmt(keys)}${keys.includes('zones') ? '\nhills = x|z|r|h' : ''}
Leave a value empty to use the default (e.g. furnishing y empty = automatic height; fields that don't apply stay empty). Numbers in metres / radians, colours as #rrggbb, rough/metal 0-1 (empty = the material's own finish).${keys.includes('walls') ? ' Wall "openings" = list separated by ";" of kind:at:w:h:sill (kind door|window|opening|glass, at 0-1 along the wall), e.g. door:0.5:1.1:2.3:0;glass:0.2:2.4:3:0.1.' : ''} Never use "|" or ";" inside text values.`;
export const PATCH_RULE = `"add" sections use the same rows; "update" items are {id, set} where set = "field=value;field=value" with field names from the row formats; "remove" = ids.`;

function parseOpenings(v: string) {
  return v.split(';').map((s) => s.trim()).filter(Boolean).map((s) => { const [kind, at, w, h, sill] = s.split(':'); return { kind, at: +at, w: +w, h: +h, sill: +sill }; });
}
function setVal(o: Record<string, unknown>, k: string, t: string, raw: string) {
  const v = (raw ?? '').trim();
  if (v === '' || v === '-') return;
  if (t === 'n') { const n = parseFloat(v); if (Number.isFinite(n)) o[k] = n; }
  else if (t === 'o') o[k] = parseOpenings(v);
  else o[k] = v;
}
export function parseRows(sec: string, list: unknown) {
  const f = FIELDS[sec];
  return (Array.isArray(list) ? list : []).filter((r) => typeof r === 'string').map((r: string) => {
    const vals = r.split('|'), o: Record<string, unknown> = {};
    f.forEach(([k, t], i) => setVal(o, k, t, vals[i]));
    return o;
  });
}
export const parseSections = (raw: any, keys: string[]) => Object.fromEntries(keys.map((k) => [k, parseRows(k, raw?.[k])]));
export const parseHills = (list: unknown) => (Array.isArray(list) ? list : []).map((r) => { const [x, z, rr, h] = String(r).split('|').map(parseFloat); return { x, z, r: rr, h }; }).filter((h) => Number.isFinite(h.x) && Number.isFinite(h.z));

// Objects -> the same compact rows (used to show the AI what is already built, cheaply).
const cell = (v: unknown, t: string) => (v == null ? '' : t === 'n' ? String(Math.round(+v * 100) / 100) : t === 'o' ? (v as any[]).map((o) => `${o.kind}:${o.at}:${o.w}:${o.h}:${o.sill}`).join(';') : String(v));
export const toRows = (sec: string, list: any[] = []) => list.map((o) => FIELDS[sec].map(([k, t]) => cell(o[k], t)).join('|'));

// "field=value;field=value" -> typed object (types looked up across all row formats).
const TYPES: Record<string, string> = Object.assign({}, ...Object.values(FIELDS).map((f) => Object.fromEntries(f)));
export function parseSet(s: unknown) {
  const o: Record<string, unknown> = {};
  for (const part of String(s || '').split(';')) { const i = part.indexOf('='); if (i > 0) { const k = part.slice(0, i).trim(); setVal(o, k, TYPES[k] === 'o' ? 's' : TYPES[k] || 's', part.slice(i + 1)); } }
  return o;
}