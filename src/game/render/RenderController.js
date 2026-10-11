import { PRESETS } from '@/game/studio/quality';
import { setPresignedUrls } from '@/game/studio/GlbAvatar';

// Configures a live stage engine for the master render and exposes frame(i) to the RunPod worker.
export async function prepareRender(e, clock, bundle) {
  const { job, take, chunks } = bundle, P = PRESETS[job.preset] || PRESETS.high;
  const W = job.width, H = job.height;
  e.studio.localQuality = 'fixed'; // no auto quality changes mid-render
  e.applyQuality(P.engineQuality);
  const sun = e.env?.sun || e.sun;
  if (sun?.castShadow !== undefined && P.shadowMap) { sun.castShadow = true; sun.shadow.mapSize.set(P.shadowMap, P.shadowMap); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  if (e.lightPool && P.maxLights) e.lightPool.max = P.maxLights;
  e.renderer.setPixelRatio(P.supersample || 1); // backing store larger than output = supersampling
  e.renderer.setSize(W, H);
  e.camera.aspect = W / H; e.camera.updateProjectionMatrix();
  Object.assign(e, { mode: 'play', intro: null, readOnly: true });
  e.hud.phase = 'game';
  await new Promise((r) => setTimeout(r, 300)); // let the last real-time frame land before taking over
  clock.takeover();
  setPresignedUrls(bundle.file_urls);
  await e.studio.playTake(take, chunks);
  if (e.studio.status !== 'playing') throw new Error(e.studio.error || 'Performance failed to load');
  await Promise.all(Object.values(e.actors || {}).map((p) => p.ready)); // library characters must be in the frame before frame 0
  const lib = (take.timeline?.clips || []).filter((c) => c.anim_uri);
  for (const p of Object.values(e.actors || {})) p.preloadClips?.(lib);
  await Promise.all(Object.values(e.actors || {}).map((p) => p.clipsReady));
  const t0 = clock.now, fps = job.fps;
  const frames = Math.max(1, Math.ceil(e.studio.play.duration * fps));
  return {
    frames, fps, width: W, height: H, duration: e.studio.play.duration, stage: e.stage.id,
    actors: Object.keys(e.studio.play.samples[0]?.a || {}),
    gl: glInfo(e.renderer),
    frame(i) { clock.set(t0 + (i * 1000) / fps); clock.flush(); return e.studio.play.t; },
  };
}

function glInfo(r) {
  const gl = r.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
  return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
}