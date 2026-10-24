import * as THREE from 'three';
import { groundAt } from './layout';
import { makeArmRig, POSES } from '../studio/shotPose';
import { lerpAngle } from '../core/noise';

const BALL_R = 0.12, G = 9.8, SHOT_DIST = 4.0, MAKE_CHANCE = 0.7;
const ease = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };
const span = (t, a, b) => ease((t - a) / (b - a));

// Living Realm basketball: E on the ball walks over, picks it up, carries it to the shooting spot
// facing the nearest hoop and shoots a real arc at the rim; the ball then bounces and rolls to rest.
export class Hoops {
  constructor(R) { this.R = R; this.e = R.e; this.phase = null; this.ballSim = null; this.rigs = new WeakMap(); }
  get active() { return !!this.phase; }

  hoopFor(ball) {
    let best = null, bd = Infinity;
    for (const o of this.R.set.list) {
      if (o.type !== 'basketball_hoop' || o.hidden || !o.node.visible) continue;
      const d = Math.hypot(o.x - ball.x, o.z - ball.z); if (d < bd) { bd = d; best = o; }
    }
    if (!best) return null;
    const f = new THREE.Vector3(Math.sin(best.ry), 0, Math.cos(best.ry)), rim = new THREE.Vector3(best.x, best.y + 3.05 * best.sy, best.z).addScaledVector(f, 0.35 * best.sz);
    return { rim, face: f, r: 0.23 * best.sx };
  }

  candidates() {
    if (this.phase) return [];
    return this.R.set.list.filter((o) => o.type === 'basketball' && !o.hidden && o.node.visible && !(this.ballSim?.o === o)).flatMap((o) => {
      const c = { label: o.name || 'Basketball', x: o.x, y: o.y, z: o.z, r: 1.7 };
      const dribble = { ...c, key: `${o.id}|dribble`, verb: 'Dribble', act: () => this.start(o, 'dribble') };
      return this.hoopFor(o) ? [{ ...c, key: `${o.id}|shoot`, verb: 'Pick Up & Shoot', act: () => this.start(o) }, dribble] : [dribble];
    });
  }

  start(o, mode = 'shoot') {
    const p = this.e.player, hoop = this.hoopFor(o); if (!hoop && mode === 'shoot') return;
    const dx = p.pos.x - o.x, dz = p.pos.z - o.z, d = Math.hypot(dx, dz) || 1;
    let spot = null;
    if (hoop) { spot = hoop.rim.clone().addScaledVector(hoop.face, SHOT_DIST); spot.y = groundAt(spot.x, spot.z, p.pos.y + 0.5); this.e.colliders?.resolve(spot, 0.35, spot.y + 0.5); }
    this.shot = { o, hoop, spot, mode, ph: 0.12, yaw: spot ? Math.atan2(hoop.rim.x - spot.x, hoop.rim.z - spot.z) : 0, t: 0, ball: new THREE.Vector3(o.x, o.y + BALL_R * o.sy, o.z), from: null };
    this.phase = 'fetch'; this.go = { x: o.x + (dx / d) * 0.45, z: o.z + (dz / d) * 0.45, yaw: Math.atan2(-dx, -dz) };
    p.sitting = null;
  }

  // Moving during the walk-up cancels; a carried ball is dropped where it is.
  cancel() {
    const s = this.shot; if (!s) return;
    if (this.phase !== 'fetch' && !this.ballSim) { const n = s.o.node.position; this.ballSim = { o: s.o, pos: new THREE.Vector3(n.x, n.y + BALL_R * s.o.sy, n.z), vel: new THREE.Vector3() }; }
    this.phase = null;
  }

  rig(p) { if (!p.glbModel) return null; if (!this.rigs.has(p.glbModel)) this.rigs.set(p.glbModel, makeArmRig(p.glbModel)); return this.rigs.get(p.glbModel); }

