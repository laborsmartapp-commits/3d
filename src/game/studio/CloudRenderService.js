import { base44 } from '@/api/base44Client';
import { RESOLUTIONS, PRESETS } from './quality';
import { MANIFEST_SCHEMA, ACTOR_ASSETS } from './versions';

// Flip to true on the main branch once the `submitRenderJob` + `renderWebhook` backend functions
// and the RUNPOD_API_KEY / RUNPOD_ENDPOINT_ID secrets exist. Until then jobs stay honestly "queued".
export const CLOUD_CONNECTED = false;

// RunPod Serverless REST API v2 (https://docs.runpod.io/serverless/endpoints/operations).
// Called only from backend functions — the API key must never reach the browser.
export const RUNPOD_V2 = {
  base: 'https://api.runpod.ai/v2',
  run: (ep) => `/${ep}/run`,                 // POST {input, webhook} -> {id, status:"IN_QUEUE"}
  status: (ep, id) => `/${ep}/status/${id}`, // GET -> {id, status, output?, error?}
  cancel: (ep, id) => `/${ep}/cancel/${id}`, // POST
  retry: (ep, id) => `/${ep}/retry/${id}`,   // POST (failed / timed-out jobs)
  health: (ep) => `/${ep}/health`,           // GET worker + queue counts
};

// RunPod job status -> our render status. The worker reports its stage in output/stream.
export function mapRunpodStatus(status, output = {}) {
  if (status === 'IN_QUEUE') return 'queued';
  if (status === 'IN_PROGRESS') return output?.stage === 'encoding' ? 'encoding' : 'rendering';
  if (status === 'COMPLETED') return 'completed';
  return 'failed'; // FAILED, CANCELLED, TIMED_OUT
}

// Everything the remote worker needs to reproduce a take deterministically.
export function buildManifest(take, settings) {
  const r = RESOLUTIONS[settings.resolution];
  return {
    schema: MANIFEST_SCHEMA,
    world: take.world, stage: { id: take.world || 'celestia-grotto', name: take.stage_name, version: take.stage_version }, island_id: take.island_id, location: take.location,
    world_snapshot: take.world_snapshot, actor_assets: take.actor_assets || { krush: ACTOR_ASSETS.krush }, recording_timing: take.timing,
    access: {
      route: '/render?job=<render_job_id>', performance: 'backend function getRenderPerformance({job_id}) authorised by the RENDER_WORKER_TOKEN secret',
      note: 'World is rebuilt from engine code + world_snapshot; no user browser session or login is needed',
    },
    take_id: take.id, performance_take_id: take.source_take_id || take.id, duration: take.duration,
    output: { width: r.w, height: r.h, fps: settings.fps, frame_count: Math.ceil(take.duration * settings.fps), codec: 'h264', container: 'mp4', preset: settings.preset, quality: PRESETS[settings.preset] },
    camera: take.camera_snapshot, camera_mode: take.camera_mode, env_start: take.env_start, actors: take.actors,
    timeline: {
      clock: 'real elapsed seconds from Record (monotonic wall clock); samples are irregular, up to 60 Hz', source: 'PerformanceChunk where take_id = performance_take_id, ordered by index',
      frame_time: 't = frame_index / fps (fixed step, independent of the recording browser frame rate)',
      interpolation: 'linear actor position/phase, shortest-arc yaw, slerp camera quaternion, step for animation mode and weather',
      camera_source: 'samples[].c is the exact production camera pose (static or follow) per sample',
    },
  };
}

export async function submitToCloud(job) {
  if (!CLOUD_CONNECTED) return false;
  await base44.functions.invoke('submitRenderJob', { job_id: job.id });
  return true;
}