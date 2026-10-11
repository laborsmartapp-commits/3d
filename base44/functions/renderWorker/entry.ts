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
      return Response.json({
        job: { id: job.id, width: job.width, height: job.height, fps: job.fps, preset: job.preset, frame_count: job.frame_count },
        take: { id: take.id, world: take.world || 'celestia-grotto', stage_name: take.stage_name, stage_version: take.stage_version, duration: take.duration, world_snapshot: take.world_snapshot, actor_assets: take.actor_assets, env_start: take.env_start, actors: take.actors, camera_snapshot: take.camera_snapshot, camera_mode: take.camera_mode, source_take_id: take.source_take_id },
        chunks: page.items.map((c) => ({ index: c.index, samples: c.samples })),
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