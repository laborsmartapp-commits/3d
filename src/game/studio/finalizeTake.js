import { base44 } from '@/api/base44Client';
import { clipEnd } from './Timeline';

const FPS = 30, PER_CHUNK = 150;
const r3 = (v) => +v.toFixed(3), r4 = (v) => +v.toFixed(4);

// Bakes the whole Director timeline (every actor track + body animations + selected camera) into one
// self-contained take. The take stores its own samples, so later scene edits never change it.
export async function finalizeTake(sm) {
  const D = sm.dir, cam = sm.cams.selected;
  const tl = JSON.parse(JSON.stringify(D.tl)), dur = Math.max(0, ...tl.clips.map(clipEnd));
  if (!cam) throw new Error('Add a camera before finalizing.');
  if (!tl.clips.some((c) => c.kind === 'perf')) throw new Error('Record at least one character performance first.');
  await sm.saveScene();
  await D.preload();
  const missing = tl.clips.filter((c) => c.kind === 'perf' && !D.pbs.get(c.take_id)?.samples.length);
  if (missing.length) throw new Error(`${missing.length} performance clip(s) have no recorded data.`);

  const cast = tl.actors.filter((a) => !a.muted), env = sm.envState(), keepT = D.t, samples = [];
  for (let i = 0, n = Math.ceil(dur * FPS); i <= n; i++) {
    const t = Math.min(dur, i / FPS);
    D.t = t; D.drive(i ? 1 / FPS : 0); sm.cams.update(1 / FPS);
    const a = {};
    for (const x of cast) {
      const p = sm.e.actors[x.id]; if (!p) continue;
      a[x.id] = { p: [r3(p.pos.x), r3(p.pos.y), r3(p.pos.z)], y: r4(p.yaw), m: p.anim.mode, ph: r4(p.anim.phase || 0), sp: r3(p.anim.speed || 0), at: r4(p.anim.t || 0), ly: JSON.parse(JSON.stringify(p.anim.layers || [])) };
    }
    samples.push({ t: r4(t), a, c: sm.cams.pose(cam.id), ci: cam.id, e: env });
  }
  D.t = keepT; D.drive(0);

  const n = (sm.scene.take_count || 0) + 1, st = sm.stage;
  sm.scene.take_count = n;
  await base44.entities.StudioScene.update(sm.scene.id, { take_count: n });
  const take = await base44.entities.SceneTake.create({
    scene_id: sm.scene.id, scene_name: sm.scene.name, take_number: n, kind: 'final',
    name: `Take ${String(n).padStart(2, '0')} — Final · ${cast.map((a) => a.name).join(', ')}`,
    world: st.id, stage_name: st.name, stage_version: st.version, location: sm.scene.location, island_id: sm.scene.island_id,
    camera_id: cam.id, camera_name: cam.name, camera_mode: cam.mode, camera_snapshot: { ...cam, follow: { ...cam.follow } },
    env_start: st.env.start(), actors: cast.map((a) => a.id), cast, timeline: tl, status: 'capturing', render_settings: sm.cloud, local_quality: sm.e.qName,
    world_snapshot: st.snapshot(), duration: r4(dur),
  });
  let chunks = 0;
  for (let i = 0; i < samples.length; i += PER_CHUNK) {
    const s = samples.slice(i, i + PER_CHUNK);
    await base44.functions.invoke('uploadPerformanceChunk', { take_id: take.id, index: chunks++, start_t: s[0].t, end_t: s[s.length - 1].t, samples: s, events: [] });
  }
  return base44.entities.SceneTake.update(take.id, { status: 'captured', chunk_count: chunks, sample_count: samples.length, timing: { clock: 'director timeline (baked)', fps: FPS } });
}