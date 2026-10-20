import { base44 } from '@/api/base44Client';

const sign = (uri) => base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 }).then((r) => r.signed_url);

// Asset Library entries marked for Stage Creator: object models bound to catalog furnishing types (stage_types),
// and PBR texture sets bound to a material or furniture finish (material_kind). Newest asset wins per type/kind.
// Returns { models: {type: {id, uri, name}}, textures: {kind: {id, name, tile_m, urls}} }.
export async function loadStageAssets() {
  const A = base44.entities.Asset;
  const [models, sets] = await Promise.all([
    A.filter({ category: 'object', status: 'active', import_status: { $ne: 'failed' }, stage_types: { $exists: true } }, { sort: '-updated_date', limit: 100, fields: ['name', 'file_uri', 'stage_types'] }),
    A.filter({ category: 'texture', status: 'active', material_kind: { $exists: true } }, { sort: '-updated_date', limit: 50, fields: ['name', 'file_uri', 'material_kind', 'pbr_maps', 'tile_m'] }),
  ]);
  const out = { models: {}, textures: {} };
  for (const a of models.items) for (const t of a.stage_types || []) out.models[t] ||= { id: a.id, uri: a.file_uri, name: a.name };
  for (const a of sets.items) {
    if (!a.material_kind || out.textures[a.material_kind]) continue;
    const maps = { base_color: a.file_uri, ...(a.pbr_maps || {}) };
    const urls = Object.fromEntries(await Promise.all(Object.entries(maps).filter(([, u]) => u).map(async ([k, u]) => [k, await sign(u)])));
    out.textures[a.material_kind] = { id: a.id, name: a.name, tile_m: a.tile_m || 2, urls };
  }
  return out;
}

// Which requested pieces / surfaces have a real asset and which fall back to the procedural build.
export function assetCoverage(spec, a = {}) {
  const M = a.models || {}, T = a.textures || {};
  const types = [...new Set(spec.furnishings.map((f) => f.type))];
  const mats = [...new Set([...spec.floors, ...spec.walls, ...spec.roofs, ...spec.elements].map((x) => x.material).concat(spec.furnishings.map((f) => f.finish)).filter(Boolean))];
  return { models: types.filter((t) => M[t]), primitive: types.filter((t) => !M[t]), textured: mats.filter((m) => T[m]), procedural: mats.filter((m) => !T[m]) };
}