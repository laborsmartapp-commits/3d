// Stage AI response format. Strict schemas with many nested objects exceed the AI service's grammar limit,
// so every blueprint section is a list of compact rows: values separated by "|" in a fixed field order.
// The server parses rows back into objects; empty values fall back to the validator's defaults.
const S = { type: 'string' }, N = { type: 'number' };
const obj = (props: Record<string, unknown>) => ({ type: 'object', properties: props, required: Object.keys(props), additionalProperties: false });
const rows = { type: 'array', items: S };

export const ROWS: Record<string, string> = {
  zones: 'id name:s x z w d',
  floors: 'id x z w d y material:s color:s',
  walls: 'id x1 z1 x2 z2 y h t material:s color:s openings:o',
  roofs: 'id x z w d y kind:s material:s color:s',
  stairs: 'id x z w run from_y to_y dir material:s',
  buildings: 'id x z w d h ry storeys facade:s color:s trim_color:s roof:s windows:s awning:s sign:s',
  elements: 'id type:s x z x1 z1 x2 z2 w d h r y ry lanes material:s color:s',
  nature: 'id type:s x z scale count radius color:s',
  furnishings: 'id type:s x y z ry scale color:s',
  vfx: 'id type:s x y z scale count color:s',
  lights: 'id type:s x y z color:s intensity range',
  cameras: 'id name:s x y z look_x look_y look_z fov',
  marks: 'id name:s x z yaw',
};
const FIELDS = Object.fromEntries(Object.entries(ROWS).map(([k, v]) => [k, v.split(' ').map((p) => { const [n, t] = p.split(':'); return [n, n === 'id' ? 's' : t || 'n']; })]));
export const SHELL_KEYS = ['zones', 'floors', 'walls', 'roofs', 'stairs', 'buildings', 'elements'];
export const DRESS_KEYS = ['furnishings', 'nature', 'vfx', 'lights', 'cameras', 'marks'];
const sections = (keys: string[]) => Object.fromEntries(keys.map((k) => [k, rows]));

export const SHELL = obj({
  name: S, summary: S, category: S, bounds: obj({ w: N, d: N }), ground: obj({ material: S, color: S }), palette: rows,
  hills: rows, spawn: obj({ x: N, z: N, yaw: N }), ...sections(SHELL_KEYS), substitutions: rows,
});
export const DRESS = obj({ ...sections(DRESS_KEYS), substitutions: rows });
export const PATCH = obj({ summary: S, add: obj(sections([...SHELL_KEYS, ...DRESS_KEYS])), remove: rows, update: { type: 'array', items: obj({ id: S, set: S }) }, substitutions: rows });

const fmt = (keys: string[]) => keys.map((k) => `${k} = ${ROWS[k].split(' ').map((p) => p.split(':')[0]).join('|')}`).join('\n');
export const rowRule = (keys: string[]) => `RESPONSE FORMAT: every blueprint section is a list of rows; each row is one object with its values separated by "|" in exactly this field order:
${fmt(keys)}
hills = x|z|r|h
Leave a value empty to use the default (e.g. furnishing y empty = automatic height; element fields that don't apply stay empty). Numbers in metres / radians, colours as #rrggbb. Wall "openings" = list separated by ";" of kind:at:w:h:sill (kind door|window|opening|glass, at 0-1 along the wall), e.g. door:0.5:1.1:2.3:0;glass:0.2:2.4:3:0.1. Never use "|" or ";" inside text values.`;
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
    f.forEach(([k, t]: string[], i: number) => setVal(o, k, t, vals[i]));
    return o;
  });
}
export function parseSections(raw: any, keys: string[]) {
  return Object.fromEntries(keys.map((k) => [k, parseRows(k, raw?.[k])]));
}
export const parseHills = (list: unknown) => (Array.isArray(list) ? list : []).map((r) => { const [x, z, rr, h] = String(r).split('|').map(parseFloat); return { x, z, r: rr, h }; });

// "field=value;field=value" -> typed object (types looked up across all row formats).
const TYPES: Record<string, string> = Object.assign({}, ...Object.values(FIELDS).map((f: any) => Object.fromEntries(f)));
export function parseSet(s: unknown) {
  const o: Record<string, unknown> = {};
  for (const part of String(s || '').split(';')) { const i = part.indexOf('='); if (i > 0) { const k = part.slice(0, i).trim(); setVal(o, k, TYPES[k] === 'o' ? 's' : TYPES[k] || 's', part.slice(i + 1)); } }
  return o;
}