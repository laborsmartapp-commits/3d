import { base44 } from '@/api/base44Client';

const E = base44.entities;

// Marks an interrupted take as captured up to its last uploaded chunk; removes it if nothing was captured.
export async function recoverTake(take) {
  const ch = (await E.PerformanceChunk.filter({ take_id: take.id }, { sort: '-index', limit: 1, fields: ['end_t', 'index'] })).items[0];
  if (!ch) { await E.SceneTake.delete(take.id); return null; }
  return E.SceneTake.update(take.id, { status: 'captured', duration: ch.end_t, chunk_count: ch.index + 1 });
}

// Deletes a take, its render jobs, and its chunks (unless a duplicate still shares them).
export async function deleteTake(take) {
  const shared = take.source_take_id || (await E.SceneTake.count({ source_take_id: take.id }));
  if (!shared) await E.PerformanceChunk.deleteMany({ take_id: take.id });
  await E.RenderJob.deleteMany({ take_id: take.id });
  await E.SceneTake.delete(take.id);
}