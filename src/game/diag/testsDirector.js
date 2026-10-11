import { E, wait, rd, d3, pos, result, qaScene, walk, face } from './testKit';

const until = async (fn, ms = 30000) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) return false; await wait(100); } return true; };

// Director pass: arm + control one actor at t=0, walk for `sec`, stop, wait until the clip is on the timeline.
async function pass(e, id, sec, probe) {
  const S = e.studio, D = S.dir, n = D.tl.clips.length, log = [];
  D.seek(0); D.setActor(id, { armed: true }); D.actors.control(id); face(e);
  await D.record();
  if (S.status !== 'capturing') return { error: S.error || `Recording did not start (${S.status})` };
  e.diag.script = walk(sec);
  const s0 = performance.now();
  while (performance.now() - s0 < sec * 1000) { await wait(200); if (probe) log.push(probe()); }
  e.diag.script = null;
  await S.stop();
  if (!(await until(() => D.tl.clips.length > n && S.status === 'idle'))) return { error: S.error || `Pass did not save (${S.status})` };
  return { clip: D.tl.clips.at(-1), log };
}

const expected = (D, clip, t) => D.pbs.get(clip.take_id)?.at(t - clip.start + clip.in).actors[clip.key]?.p;

// K: the primary acceptance test. Krush 10 s, rewind, Jay 10 s while Krush replays, then both play together and persist.
export async function testK(e) {
  const S = e.studio;
  if (e.hud.phase && e.hud.phase !== 'game') return result(false, { phase: e.hud.phase }, 'Enter the world first, then run this test.', true);
  await qaScene(S);
  const D = S.dir;
  D.load(null); D.addActor('jay'); await wait(500);
  const K = () => e.actors.krush, J = () => e.actors.jay;
  const kStart = pos(K());

  const a = await pass(e, 'krush', 10);
  if (a.error) return result(false, { step: 'Krush pass' }, a.error);
  const kEnd = pos(K());

  // Jay's pass: sample Krush's live replay against his saved performance at the same timeline time.
  await D.preload();
  const b = await pass(e, 'jay', 10, () => { const t = D.t, x = expected(D, a.clip, t); return { t, dev: x ? d3(pos(K()), x) : null, k: pos(K()) }; });
  if (b.error) return result(false, { step: 'Jay pass' }, b.error);
  const replay = b.log.filter((l) => l.dev != null), maxDev = Math.max(...replay.map((l) => l.dev));
  const krushMovedDuringJay = replay.length > 2 ? d3(replay[0].k, replay.at(-1).k) : 0;

  // Both together.
  D.tl.duration = Math.ceil(Math.max(a.clip.out, b.clip.out)) + 1;
  D.seek(0); await D.play();
  const k0 = pos(K()), j0 = pos(J()); await wait(5000);
  const k5 = pos(K()), j5 = pos(J()); D.pause();
  const both = { krush_moved_m: rd(d3(k0, k5), 2), jay_moved_m: rd(d3(j0, j5), 2) };

  // Persistence: re-read the scene from the server and rebuild the director from it.
  await S.saveScene();
  const fresh = (await E.StudioScene.filter({ id: S.scene.id }))[0];
  const perf = (fresh?.timeline?.clips || []).filter((c) => c.kind === 'perf');
  const persisted = perf.some((c) => c.take_id === a.clip.take_id && c.actor === 'krush') && perf.some((c) => c.take_id === b.clip.take_id && c.actor === 'jay');
  S.openScene(fresh); await D.preload(); D.seek(5); await wait(300);
  D.actors.control('krush');
  const reloadDev = { krush: rd(d3(pos(K()), expected(D, a.clip, 5)), 3), jay: rd(d3(pos(J()), expected(D, b.clip, 5)), 3) };

  const m = {
    krush_pass_s: rd(a.clip.out, 2), krush_walked_m: rd(d3(kStart, kEnd), 2), jay_pass_s: rd(b.clip.out, 2),
    krush_replay_samples_during_jay: replay.length, krush_replay_max_dev_m: rd(maxDev, 3), krush_moved_during_jay_m: rd(krushMovedDuringJay, 2),
    playback_both: both, persisted_both_clips: persisted, after_reload_dev_m: reloadDev,
  };
  const ok = a.clip.out > 9.5 && b.clip.out > 9.5 && replay.length >= 5 && maxDev < 0.25 && krushMovedDuringJay > 2
    && both.krush_moved_m > 2 && both.jay_moved_m > 2 && persisted && reloadDev.krush < 0.25 && reloadDev.jay < 0.25;
  return result(ok, m, 'Both passes ~10 s; Krush replays his take (≤0.25 m) while Jay records; both move together; both clips survive a server reload.');
}