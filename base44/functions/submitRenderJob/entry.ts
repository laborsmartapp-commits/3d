import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { APP_URL, SIZES, FPS, PRESETS, sha256, runpod } from '../../shared/render.ts';
import { canSubmitRender, isAdmin, loadSettings } from '../../shared/roles.ts';

// Owner submits one of their RenderJobs to RunPod. A fresh single-job worker token is minted per submit.
export default async function (req) {
  let svc = null, jobId = null;
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { job_id } = await req.json();
    if (typeof job_id !== 'string' || !job_id) return Response.json({ error: 'job_id required' }, { status: 400 });
    svc = base44.asServiceRole.entities;
    const job = (await svc.RenderJob.filter({ id: job_id }))[0];
    if (!job) return Response.json({ error: 'Not found' }, { status: 404 });
    if (!canSubmitRender(user)) return Response.json({ error: 'Only directors and admins can submit renders' }, { status: 403 });
    if (job.created_by_id !== user.id && !isAdmin(user)) return Response.json({ error: 'Not found' }, { status: 404 });
    const settings = await loadSettings(svc);
    const active = await svc.RenderJob.count({ created_by_id: job.created_by_id, status: { $in: ['queued', 'rendering', 'encoding'] }, runpod_job_id: { $nin: ['', null] }, id: { $ne: job.id } });
    if (active >= settings.max_active_renders_per_user) return Response.json({ error: `Limit of ${settings.max_active_renders_per_user} active renders reached` }, { status: 429 });
    const MAX_DURATION = settings.max_scene_duration;
    jobId = job.id;
    if (job.status === 'completed') return Response.json({ error: 'Already rendered' }, { status: 409 });
    if (job.runpod_job_id && (job.status === 'rendering' || job.status === 'encoding')) return Response.json({ error: 'Render already running' }, { status: 409 });
    if (!SIZES[`${job.width}x${job.height}`] || !FPS.includes(job.fps) || !PRESETS.includes(job.preset)) return Response.json({ error: 'Unsupported render settings' }, { status: 400 });
    const take = (await svc.SceneTake.filter({ id: job.take_id }))[0];
    if (!take || take.created_by_id !== job.created_by_id) return Response.json({ error: 'Take not found' }, { status: 404 });
    if (!(take.duration > 0) || take.duration > MAX_DURATION) return Response.json({ error: `Take must be between 0 and ${MAX_DURATION}s` }, { status: 400 });

    const frames = Math.ceil(take.duration * job.fps);
    const token = crypto.randomUUID() + crypto.randomUUID();
    await svc.RenderJob.update(job.id, { render_token_hash: await sha256(token), worker_run_id: '', runpod_job_id: '', status: 'queued', progress: 0, error: '', frame_count: frames, status_message: 'Submitting to RunPod' });
    const pxPerSec = job.width * job.height * job.fps;
    const execMs = Math.min(4 * 3600e3, Math.max(15 * 60e3, Math.round(take.duration * pxPerSec / 1.5e6) * 1000)); // bounded runtime
    const rp = await runpod('/run', 'POST', {
      input: { job_id: job.id, token, app_url: APP_URL, stage: take.world || 'celestia-grotto', width: job.width, height: job.height, fps: job.fps, preset: job.preset, frames, duration: take.duration },
      webhook: `${APP_URL}/functions/renderWebhook`,
      policy: { executionTimeout: execMs, ttl: 24 * 3600e3 },
    });
    await svc.RenderJob.update(job.id, { runpod_job_id: rp.id, runpod_status: rp.status, status_message: 'Queued on RunPod' });
    return Response.json({ ok: true, runpod_job_id: rp.id, frames });
  } catch (error) {
    if (svc && jobId) await svc.RenderJob.update(jobId, { status: 'failed', error: error.message, status_message: `Submit failed: ${error.message}`.slice(0, 240) }).catch(() => {});
    return Response.json({ error: error.message }, { status: 500 });
  }
}