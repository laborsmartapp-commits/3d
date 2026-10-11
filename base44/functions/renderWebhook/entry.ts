import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { runpod, applyRunpodStatus } from '../../shared/render.ts';

// RunPod completion webhook. The body is never trusted: we only take the job id from it and
// re-fetch the real status from RunPod with our own API key before updating anything.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const id = body?.id;
    if (typeof id !== 'string' || !/^[A-Za-z0-9-]{6,80}$/.test(id)) return Response.json({ error: 'Bad request' }, { status: 400 });
    const svc = base44.asServiceRole.entities;
    const job = (await svc.RenderJob.filter({ runpod_job_id: id }))[0];
    if (!job) return Response.json({ error: 'Unknown job' }, { status: 404 });
    const next = await applyRunpodStatus(svc, job, await runpod(`/status/${id}`));
    return Response.json({ ok: true, status: next.status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}