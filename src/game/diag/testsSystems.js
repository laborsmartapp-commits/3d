import { E, wait, rd, result, qaScene, chunks, walk, take } from './testKit';
import { recoverTake, deleteTake } from '../studio/takeOps';
import { net } from '../studio/net';

const unique = (ch) => new Set(ch.map((c) => c.index)).size === ch.length;
const H_KEY = 'diag.pendingH';

export async function testG(e) {
  const S = e.studio, D = e.diag; const qa = await qaScene(S);
  await S.record(); D.script = walk(2); await wait(3000); D.script = null;
  const t = S.take; S.rec.active = false; S.rec.flush(); await Promise.all(S.rec.pending); // interrupted before Stop
  S.endTake();
  const ch0 = await chunks(t.id), max = Math.max(-1, ...ch0.map((c) => c.index));
  const missing = []; for (let i = 0; i <= max; i++) if (!ch0.some((c) => c.index === i)) missing.push(i);
  const rec = await recoverTake(t);
  const ch1 = await chunks(t.id);
  const empty = await E.SceneTake.create({ scene_id: qa.id, scene_name: qa.name, name: 'QA empty interrupted', status: 'capturing' });
  await recoverTake(empty);
  const m = {
    chunks_before: ch0.length, chunks_after: ch1.length, missing_indices: missing, duplicates: !unique(ch1),
    recovered_status: rec?.status, recovered_duration_s: rd(rec?.duration), last_chunk_end_s: rd(ch1.at(-1)?.end_t),
    empty_take_removed: (await E.SceneTake.filter({ id: empty.id })).length === 0,
  };
  if (rec) await deleteTake(rec);
  const ok = ch0.length > 0 && ch1.length === ch0.length && !m.duplicates && rec?.status === 'captured' && m.recovered_duration_s === m.last_chunk_end_s && m.empty_take_removed;
  return result(ok, m, missing.length ? `Missing chunk indices detected: ${missing.join(', ')}` : 'Interrupted take recovered from its uploaded chunks; empty shell removed.');
}

export async function testH(e) {
  const S = e.studio, pend = JSON.parse(localStorage.getItem(H_KEY) || 'null');
  if (!pend) {
    const qa = await qaScene(S);
    localStorage.setItem(H_KEY, JSON.stringify({ sceneId: qa.id, prevLocal: S.localQuality, prevCloud: S.cloud }));
    await S.setLocalQuality('low');
    await S.setCloud({ resolution: '4k', preset: 'maximum', fps: 30 });
    return { status: 'INCONCLUSIVE', note: 'Step 1 done: settings saved. Refresh the page, re-open diagnostics, and run Test H again to finish.' };
  }
  const s = (await E.StudioScene.filter({ id: pend.sceneId }))[0];
  S.openScene(s);
  const c = s.cloud_settings || {};
  const persisted = { cloud_resolution: c.resolution, cloud_preset: c.preset, cloud_fps: c.fps, scene_local_quality: s.local_quality, device_local_quality: S.localQuality, live_quality_after_refresh: e.qName };
  const r = await take(e, 1.5, null);
  const id = r.take?.id;
  if (r.status === 'review') await S.saveTake();
  const job = id && (await E.RenderJob.filter({ take_id: id }))[0], out = job?.manifest?.output || {};
  const m = { ...persisted, job_width: job?.width, job_height: job?.height, job_fps: job?.fps, job_preset: job?.preset, manifest_output: `${out.width}×${out.height} @ ${out.fps} ${out.preset}`, live_quality_after_queue: e.qName };
  if (id) await deleteTake({ id });
  localStorage.removeItem(H_KEY);
  await S.setLocalQuality(pend.prevLocal); await S.setCloud(pend.prevCloud);
  const ok = c.resolution === '4k' && c.preset === 'maximum' && c.fps === 30 && s.local_quality === 'low' && S.localQuality === 'low' && persisted.live_quality_after_refresh === 'low'
    && job?.width === 3840 && job?.height === 2160 && job?.fps === 30 && job?.preset === 'maximum' && out.width === 3840 && out.height === 2160 && out.fps === 30 && m.live_quality_after_queue === 'low';
  return result(ok, m, 'Settings survive a refresh, the render manifest is 3840×2160 @ 30 Maximum, and the local preview stays Low. Your previous settings were restored afterwards.');
}

export async function testI(e) {
  const S = e.studio; await qaScene(S);
  net.failUploads = true;
  const r = await take(e, 3, walk(2));
  const id = r.take.id, pendingShown = S.status === 'pending', unsent = S.rec.unsent.length;
  const notSaved = (await E.SceneTake.filter({ id }))[0]?.status !== 'captured';
  const copy = S.rec.unsent[0] && { ...S.rec.unsent[0] };
  net.failUploads = false;
  await S.retryUpload();
  const ch = await chunks(id), samples = ch.reduce((n, c) => n + c.samples.length, 0);
  if (copy) await E.PerformanceChunk.upsert([copy], { key: 'chunk_key' }); // resend an already-saved chunk
  const ch2 = await chunks(id);
  const m = { pending_shown: pendingShown, chunks_kept_on_device: unsent, saved_prematurely: !notSaved, status_after_retry: S.status, chunks_on_server: ch.length, expected_chunks: S.take?.chunk_count, samples_on_server: samples, expected_samples: S.take?.sample_count, duplicate_after_resend: ch2.length !== ch.length || !unique(ch2) };
  const ok = pendingShown && unsent > 0 && notSaved && S.status === 'review' && ch.length === m.expected_chunks && samples === m.expected_samples && !m.duplicate_after_resend;
  return result(ok, m, 'Uploads fail on purpose inside the app only (your connection is untouched), then recover on retry.');
}