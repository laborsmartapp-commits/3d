import { followPose } from '../studio/CameraManager';
import { net } from '../studio/net';

const r = (v, d = 2) => (v == null || !isFinite(v) ? '—' : +(+v).toFixed(d));
const v3 = (v) => `${r(v.x, 1)}, ${r(v.y, 1)}, ${r(v.z, 1)}`;
const deg = (a) => r((a * 180) / Math.PI, 1);
const ago = (t) => (t ? `${r((Date.now() - t) / 1000, 1)} s ago` : 'never');

// Snapshot of every live measurement, grouped by dashboard section. Called ~2×/s while diagnostics are on.
export function metrics(D) {
  const e = D.e, S = e.studio, R = S.rec, P = S.play, p = e.player, ft = D.ft, warnings = [];
  const avgMs = ft.length ? ft.reduce((a, b) => a + b, 0) / ft.length : 0;
  const wall = (performance.now() - D.wallT0) / 1000;
  const minFps = ft.length ? 1000 / Math.max(...ft) : 0;
  if (D.throttle && e.fps < D.target * 0.8) warnings.push(`Browser cannot hold the ${D.target} fps target (measured ${e.fps} fps). Low-FPS results are NOT a valid ${D.target} fps test.`);
  if (performance.now() - D.behindAt < 3000) warnings.push(`Simulation fell behind: frames longer than 1 s were capped. ${r(D.dropped, 2)} s of real time not simulated.`);
  if (avgMs > 250) warnings.push('Average frame time is above 250 ms. Movement stays time-accurate, but collisions and footage get coarse.');

  const camId = S.recCamId || S.cams.selId, cc = camId && S.cams.get(camId), cam = cc && S.cams.cam(camId);
  let camera = { 'Active camera': 'none' };
  if (cam) {
    const a = S.cams.actor(), f = cc.mode === 'follow', t = f ? followPose(cc.follow, a) : null;
    camera = {
      'Active camera': cc.name, Mode: cc.mode, Position: v3(cam.position),
      'Rotation (pitch/yaw/roll °)': `${deg(cam.rotation.x)}, ${deg(cam.rotation.y)}, ${deg(cam.rotation.z)}`,
      'Follow target': f ? cc.follow.target : '—',
      'Follow distance (m)': f ? r(Math.hypot(cam.position.x - a.x, cam.position.y - a.y, cam.position.z - a.z)) : '—',
      'Tracking error (m)': f ? r(cam.position.distanceTo(t.pos), 3) : '—',
      Smoothing: f ? (cc.follow.rigid ? 'rigid' : `pos ${cc.follow.posSmooth} / rot ${cc.follow.rotSmooth}`) : '—',
      'Field of view (°)': r(cam.fov, 1),
    };
  }

  let pbErr = '—', animSync = '—', camSync = '—';
  if (S.status === 'playing' && P.samples.length) {
    const s = P.at(P.t), k = s.krush;
    pbErr = r(Math.hypot(p.pos.x - k.p[0], p.pos.y - k.p[1], p.pos.z - k.p[2]), 3);
    animSync = p.anim.mode === k.m ? 'in sync' : `mismatch (${p.anim.mode} vs ${k.m})`;
    camSync = r(P.cam.position.distanceTo({ x: s.c.p[0], y: s.c.p[1], z: s.c.p[2] }), 3) + ' m';
  }
  const rec = S.status === 'capturing' || S.status === 'uploading' || S.status === 'pending' || S.status === 'review';
  const pending = rec ? Math.max(0, R.chunks - R.sent - R.unsent.length) : 0;

  return {
    warnings,
    Performance: {
      'Current FPS': e.fps, 'Average FPS': r(avgMs ? 1000 / avgMs : 0, 1), 'Minimum FPS': r(minFps, 1), 'Frame time (ms)': r(avgMs, 1),
      'Target FPS': D.throttle ? D.target : 'unlimited', 'Recording time (s)': rec ? r(R.t) : '—',
      'Wall time since reset (s)': r(wall, 1), 'Simulated time (s)': r(D.simT, 1), 'Steps this frame': D.steps,
      'Accumulated lag (s)': r(wall - D.simT - D.dropped, 2), 'Dropped time (s)': r(D.dropped, 2),
      'Speed (m/s)': r(Math.hypot(p.vel.x, p.vel.z)), Position: v3(p.pos), 'Distance traveled (m)': r(D.dist, 1),
    },
    Recording: {
      Scene: S.scene?.name || 'none', 'Active take': S.take?.name || '—', Status: S.status, 'Duration (s)': rec ? r(R.t) : '—',
      Samples: rec ? R.count : '—', 'Sample rate (Hz)': rec && R.t ? r(R.count / R.t, 1) : '—', 'Largest gap (ms)': rec ? Math.round(R.maxGap * 1000) : '—',
      'Animation changes': rec ? R.nAnim : '—', 'Environment events': rec ? R.nEnv : '—', 'Camera transforms': rec ? R.count : '—',
    },
    Camera: camera,
    Sync: {
      'Chunks (take)': rec ? R.chunks : '—', Uploaded: rec ? R.sent : '—', Pending: pending, 'Failed (kept on device)': rec ? R.unsent.length : '—',
      'Retry attempts (session)': net.retries, 'Failed uploads (session)': net.failed, 'Last server sync': ago(net.lastSync),
      'Take persistence': S.status === 'review' ? 'saved on server' : S.status === 'pending' ? 'NOT saved — pending upload' : S.status,
      'Last sync error': net.lastError || 'none', 'Upload fault injection': net.failUploads ? 'ON' : 'off',
    },
    Playback: {
      'Duration (s)': S.status === 'playing' ? r(P.duration) : '—', 'Elapsed (s)': S.status === 'playing' ? r(P.t) : '—',
      Position: S.status === 'playing' ? v3(p.pos) : '—', 'Position error (m)': pbErr, Animation: animSync, Camera: camSync,
    },
  };
}