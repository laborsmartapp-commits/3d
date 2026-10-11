import { wait, rd, d3, result, qaScene, chunks, walk, face, take } from './testKit';
import { followPose } from '../studio/CameraManager';

const qDiff = (a, b) => 1 - Math.abs(a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6]);

export async function testC(e) {
  const S = e.studio; await qaScene(S); face(e);
  S.addCamera(); const id = S.cams.selId; // 6 m in front of Krush, facing him
  await wait(300);
  const p0 = S.cams.pose(id), a0 = S.cams.actor(), dStart = Math.hypot(p0[0] - a0.x, p0[2] - a0.z);
  const r = await take(e, 3, walk(2.5, { walk: true }), () => S.cams.pose(id));
  const a1 = S.cams.actor(), dEnd = Math.hypot(p0[0] - a1.x, p0[2] - a1.z);
  let liveDev = 0, rot = 0; for (const q of r.log) { liveDev = Math.max(liveDev, d3(q, p0)); rot = Math.max(rot, qDiff(q, p0)); }
  let recDev = 0, pbDev = 0;
  if (r.status === 'review') {
    const samples = (await chunks(r.take.id)).flatMap((c) => c.samples);
    for (const s of samples) recDev = Math.max(recDev, d3(s.c, p0));
    await S.play.load(r.take);
    for (let t = 0; t < S.play.duration; t += 0.25) pbDev = Math.max(pbDev, d3(S.play.at(t).c.p, p0));
    await S.discardTake();
  }
  S.deleteCamera(id);
  const m = { start_distance_m: rd(dStart, 2), end_distance_m: rd(dEnd, 2), live_position_drift_m: rd(liveDev, 4), live_rotation_drift: rd(rot, 6), recorded_drift_m: rd(recDev, 4), playback_drift_m: rd(pbDev, 4) };
  const ok = r.status === 'review' && dEnd < dStart - 1 && liveDev < 0.001 && rot < 1e-6 && recDev < 0.001 && pbDev < 0.001;
  return result(ok, m, 'Krush walks toward a stationary camera. Its transform must stay constant live, in the saved data, and in playback.');
}

export async function testD(e) {
  const S = e.studio, p = e.player; await qaScene(S); face(e);
  S.addCamera(); const id = S.cams.selId;
  S.editCamera(id, (c) => { Object.assign(c, { x: p.pos.x - Math.sin(p.yaw) * 8, y: p.pos.y + 3, z: p.pos.z - Math.cos(p.yaw) * 8 }); S.cams.aimAtActor(c); });
  await wait(300);
  S.editCamera(id, (c) => { c.mode = 'follow'; });
  await wait(600);
  const c = S.cams.get(id), f = c.follow, target = Math.hypot(f.fwd, f.side, f.up), before = S.cams.pose(id);
  const r = await take(e, 4, walk(3), () => {
    const cam = S.cams.cam(id).position, a = S.cams.actor();
    return { t: S.rec.last, pose: S.cams.pose(id), fd: Math.hypot(cam.x - a.x, cam.y - a.y, cam.z - a.z), err: cam.distanceTo(followPose(f, a).pos) };
  });
  const fds = r.log.map((x) => x.fd), errs = r.log.map((x) => x.err);
  let jump = null, replay = 0;
  if (r.status === 'review') {
    const samples = (await chunks(r.take.id)).flatMap((ch) => ch.samples);
    jump = d3(samples[0].c, before);
    await S.play.load(r.take);
    for (const x of r.log) if (x.t > 0 && x.t < S.play.duration) replay = Math.max(replay, d3(S.play.at(x.t).c.p, x.pose));
    await S.discardTake();
  }
  S.deleteCamera(id);
  const m = { target_follow_distance_m: rd(target, 2), min_distance_m: rd(Math.min(...fds), 2), max_distance_m: rd(Math.max(...fds), 2), max_tracking_error_m: rd(Math.max(...errs), 3), smoothing: `pos ${f.posSmooth} / rot ${f.rotSmooth}`, jump_at_record_start_m: rd(jump, 4), max_replay_error_m: rd(replay, 3) };
  const ok = r.status === 'review' && jump < 0.05 && m.max_tracking_error_m < 2.5 && Math.abs(m.min_distance_m - target) < 2.5 && Math.abs(m.max_distance_m - target) < 2.5 && replay < 0.15;
  return result(ok, m, 'Pass: no jump at start (<5 cm), distance within 2.5 m of target while smoothing, replayed transform within 15 cm of live.');
}