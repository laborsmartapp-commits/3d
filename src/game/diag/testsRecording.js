import { E, wait, rd, d3, pos, result, qaScene, chunks, walk, face, take } from './testKit';
import { deleteTake } from '../studio/takeOps';

export async function testA(e) {
  const S = e.studio; await qaScene(S); face(e);
  const r = await take(e, 10, walk(4, { walk: true }));
  if (r.status !== 'review') return result(false, { status: r.status }, `Take did not save: ${S.error}`);
  const ch = await chunks(r.take.id), last = ch.at(-1)?.samples.at(-1)?.t;
  await S.play.load(r.take);
  const m = { real_elapsed_s: rd(r.wall), timeline_s: rd(r.recT), final_sample_s: rd(last), saved_duration_s: rd(r.take.duration), playback_duration_s: rd(S.play.duration) };
  const tol = 0.15, ok = [m.timeline_s, m.final_sample_s, m.saved_duration_s, m.playback_duration_s].every((v) => Math.abs(v - m.real_elapsed_s) <= tol);
  return result(ok, m, `Every duration must be within ±${tol}s of real elapsed time.`);
}

export async function testB(e) {
  const S = e.studio, D = e.diag, p = e.player; await qaScene(S);
  const start = { x: p.pos.x, z: p.pos.z, yaw: p.yaw };
  const run = async (throttle) => {
    p.teleport(start.x, start.z); p.yaw = start.yaw; e.rig.yaw = start.yaw + Math.PI;
    await wait(900);
    D.setThrottle(throttle);
    await wait(700);
    const p0 = pos(p), fps = []; let dist = 0, last = p0;
    const r = await take(e, 4.6, walk(4), () => { const c = pos(p); dist += Math.hypot(c[0] - last[0], c[2] - last[2]); last = c; fps.push(e.fps); return c; });
    D.setThrottle(false);
    const p1 = pos(p), dx = p1[0] - p0[0], dz = p1[2] - p0[2];
    if (r.status === 'review' || r.status === 'pending') await S.discardTake();
    return { distance_m: rd(dist, 2), displacement_m: rd(Math.hypot(dx, dz), 2), heading_deg: rd((Math.atan2(dx, dz) * 180) / Math.PI, 1), avg_speed_ms: rd(dist / 4, 2), measured_fps: rd(fps.reduce((a, b) => a + b, 0) / fps.length, 1), final: p1.map((v) => rd(v, 2)) };
  };
  const a = await run(false), b = await run(true);
  const pct = (Math.abs(b.distance_m - a.distance_m) / a.distance_m) * 100, endGap = d3(a.final, b.final);
  const valid = b.measured_fps >= 12 && b.measured_fps <= 18.5;
  const m = { normal: a, simulated_15fps: b, distance_diff_pct: rd(pct, 2), final_position_gap_m: rd(endGap, 2), heading_diff_deg: rd(Math.abs(a.heading_deg - b.heading_deg), 1) };
  return result(pct < 2 && endGap < 1, m, valid ? 'Pass: distance within 2% and end points within 1 m, same 4 s scripted input.' : `Throttled run measured ${b.measured_fps} fps, not ~15. Not a valid 15 fps test.`, !valid);
}

export async function testE(e) {
  const S = e.studio, p = e.player; await qaScene(S); face(e);
  const r = await take(e, 4, walk(3), () => ({ t: S.rec.last, p: pos(p) }));
  if (r.status !== 'review') return result(false, { status: r.status }, `Take did not save: ${S.error}`);
  const t = r.take; S.endTake();
  await S.playTake(t);
  const pb = [];
  while (S.status === 'playing' || S.status === 'loading') { await wait(100); if (S.status === 'playing') pb.push({ t: S.play.t, p: pos(p) }); }
  const live = r.log.filter((x) => x.t >= 0);
  let maxErr = 0, n = 0;
  for (const s of pb) {
    const i = live.findIndex((x) => x.t > s.t); if (i < 1) continue;
    const a = live[i - 1], b = live[i], k = (s.t - a.t) / (b.t - a.t || 1);
    maxErr = Math.max(maxErr, d3(s.p, a.p.map((v, j) => v + (b.p[j] - v) * k))); n++;
  }
  await deleteTake(t);
  const m = { compared_points: n, max_position_error_m: rd(maxErr), take_duration_s: rd(t.duration), playback_duration_s: rd(S.play.duration) };
  const ok = n > 10 && maxErr < 0.2 && Math.abs(m.take_duration_s - m.playback_duration_s) < 0.05;
  return result(ok, m, 'Live positions vs played-back positions at matching scene-clock times. Pass: under 0.2 m, durations within 0.05 s.');
}

export async function testF(e) {
  const S = e.studio; const qa = await qaScene(S);
  const before = await E.SceneTake.count({});
  const r = await take(e, 1.5, null);
  if (r.status !== 'review') return result(false, { status: r.status }, `Take did not save: ${S.error}`);
  const id = r.take.id;
  await S.discardTake();
  const m = {
    take_remaining: (await E.SceneTake.filter({ id })).length, chunks_remaining: (await chunks(id)).length,
    render_jobs: (await E.RenderJob.filter({ take_id: id })).length, local_unsent: S.rec.unsent.length, local_buffer: S.rec.buf.length,
    total_takes_before: before, total_takes_after: await E.SceneTake.count({}), qa_scene_intact: (await E.StudioScene.filter({ id: qa.id })).length === 1,
  };
  const ok = !m.take_remaining && !m.chunks_remaining && !m.render_jobs && !m.local_unsent && !m.local_buffer && m.total_takes_before === m.total_takes_after && m.qa_scene_intact;
  return result(ok, m, 'Discard must remove the take, chunks and local buffers, and nothing else.');
}