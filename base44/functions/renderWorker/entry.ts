import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { sha256, isTerminal } from '../../shared/render.ts';

// API for the RunPod worker and its headless render page. No user session: every call must carry the
// single-job token minted by submitRenderJob (only its hash is stored). Scope: exactly one job.
const bad = (error, status) => Response.json({ error }, { status });

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { action, job_id, token, runpod_id, progress, stage, message } = await req.json();
    if (typeof job_id !== 'string' || typeof token !== 'string' || token.length < 40) return bad('Unauthorized', 401);
    const svc = base44.asServiceRole.entities;
    const job = (await svc.RenderJob.filter({ id: job_id }))[0];
    if (!job?.render_token_hash || job.render_token_hash !== (await sha256(token))) return bad('Unauthorized', 401);
    if (isTerminal(job.status)) return bad('Job is no longer active', 409);

    if (action === 'bundle') {
      const take = (await svc.SceneTake.filter({ id: job.take_id }))[0];
      if (!take || take.created_by_id !== job.created_by_id) return bad('Take not found', 404);
      const perfId = take.source_take_id || take.id;
      const page = await svc.PerformanceChunk.filter({ take_id: perfId }, { sort: 'index', limit: 1000 });
      // Library characters and animation clips are private files: sign them here, the render page has no session.
      const uris = new Set();
      for (const a of take.cast || []) if (typeof a.asset_uri === 'string') uris.add(a.asset_uri);
      for (const c of take.timeline?.clips || []) if (typeof c.anim_uri === 'string') uris.add(c.anim_uri);
      const file_urls = {};
      await Promise.all([...uris].filter((u) => !/^https?:/.test(u)).slice(0, 50).map(async (u) => {
        file_urls[u] = (await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: u, expires_in: 3600 })).signed_url;
      }));
      return Response.json({
        file_urls,
        job: { id: job.id, width: job.width, height: job.height, fps: job.fps, preset: job.preset, frame_count: job.frame_count },
        take: { id: take.id, world: take.world || 'celestia-grotto', stage_name: take.stage_name, stage_version: take.stage_version, duration: take.duration, world_snapshot: take.world_snapshot, actor_assets: take.actor_assets, env_start: take.env_start, actors: take.actors, camera_snapshot: take.camera_snapshot, camera_mode: take.camera_mode, kind: take.kind, cast: take.cast, source_take_id: take.source_take_id },
        chunks: page.items.map((c) => ({ index: c.index, samples: c.samples })),
      });
    }
    if (action === 'audio') {
      // The take's frozen audio arrangement, with each clip's file signed for this job only.
      const take = (await svc.SceneTake.filter({ id: job.take_id }))[0];
      if (!take || take.created_by_id !== job.created_by_id) return bad('Take not found', 404);
      const tl = take.timeline || {}, all = (tl.clips || []).filter((c) => c.kind === 'audio' && typeof c.uri === 'string');
      // Same mute/solo/track-gain rule as the studio (AudioEngine.liveAudio).
      const tracks = tl.tracks || {}, tr = (c) => tracks[c.track] || {};
      const solo = all.some((c) => c.solo || tr(c).solo);
      const live = all.filter((c) => !c.muted && !tr(c).muted && (!solo || c.solo || tr(c).solo)).slice(0, 64)
        .map((c) => ({ ...c, gain: Number(c.gain ?? 1) * Number(tr(c).gain ?? 1) }));
      const ids = [...new Set(live.map((c) => c.asset_id).filter(Boolean))];
      const assets = ids.length ? await svc.Asset.filter({ id: { $in: ids } }) : [];
      const ok = new Map(assets.filter((a) => a.category === 'audio').map((a) => [a.id, a.file_uri]));
      const clips = live.filter((c) => ok.get(c.asset_id) === c.uri); // only real library audio, exact stored version
      const urls = {};
      await Promise.all([...new Set(clips.map((c) => c.uri))].map(async (u) => {
        urls[u] = (await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: u, expires_in: 3600 })).signed_url;
      }));
      return Response.json({
        version: 1, master_gain: Number(tl.master_gain ?? 1), duration: take.duration, skipped: live.length - clips.length,
        clips: clips.map((c) => ({ id: c.id, asset_id: c.asset_id, url: urls[c.uri], track: c.track, start: +c.start || 0, end: +c.end || 0, in: +c.in || 0, len: +c.len || 0, speed: +c.speed || 1, loop: !!c.loop, gain: Number(c.gain ?? 1), pan: +c.pan || 0, fade_in: +c.fadeIn || 0, fade_out: +c.fadeOut || 0 })),
      });
    }
    if (typeof runpod_id !== 'string' || runpod_id !== job.runpod_job_id) return bad('Run does not match this job', 403);
    if (action === 'claim') {
      if (job.worker_run_id && job.worker_run_id !== runpod_id) return bad('Job already claimed by another run', 409);
      await svc.RenderJob.update(job.id, { worker_run_id: runpod_id, claimed_at: new Date().toISOString(), status: 'rendering', status_message: 'GPU worker started' });
      return Response.json({ ok: true });
    }
    if (action === 'progress') {
      if (job.worker_run_id !== runpod_id) return bad('Not the claiming run', 409);
      const status = stage === 'encoding' || stage === 'uploading' ? 'encoding' : 'rendering';
      await svc.RenderJob.update(job.id, { status, progress: Math.max(0, Math.min(99, Number(progress) || 0)), status_message: String(message || status).slice(0, 200) });
      return Response.json({ ok: true });
    }
    return bad('Unknown action', 400);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}