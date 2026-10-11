import { base44 } from '@/api/base44Client';

export const E = base44.entities;
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const rd = (v, n = 3) => (v == null || !isFinite(v) ? null : +(+v).toFixed(n));
export const d3 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const pos = (p) => [p.pos.x, p.pos.y, p.pos.z];
export const result = (ok, m, note, inconclusive) => ({ status: inconclusive ? 'INCONCLUSIVE' : ok ? 'PASS' : 'FAIL', m, note });

// All mutating tests run inside one dedicated QA scene, never in production scenes.
export async function qaScene(S) {
  const id = localStorage.getItem('diag.qaScene');
  const s = id && (await E.StudioScene.filter({ id }))[0];
  if (s) S.openScene(s);
  else { await S.newScene('QA Diagnostics'); localStorage.setItem('diag.qaScene', S.scene.id); }
  if (!S.cams.list.length) S.addCamera();
  return S.scene;
}

export async function chunks(takeId) {
  return (await E.PerformanceChunk.filter({ take_id: takeId }, { sort: 'index', limit: 1000 })).items;
}

// Holds forward for `sec` seconds of real time from the first frame it is read.
export const walk = (sec, o = {}) => { let t0 = null; return (t) => { t0 ??= t; return t - t0 < sec ? { move: { x: 0, y: 1 }, ...o } : {}; }; };

// Point the camera rig so "forward" input moves Krush the way he is facing.
export const face = (e) => { e.rig.yaw = e.player.yaw + Math.PI; };

// Record with scripted input. `probe` runs every 100 ms; returns the take after Stop.
export async function take(e, sec, script, probe) {
  const S = e.studio, D = e.diag, t0 = performance.now(), log = [];
  await S.record();
  D.script = script;
  const s0 = performance.now();
  while (performance.now() - s0 < sec * 1000) { await wait(100); if (probe) log.push(probe()); }
  D.script = null;
  const wall = (performance.now() - t0) / 1000;
  await S.stop();
  return { take: S.take, status: S.status, wall, recT: S.rec.t, log };
}