import { base44 } from '@/api/base44Client';

// Reads animation clip names + durations straight from a .glb's JSON chunk (no model load needed).
export async function readGlbClips(blob) {
  const buf = await blob.arrayBuffer(), dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546c67) return [];
  const len = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, len)));
  return (json.animations || []).map((a, i) => ({
    name: a.name || `Clip ${i + 1}`,
    duration: Math.max(0, ...a.samplers.map((s) => json.accessors[s.input]?.max?.[0] || 0)),
  }));
}

// Creates one Animation library entry per clip, pointing at the character's file.
export async function extractCharacterClips(character, file) {
  if (character.format !== 'glb') return 0;
  const clips = await readGlbClips(file);
  if (!clips.length) return 0;
  const rows = clips.map((c) => ({
    name: `${character.name} · ${c.name}`, category: 'animation', subcategory: 'custom', folder: character.name,
    file_uri: character.file_uri, file_name: character.file_name, format: 'glb', size: character.size,
    rig: character.rig || character.name, duration: Math.round(c.duration * 100) / 100, clip_name: c.name,
    source_asset_id: character.id, version: 1, status: 'active', import_status: 'ok',
  }));
  const made = await base44.entities.Asset.bulkCreate(rows);
  await base44.entities.Asset.bulkUpdate(made.map((m) => ({ id: m.id, root_id: m.id })));
  return made.length;
}