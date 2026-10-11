import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runpod, applyRunpodStatus, presignVideo, isTerminal } from '../../shared/render.ts';
import { ROLES } from '../../shared/roles.ts';

// Owner actions on a render: refresh status from RunPod, cancel, or get a download link for the master.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { job_id, action } = await req.json();
    const svc = base44.asServiceRole.entities;
    const job = typeof job_id === 'string' ? (await svc.RenderJob.filter({ id: job_id }))[0] : null;
    if (!job || !ROLES.includes(user.role)) return Response.json({ error: 'Not found' }, { status: 404 });

    if (action === 'download') { // every studio role may watch masters

      if (job.status !== 'completed') return Response.json({ error: 'Master not ready' }, { status: 409 });
      return Response.json({ url: await presignVideo(job.video_uri) });
    }
    if (job.created_by_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!job.runpod_job_id) return Response.json({ error: 'Not submitted to RunPod' }, { status: 409 });
    if (action === 'status') {
      if (isTerminal(job.status)) return Response.json({ job: { id: job.id, status: job.status } });
      const next = await applyRunpodStatus(svc, job, await runpod(`/status/${job.runpod_job_id}`));
      return Response.json({ job: { id: next.id, status: next.status, progress: next.progress } });
    }
    if (action === 'cancel') {
      if (isTerminal(job.status)) return Response.json({ error: 'Render already finished' }, { status: 409 });
      await runpod(`/cancel/${job.runpod_job_id}`, 'POST');
      await svc.RenderJob.update(job.id, { status: 'failed', error: 'Cancelled', status_message: 'Cancelled by you' });
      return Response.json({ ok: true });
    }
    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}