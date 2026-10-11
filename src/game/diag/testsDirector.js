import { E, wait, rd, d3, pos, result, qaScene, walk, face } from './testKit';

const until = async (fn, ms = 30000) => { const t0 = performance.now(); while (!fn()) { if (performance.now() - t0 > ms) return false; await wait(100); } return true; };

// Director pass: arm + control one actor at t=0, walk for `sec`, stop, wait until the clip is on the timeline.
async function pass(e, id, sec, probe) {
  const S = e.studio, D = S.dir, n = D.tl.clips.length, log = [];
  D.seek(0); D.setActor(id, { armed: true }); D.actors.control(id); face(e);
  await D.record();
  if (S.status !== 'capturing') return { error: S.error || `Recording did not start (${S.status})` };
  // The timeline stops the pass itself at exactly `sec` (stop marker), so the take length is measured on the
  // recording clock, not on the test's setTimeout loop (which runs late when frames are slow).
  D.stopAt = sec; e.diag.script = walk(sec + 2);
  const s0 = performance.now(); let gap = 0, last = s0;
  while (S.status === 'capturing' && performance.now() - s0 < (sec + 20) * 1000) { await wait(100); const n2 = performance.now(); gap = Math.max(gap, n2 - last); last = n2; if (probe) log.push(probe()); }
  const wall = (performance.now() - s0) / 1000;
  e.diag.script = null; D.stopAt = null;
  if (S.status === 'capturing') await S.stop();
  if (!(await until(() => D.tl.clips.length > n && S.status === 'idle'))) return { error: S.error || `Pass did not save (${S.status})` };
  const clip = D.tl.clips.at(-1);
  return { clip, log, timing: { requested_s: sec, recorded_s: rd(clip.out, 3), overshoot_s: rd(clip.out - sec, 3), test_loop_wall_s: rd(wall, 2), worst_test_tick_gap_ms: Math.round(gap) } };
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

  // Dances: Krush at 5 s, Jay at 7 s. Check layer onset at the exact timestamps and that the movement path is untouched.
  D.addAnim('krush', 'dance', 6, 5); D.addAnim('jay', 'wave', 6, 7);
  const layerAt = (id, t) => { D.seek(t); return (e.actors[id].anim.layers || []).find((l) => l.mode === (id === 'krush' ? 'dance' : 'wave')); };
  const dance = {
    krush_before_5: !!layerAt('krush', 4.98), krush_at_5_05: !!layerAt('krush', 5.05), jay_before_7: !!layerAt('jay', 6.98), jay_at_7_05: !!layerAt('jay', 7.05),
    krush_full_weight_6: rd(layerAt('krush', 6)?.w || 0, 2),
  };
  D.seek(8); dance.krush_path_dev_at_8_m = rd(d3(pos(K()), expected(D, a.clip, 8)), 3);
  await S.saveScene();
  const f2 = (await E.StudioScene.filter({ id: S.scene.id }))[0];
  dance.persisted = (f2?.timeline?.clips || []).filter((c) => c.kind === 'anim').length === 2;
  const danceOk = !dance.krush_before_5 && dance.krush_at_5_05 && !dance.jay_before_7 && dance.jay_at_7_05 && dance.krush_full_weight_6 === 1 && dance.krush_path_dev_at_8_m < 0.25 && dance.persisted;

  const m = {
    krush_pass: a.timing, jay_pass: b.timing, dance, krush_walked_m: rd(d3(kStart, kEnd), 2),
    krush_replay_samples_during_jay: replay.length, krush_replay_max_dev_m: rd(maxDev, 3), krush_moved_during_jay_m: rd(krushMovedDuringJay, 2),
    playback_both: both, persisted_both_clips: persisted, after_reload_dev_m: reloadDev,
  };
  const ok = Math.abs(a.clip.out - 10) < 0.5 && Math.abs(b.clip.out - 10) < 0.5 && replay.length > 10 && maxDev < 0.25 && krushMovedDuringJay > 2
    && both.krush_moved_m > 2 && both.jay_moved_m > 2 && persisted && reloadDev.krush < 0.25 && reloadDev.jay < 0.25 && danceOk;
  // Too few replay probes means the browser was too slow to judge, not that the feature failed.
  const slow = replay.length <= 10 && maxDev < 0.25;
  return result(ok, m, 'Passes 10 s ±0.5; Krush replays (>10 probes, ≤0.25 m) while Jay records; both move together; clips persist; dances start at 5 s / 7 s without moving the path.', !ok && slow);
}