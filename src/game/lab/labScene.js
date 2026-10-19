import { base44 } from '@/api/base44Client';

// A small but real test arrangement: two actors, built-in body animations and one library music clip.
export async function createLabScene(S) {
  await S.newScene('Timeline Lab Scene');
  const D = S.dir;
  D.addActor('jay'); D.addActor('nova');
  D.setActor('jay', { x: -1.2, z: 0, yaw: 0 }); D.setActor('nova', { x: 1.6, z: 0.4, yaw: -0.4 });
  D.addAnim('jay', 'dance', 4, 1); D.addAnim('nova', 'wave', 3, 2); D.addAnim('nova', 'dance', 3, 8);
  const audio = (await base44.entities.Asset.filter({ category: 'audio', status: 'active' }, { limit: 1 })).items[0];
  if (audio) {
    await D.addAudio(audio, 'music', 0).catch(() => D.addAudio(audio, 'music', 0)); // one retry if the first download fails
    const m = D.tl.clips.find((c) => c.kind === 'audio'); if (m) m.end = Math.min(m.end, 12);
    D.tl.duration = 20;
  }
  D.hist = []; D.fut = []; // the arrangement itself is the starting point, not an undo step
  D.seek(0);
  await S.saveScene();
}

// Removes the lab scene plus any takes and performance data recorded in it.
export async function deleteLabScene(S) {
  const id = S.scene?.id; if (!id) return;
  const takes = (await base44.entities.SceneTake.filter({ scene_id: id }, { limit: 200, fields: ['id'] })).items;
  for (const t of takes) { await base44.entities.PerformanceChunk.deleteMany({ take_id: t.id }); await base44.entities.SceneTake.delete(t.id); }
  await base44.entities.StudioScene.delete(id);
  S.scene = null; S.saveT = 0; S.dir.load(null); S.cams.load([]); S.emit();
}