import { base44 } from '@/api/base44Client';
import { RESOLUTIONS, PRESETS } from './quality';
import { MANIFEST_SCHEMA, ACTOR_ASSETS } from './versions';

// Jobs are submitted through backend functions (submitRenderJob / renderJobControl / renderWebhook);
// the RunPod API key never reaches the browser.
export const CLOUD_CONNECTED = true;

// Everything the remote worker needs to reproduce a take deterministically.
export function buildManifest(take, settings) {
  const r = RESOLUTIONS[settings.resolution];
  return {
    schema: MANIFEST_SCHEMA,
    world: take.world, stage: { id: take.world || 'celestia-grotto', name: take.stage_name, version: take.stage_version }, island_id: take.island_id, location: take.location,
    world_snapshot: take.world_snapshot, actor_assets: take.actor_assets || { krush: ACTOR_ASSETS.krush }, recording_timing: take.timing,
    access: { route: '/render', performance: 'renderWorker({action:"bundle", job_id, token}) with the single-job token minted by submitRenderJob' },
    take_id: take.id, performance_take_id: take.source_take_id || take.id, duration: take.duration,
    output: { width: r.w, height: r.h, fps: settings.fps, frame_count: Math.ceil(take.duration * settings.fps), codec: 'h264', container: 'mp4', preset: settings.preset, quality: PRESETS[settings.preset] },
    camera: take.camera_snapshot, camera_mode: take.camera_mode, env_start: take.env_start, actors: take.actors,
    timeline: {
      source: 'PerformanceChunk where take_id = performance_take_id, ordered by index',
      frame_time: 't = frame_index / fps on a virtual clock (independent of GPU speed)',
      interpolation: 'per-actor linear position/phase, shortest-arc yaw; camera slerp, hard cut when samples[].ci changes; step for animation mode and weather',
    },
  };
}

// Submission failures are written onto the job by the function, so the library shows them.
export async function submitToCloud(job) {
  await base44.functions.invoke('submitRenderJob', { job_id: job.id }).catch(() => {});
  return true;
}