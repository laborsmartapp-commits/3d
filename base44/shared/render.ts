import { secrets } from 'base44:runtime';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

export const APP_URL = 'https://celestia-grotto-world.base44.app';
export const SIZES = { '1920x1080': 1, '2560x1440': 1, '3840x2160': 1 };
export const FPS = [24, 30, 60];
export const PRESETS = ['standard', 'high', 'ultra', 'maximum'];
export const MAX_DURATION = 600; // seconds per take
const TERMINAL = ['completed', 'failed'];
export const isTerminal = (s) => TERMINAL.includes(s);

export async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

// RunPod Serverless REST API v2. Server-side only.
export async function runpod(path, method = 'GET', body) {
  const key = secrets.get('RUNPOD_API_KEY'), ep = secrets.get('RUNPOD_ENDPOINT_ID');
  if (!key) throw new Error('RUNPOD_API_KEY is not set');
  if (!ep) throw new Error('RUNPOD_ENDPOINT_ID is not set. Add it on the Secrets page after creating the RunPod endpoint.');
  const r = await fetch(`https://api.runpod.ai/v2/${ep}${path}`, {
    method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(20000),
  });
  const txt = await r.text();
  let j; try { j = JSON.parse(txt); } catch { j = { raw: txt }; }
  if (!r.ok) throw new Error(`RunPod ${r.status}: ${j.error || txt.slice(0, 200)}`);
  return j;
}

// Apply a RunPod status response (fetched with our own key, so it is trusted) to a RenderJob.
export async function applyRunpodStatus(svc, job, rp) {
  const st = rp.status, out = rp.output || {};
  const patch = { runpod_status: st };
  if (st === 'COMPLETED' && out.ok && out.video_uri) {
    Object.assign(patch, {
      status: 'completed', progress: 100, status_message: 'Master video ready', error: '',
      video_uri: out.video_uri, video_width: out.width, video_height: out.height, video_fps: out.fps, video_duration: out.duration, file_size: out.bytes, gpu: out.gpu || '',
    });
  } else if (st === 'COMPLETED' || st === 'FAILED' || st === 'CANCELLED' || st === 'TIMED_OUT') {
    const err = out.error || rp.error || (st === 'COMPLETED' ? 'Worker finished without a video' : st);
    Object.assign(patch, { status: 'failed', status_message: `Render failed: ${String(err).slice(0, 200)}`, error: String(err).slice(0, 2000) });
  } else if (st === 'IN_QUEUE' && !isTerminal(job.status)) {
    Object.assign(patch, { status: 'queued', status_message: 'Waiting for a RunPod GPU worker' });
  }
  if (isTerminal(job.status) && job.status === 'completed') delete patch.status; // never downgrade a finished master
  await svc.RenderJob.update(job.id, patch);
  return { ...job, ...patch };
}

// Presigned GET for the stored master (S3 or Cloudflare R2, S3-compatible).
export async function presignVideo(uri, expires = 3600) {
  const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri || '');
  if (!m) throw new Error('Video is not in render storage');
  const endpoint = secrets.get('STORAGE_ENDPOINT'), id = secrets.get('STORAGE_ACCESS_KEY_ID'), key = secrets.get('STORAGE_SECRET_ACCESS_KEY');
  if (!endpoint || !id || !key) throw new Error('Render storage secrets (STORAGE_ENDPOINT, STORAGE_ACCESS_KEY_ID, STORAGE_SECRET_ACCESS_KEY) are not set');
  const client = new AwsClient({ accessKeyId: id, secretAccessKey: key, service: 's3', region: secrets.get('STORAGE_REGION') || 'auto' });
  const url = new URL(`${endpoint.replace(/\/$/, '')}/${m[1]}/${m[2].split('/').map(encodeURIComponent).join('/')}`);
  url.searchParams.set('X-Amz-Expires', String(expires));
  const signed = await client.sign(new Request(url, { method: 'GET' }), { aws: { signQuery: true } });
  return signed.url;
}