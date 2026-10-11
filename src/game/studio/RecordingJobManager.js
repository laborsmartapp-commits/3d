import { base44 } from '@/api/base44Client';
import { RESOLUTIONS } from './quality';
import { buildManifest, submitToCloud, CLOUD_CONNECTED } from './CloudRenderService';

export const TAKE_STATUS = { capturing: 'Capturing Performance', uploading: 'Uploading Performance', captured: 'Performance Captured' };
export const JOB_STATUS = { queued: 'Queued for Render', rendering: 'Rendering', encoding: 'Encoding', completed: 'Completed', failed: 'Failed' };
const WAITING = 'Waiting for the cloud renderer — RunPod is not connected yet';

// Every render (first or re-render) is a new job; the performance it points at is never touched.
export async function queueRender(take, settings) {
  const r = RESOLUTIONS[settings.resolution];
  const job = await base44.entities.RenderJob.create({
    take_id: take.id, scene_id: take.scene_id, resolution: settings.resolution, width: r.w, height: r.h, fps: settings.fps, preset: settings.preset,
    status: 'queued', status_message: CLOUD_CONNECTED ? 'Submitting to RunPod' : WAITING, progress: 0, attempts: 1, manifest: buildManifest(take, settings),
  });
  await submitToCloud(job);
  return job;
}

export async function retryRender(job) {
  await base44.entities.RenderJob.update(job.id, { status: 'queued', error: '', progress: 0, attempts: (job.attempts || 0) + 1, status_message: CLOUD_CONNECTED ? 'Retrying on RunPod' : WAITING });
  await submitToCloud(job);
}

export async function videoUrl(job) {
  if (job.video_uri?.startsWith('s3://')) return (await base44.functions.invoke('renderJobControl', { job_id: job.id, action: 'download' })).data.url;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: job.video_uri, expires_in: 3600 });
  return signed_url;
}