  // Where the ball sits for the current pose: between the hands, or above the shooting hand.
  holdPoint(p, rig, over) {
    const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)), out = new THREE.Vector3();
    if (!rig) return out.copy(p.pos).add(new THREE.Vector3(0, over ? 2.0 : 1.0, 0)).addScaledVector(fwd, over ? 0.15 : 0.35);
    p.glbModel.updateMatrixWorld(true);
    if (over) return rig.hand(rig.R, out).addScaledVector(fwd, 0.04).add(new THREE.Vector3(0, BALL_R, 0));
    const l = rig.hand(rig.L, new THREE.Vector3()); return rig.hand(rig.R, out).add(l).multiplyScalar(0.5).addScaledVector(fwd, 0.1);
  }

  // One dribble cycle (ph 0–1): palm contact and push (0–0.12), ball drops faster and faster to the floor
  // ahead of the right foot (0.12–0.45), bounces and slows as it rises back into the hand (0.45–1).
  dribble(dt) {
    const p = this.e.player, s = this.shot, rig = this.rig(p), v = p.anim.speed || 0;
    s.ph = (s.ph + dt / (v > 0.15 ? Math.max(0.36, 0.5 - v * 0.03) : 0.6)) % 1;
    const f = s.ph, k = f < 0.18 ? ease(f / 0.18) : f < 0.7 ? 1 - ease((f - 0.18) / 0.52) : 0;
    rig?.apply(p.yaw, POSES.dribbleUp, POSES.dribbleDown, k);
    const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw)), right = new THREE.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
    const hand = rig ? rig.hand(rig.R, new THREE.Vector3()) : p.pos.clone().add(new THREE.Vector3(0, 1.0 - 0.2 * k, 0)).addScaledVector(fwd, 0.3).addScaledVector(right, 0.3);
    const top = hand.addScaledVector(fwd, 0.03); top.y -= BALL_R * 1.1;
    const F = p.pos.clone().addScaledVector(fwd, 0.3 + Math.min(v, 6) * 0.07).addScaledVector(right, 0.28); F.y = groundAt(F.x, F.z, p.pos.y + 0.5) + BALL_R * s.o.sy;
    let b = top;
    if (f >= 0.12 && f < 0.45) { const u = (f - 0.12) / 0.33; b = top.clone().lerp(F, u); b.y = top.y + (F.y - top.y) * (0.45 * u + 0.55 * u * u); }
    else if (f >= 0.45) { const u = (f - 0.45) / 0.55; b = F.clone().lerp(top, u); b.y = F.y + (top.y - F.y) * (1.6 * u - 0.6 * u * u); }
    s.o.node.rotation.x -= dt * (3 + v * 2);
    this.place(s.o, b);
  }

  // Free dribbling: runs after the player's normal movement so the arm pose sits on top of the walk cycle.
  post(dt) { if (this.phase === 'dribble') this.dribble(dt); }

  // From free dribbling: turn to the nearest hoop and shoot from here.
  shootHere() {
    const p = this.e.player, s = this.shot, hoop = this.hoopFor(p.pos);
    if (!hoop || Math.hypot(hoop.rim.x - p.pos.x, hoop.rim.z - p.pos.z) > 9) { this.e.notify?.('Get closer to the hoop to shoot'); return; }
    Object.assign(s, { hoop, yaw: Math.atan2(hoop.rim.x - p.pos.x, hoop.rim.z - p.pos.z), t: 0 });
    this.gather(); this.phase = 'shoot';
  }
  gather() { const s = this.shot, n = s.o.node.position; s.from = new THREE.Vector3(n.x, n.y + BALL_R * s.o.sy, n.z); }

  update(dt, walk) {
    const p = this.e.player, s = this.shot, rig = this.rig(p);
    if (this.phase === 'fetch') {
      if (walk(this.go, dt)) { this.phase = 'pickup'; s.t = 0; s.from = s.ball.clone(); }
      this.place(s.o, s.ball);
      return;
    }
    s.t += dt; p.vel.set(0, 0, 0);
    if (this.phase === 'carry') {
      const there = walk({ x: s.spot.x, z: s.spot.z, yaw: s.yaw }, dt);
      this.dribble(dt);
      if (there) { this.phase = 'shoot'; s.t = 0; this.gather(); }
      return;
    }
    Object.assign(p.anim, { mode: 'idle', speed: 0 }); p.anim.t += dt; p.finish(dt, false);
    if (this.phase === 'shoot') p.yaw = lerpAngle(p.yaw, s.yaw, 1 - Math.exp(-dt * 14));
    if (this.phase === 'pickup') {
      const k = span(s.t, 0, 0.45);
      rig?.apply(p.yaw, POSES.reach, POSES.carry, span(s.t, 0.2, 0.55), Math.min(1, s.t / 0.15));
      this.place(s.o, s.from.clone().lerp(this.holdPoint(p, rig), k));
      if (s.t > 0.6) { this.phase = s.mode === 'dribble' ? 'dribble' : 'carry'; s.t = 0; }
      return;
    }
    // Shot: dip and gather (0–0.4s), jump (0.4–1.0s), release at the top (0.72s), follow-through, land.
    const t = s.t, lift = t > 0.4 && t < 1.0 ? Math.sin(((t - 0.4) / 0.6) * Math.PI) * 0.32 : 0, dip = t < 0.4 ? -Math.sin((t / 0.4) * Math.PI) * 0.07 : 0;
    p.h.root.position.y += lift + dip;
    const fade = 1 - span(t, 1.25, 1.6);
    if (t < 0.6) rig?.apply(p.yaw, POSES.dribbleUp, POSES.set, span(t, 0, 0.4), fade);
    else rig?.apply(p.yaw, POSES.set, POSES.release, span(t, 0.6, 0.74), fade);
    if (!this.ballSim) {
      // Gather the ball off the dribble into both hands, then up over the shooting hand.
      const hold = this.holdPoint(p, rig, t > 0.25);
      this.place(s.o, t < 0.25 ? s.from.clone().lerp(hold, span(t, 0, 0.25)) : hold);
      if (t >= 0.72) this.launch(s, hold);
    }
    if (t > 1.6) { this.phase = null; p.finish(0, false); }
  }

  launch(s, from) {
    const make = Math.random() < MAKE_CHANCE, to = s.hoop.rim.clone();
    if (!make) to.addScaledVector(s.hoop.face, s.hoop.r * 1.05).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 0, (Math.random() - 0.5) * 0.2));
    const T = 0.95 + from.distanceTo(to) * 0.06, v = to.clone().sub(from).divideScalar(T); v.y += 0.5 * G * T;
    this.ballSim = { o: s.o, from, v, T, t: 0, make, to, hoop: s.hoop, pos: from.clone(), vel: null };
  }

  // Ball flight (runs on after the player is free again).
  tickBall(dt) {
    const b = this.ballSim; if (!b) return;
    b.t += dt;
    if (!b.vel) {
      const t = Math.min(b.t, b.T); b.pos.copy(b.from).addScaledVector(b.v, t); b.pos.y -= 0.5 * G * t * t;
      if (b.t >= b.T) {
        const v = b.v.clone(); v.y -= G * b.T;
        if (b.make) { b.vel = new THREE.Vector3(v.x * 0.12, -2.2, v.z * 0.12); this.e.notify?.('Swish!'); }
        else { b.vel = new THREE.Vector3(-v.x * 0.35 + (Math.random() - 0.5), Math.abs(v.y) * 0.45 + 0.8, -v.z * 0.35 + (Math.random() - 0.5)); this.e.notify?.('Off the rim'); }
      }
    } else {
      b.vel.y -= G * dt; b.pos.addScaledVector(b.vel, dt);
      this.e.colliders?.resolve(b.pos, BALL_R, b.pos.y);
      const g = groundAt(b.pos.x, b.pos.z, b.pos.y + 0.3) + BALL_R * b.o.sy;
      if (b.pos.y < g) {
        b.pos.y = g; b.vel.y = Math.abs(b.vel.y) > 0.8 ? -b.vel.y * 0.62 : 0; b.vel.x *= 0.82; b.vel.z *= 0.82;
        if (!b.vel.y) { const f = Math.exp(-1.6 * dt); b.vel.x *= f; b.vel.z *= f; if (Math.hypot(b.vel.x, b.vel.z) < 0.05) { this.place(b.o, b.pos, true); this.ballSim = null; return; } }
      }
    }
    b.o.node.rotation.x -= dt * 9;
    this.place(b.o, b.pos);
  }

  // Moves the ball set piece so its centre is at c; rest also updates where it lies for the next pick-up.
  place(o, c, rest) {
    o.node.position.set(c.x, c.y - BALL_R * o.sy, c.z);
    if (rest) { o.x = c.x; o.y = c.y - BALL_R * o.sy; o.z = c.z; o.node.rotation.set(o.rx, o.ry, o.rz); }
  }
}