import * as THREE from 'three';
import { groundAt, zoneAt } from './layout';
import { SPOTS } from './devSpots';
import { stepPlayer } from '../core/step';
import { followPose, followDefaults } from '../studio/CameraManager';
import { PerformanceRecorder } from '../studio/PerformanceRecorder';
import { PerformancePlayback } from '../studio/PerformancePlayback';

const H = 0.05, r3 = (v) => +v.toFixed(3);
const noInput = () => ({ move: { x: 0, y: 0 }, keys: new Set(), pressed: new Set(), clicks: [], wheel: 0, jump: false, sprint: false, walk: false, interact: false });

// Development-only harness (window.__realmTest). Drives the REAL realm controller, anchors, player controller,
// ground/collision and recorder in fixed 50 ms steps, synchronously, so a test doesn't depend on render FPS.
export function installRealmTest(R) {
  const e = R.e, P = () => e.player;
  const state = () => { const p = P(); return { x: r3(p.pos.x), y: r3(p.pos.y), z: r3(p.pos.z), yaw: r3(p.yaw), onGround: p.onGround, mode: p.anim.mode, sitting: !!p.sitting, zone: zoneAt(p.pos.x, p.pos.z, p.pos.y), prompt: R.anchors.cur?.verb || null, hidden: !!p.hidden }; };
  const t = { tSim: 0, spots: Object.keys(SPOTS), state, hoops: R.hoops, set: R.set };

  t.start = (name) => {
    const s = SPOTS[name]?.(R); if (!s) throw new Error(`No test spot "${name}"`);
    R.ctl.setMode('explore'); R.anchors.go = null;
    P().respawn({ x: s.x, z: s.z, y: s.y, yaw: s.yaw }); e.rig.yaw = s.yaw + Math.PI;
    t.step(0.2); // settle onto the ground
    return { spot: name, anchor: s.anchor ? { label: s.anchor.label, kind: s.anchor.kind, x: r3(s.anchor.x), y: r3(s.anchor.y), z: r3(s.anchor.z) } : null, ...state() };
  };

  // Simulate `sec` seconds. dir = world heading to walk (radians, same convention as player.yaw); interactAt = press E then.
  t.step = (sec, { dir = null, interactAt = null, onStep } = {}) => {
    const p = P(), tr = { maxDy: 0, minY: Infinity, maxY: -Infinity, airborne: 0, offGround: 0, nan: false };
    for (let i = 0, n = Math.round(sec / H); i < n; i++) {
      const inp = noInput(), y0 = p.pos.y;
      if (dir !== null) { inp.move.y = 1; e.rig.yaw = dir + Math.PI; }
      if (interactAt !== null && Math.abs(i * H - interactAt) < H / 2) inp.interact = true;
      const ctl = R.ctl.control(H, H, inp);
      if (!ctl?.move) stepPlayer(e, H, inp, false, false);
      t.tSim += H; R.ctl.tick(t.tSim, H);
      const dy = Math.abs(p.pos.y - y0), g = groundAt(p.pos.x, p.pos.z, p.pos.y);
      tr.maxDy = Math.max(tr.maxDy, dy); tr.minY = Math.min(tr.minY, p.pos.y); tr.maxY = Math.max(tr.maxY, p.pos.y);
      if (!p.onGround && !p.sitting) tr.airborne++;
      if (p.onGround && !p.sitting && Math.abs(p.pos.y - g) > 0.02) tr.offGround++;
      if (!Number.isFinite(p.pos.x + p.pos.y + p.pos.z)) tr.nan = true;
      onStep?.(i * H);
    }
    return { ...Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, typeof v === 'number' ? r3(v) : v])), ...state() };
  };

  // Is Krush in frame (and his head unobstructed) for a default studio static camera and a follow camera?
  t.framing = () => {
    const p = P(), a = { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw }, cam = new THREE.PerspectiveCamera(50, 16 / 9, 0.1, 3000);
    const st = new THREE.Vector3(a.x + Math.sin(a.yaw) * 6, a.y + 1.6, a.z + Math.cos(a.yaw) * 6), fp = followPose(followDefaults(), a);
    const shoot = (pos, look) => {
      cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
      const ndc = (y) => new THREE.Vector3(a.x, a.y + y, a.z).project(cam), head = ndc(1.6), feet = ndc(0.05);
      const target = new THREE.Vector3(a.x, a.y + 1.6, a.z), ray = new THREE.Raycaster(pos, target.clone().sub(pos).normalize(), 0.1, pos.distanceTo(target) - 0.3);
      const hit = ray.intersectObject(R.set.root, true).find((h) => h.object.visible);
      const inF = (v) => Math.abs(v.x) <= 1 && Math.abs(v.y) <= 1 && v.z < 1;
      return { headInFrame: inF(head), feetInFrame: inF(feet), headBlockedBy: hit ? hit.object.parent?.name || hit.object.name || 'set object' : null };
    };
    return { static: shoot(st, new THREE.Vector3(a.x, a.y + 1.4, a.z)), follow: shoot(fp.pos, fp.look) };
  };

  // Record with the studio's PerformanceRecorder on a test clock. No take id = nothing is uploaded or stored.
  t.record = (sec, opts) => {
    const rec = new PerformanceRecorder(e), env = e.stage.env.get();
    rec.actorId = 'krush'; rec.start();
    const cam = () => [...e.camera.position.toArray(), ...e.camera.quaternion.toArray(), e.camera.fov];
    let k = 0; const sample = (s) => { rec.t0 = performance.now() / 1000 - s; rec.sample(cam(), env, true); k++; };
    sample(0); const res = t.step(sec, { ...opts, onStep: (s) => sample(s + H) }); rec.active = false;
    t.lastRec = rec.buf;
    return { samples: rec.buf.length, uploadedChunks: rec.chunks, duration: r3(rec.buf.at(-1).t), end: res };
  };

  // Replay the last local recording through PerformancePlayback and compare against what was recorded.
  t.playback = async (checks = 10) => {
    const S = t.lastRec, pb = new PerformancePlayback(e); await pb.load(null, [{ index: 0, samples: S }]);
    const p = P(); p.respawn({ x: S[0].a.krush.p[0] + 3, z: S[0].a.krush.p[2], y: S[0].a.krush.p[1], yaw: 0 });
    let maxErr = 0; const path = [];
    for (let i = 0; i <= checks; i++) {
      const s = S[Math.round(((S.length - 1) * i) / checks)], tt = s.t, want = s.a.krush.p;
      pb.begin(); pb.t0 = performance.now() / 1000 - tt; pb.step(H);
      maxErr = Math.max(maxErr, Math.hypot(p.pos.x - want[0], p.pos.y - want[1], p.pos.z - want[2]));
      path.push([r3(p.pos.x), r3(p.pos.y), r3(p.pos.z), p.anim.mode]);
    }
    return { duration: r3(pb.duration), maxErr: r3(maxErr), path };
  };
  t.snapCam = () => { for (let i = 0; i < 60; i++) e.rig.third(H, noInput(), P()); return { mode: e.mode }; }; // settle the 3rd-person rig for a screenshot
  t.poseAt = (tt) => { const pb = new PerformancePlayback(e); pb.samples = t.lastRec; pb.duration = t.lastRec.at(-1).t; pb.i = 0; pb.begin(); pb.t0 = performance.now() / 1000 - tt; pb.step(H); return state(); };
  return t;
}