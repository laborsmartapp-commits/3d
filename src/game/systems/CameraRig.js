import * as THREE from 'three';
import { clamp, lerp } from '../core/noise';
import { SPAWN } from '../world/layout';

const tv = new THREE.Vector3(), td = new THREE.Vector3(), tq = new THREE.Quaternion();

export class CameraRig {
  constructor(e) {
    this.e = e;
    this.cam = e.camera;
    this.yaw = SPAWN.camYaw; this.pitch = 0.3; this.dist = 7; this.cur = 7;
    this.minDist = 2.2; this.maxDist = 18; this.height = 1.55; this.smooth = 10; this.rotSpeed = 1; this.colRadius = 0.35;
    this.target = new THREE.Vector3();
    this.ray = new THREE.Raycaster();
    this.ray.camera = this.cam;
    this.free = { pos: new THREE.Vector3(), yaw: 0, pitch: 0, speed: 25 };
    this.bld = { focus: new THREE.Vector3(), yaw: 0.6, pitch: 0.95, dist: 55 };
    this.photo = { focus: new THREE.Vector3(), yaw: 0, pitch: 0.3, dist: 8 };
    this.blend = null;
    this.frame = 0;
    this.lastHit = 0;
  }

  dirFrom(yaw, pitch, out) { const cp = Math.cos(pitch); return out.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp); }
  startBlend(dur = 1) { this.blend = { pos: this.cam.position.clone(), q: this.cam.quaternion.clone(), t: 0, dur }; }
  applyBlend(dt) {
    if (!this.blend) return;
    const b = this.blend;
    b.t += dt / b.dur;
    const k = b.t >= 1 ? 1 : b.t * b.t * (3 - 2 * b.t);
    tq.copy(this.cam.quaternion);
    this.cam.position.lerpVectors(b.pos, this.cam.position, k);
    this.cam.quaternion.copy(b.q).slerp(tq, k);
    if (b.t >= 1) this.blend = null;
  }

  orbit(inp, yawK = 0.005, pMin = -0.3, pMax = 1.25, obj = this) {
    if (inp.drag) { obj.yaw -= inp.drag.x * yawK * this.rotSpeed; obj.pitch = clamp(obj.pitch + inp.drag.y * 0.004 * this.rotSpeed, pMin, pMax); }
  }

  thirdPos(p, out) { this.dirFrom(this.yaw, this.pitch, td); return out.set(p.x, p.y + this.height, p.z).addScaledVector(td, this.dist); }

  third(dt, inp, player) {
    this.orbit(inp);
    if (inp.wheel) this.dist = clamp(this.dist * (1 + inp.wheel * 0.001), this.minDist, this.maxDist);
    const p = player.pos;
    tv.set(p.x, p.y + (player.sitting ? 1.0 : player.swimming ? 0.6 : this.height), p.z);
    this.target.lerp(tv, 1 - Math.exp(-dt * this.smooth));
    if (this.target.distanceTo(tv) > 20) this.target.copy(tv);
    const dir = this.dirFrom(this.yaw, this.pitch, td);
    const want = this.dist * (player.sitting ? 1.3 : 1);
    let allowed = want;
    for (let i = 1; i <= 14; i++) {
      const d = (want * i) / 14;
      if (this.target.y + dir.y * d < this.e.groundAt(this.target.x + dir.x * d, this.target.z + dir.z * d) + 0.35) { allowed = Math.max(0.8, d - 0.6); break; }
    }
    allowed = Math.min(allowed, this.e.colliders.rayLimit(this.target, dir, allowed, this.colRadius));
    if (this.frame++ % 2 === 0) {
      this.ray.set(this.target, dir);
      this.ray.far = allowed;
      const hit = this.ray.intersectObjects(this.e.occluders, true).find((h) => h.object.isMesh);
      this.lastHit = hit ? Math.max(0.7, hit.distance - this.colRadius) : 0;
    }
    if (this.lastHit) allowed = Math.min(allowed, this.lastHit);
    this.cur = allowed < this.cur ? lerp(this.cur, allowed, 1 - Math.exp(-dt * 25)) : lerp(this.cur, allowed, 1 - Math.exp(-dt * 3));
    this.cam.position.copy(this.target).addScaledVector(dir, this.cur);
    const g = this.e.groundAt(this.cam.position.x, this.cam.position.z);
    if (this.cam.position.y < g + 0.3) this.cam.position.y = g + 0.3;
    this.cam.lookAt(this.target);
  }

  first(dt, inp, player) {
    this.orbit(inp, 0.004, -1.3, 1.3);
    const dir = this.dirFrom(this.yaw, this.pitch, td);
    const p = player.pos;
    this.cam.position.set(p.x - dir.x * 0.15, p.y + (player.sitting ? 1.1 : 1.62), p.z - dir.z * 0.15);
    tv.copy(this.cam.position).sub(dir);
    this.cam.lookAt(tv);
  }

  pan(focus, yaw, inp, speed, vertical) {
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    focus.x += (fx * inp.move.y + rx * inp.move.x) * speed;
    focus.z += (fz * inp.move.y + rz * inp.move.x) * speed;
    if (vertical) { if (inp.keys.has('KeyQ')) focus.y -= speed * 0.6; if (inp.keys.has('KeyE')) focus.y += speed * 0.6; }
  }

  photoCam(dt, inp) {
    const o = this.photo;
    this.orbit(inp, 0.005, -0.8, 1.45, o);
    if (inp.wheel) o.dist = clamp(o.dist * (1 + inp.wheel * 0.001), 1.5, 60);
    this.pan(o.focus, o.yaw, inp, 8 * dt, true);
    const dir = this.dirFrom(o.yaw, o.pitch, td);
    this.cam.position.copy(o.focus).addScaledVector(dir, o.dist);
    const g = this.e.groundAt(this.cam.position.x, this.cam.position.z);
    if (this.cam.position.y < g + 0.3) this.cam.position.y = g + 0.3;
    this.cam.lookAt(o.focus);
  }

  buildCam(dt, inp) {
    const b = this.bld;
    this.orbit(inp, 0.005, 0.35, 1.45, b);
    if (inp.wheel && !inp.keys.has('ShiftLeft')) b.dist = clamp(b.dist * (1 + inp.wheel * 0.001), 12, 140);
    this.pan(b.focus, b.yaw, inp, b.dist * 0.9 * dt, false);
    const r = Math.hypot(b.focus.x, b.focus.z);
    if (r > 230) { b.focus.x *= 230 / r; b.focus.z *= 230 / r; }
    b.focus.y = lerp(b.focus.y, Math.max(this.e.groundAt(b.focus.x, b.focus.z), 3), 1 - Math.exp(-dt * 4));
    const dir = this.dirFrom(b.yaw, b.pitch, td);
    this.cam.position.copy(b.focus).addScaledVector(dir, b.dist);
    this.cam.lookAt(b.focus);
  }

  freeCam(dt, inp) {
    const f = this.free;
    this.orbit(inp, 0.004, -1.5, 1.5, f);
    const dir = this.dirFrom(f.yaw, f.pitch, td);
    const sp = f.speed * (inp.sprint ? 3 : 1) * dt;
    f.pos.addScaledVector(dir, -inp.move.y * sp);
    f.pos.x += Math.cos(f.yaw) * inp.move.x * sp; f.pos.z -= Math.sin(f.yaw) * inp.move.x * sp;
    if (inp.keys.has('KeyE') || inp.keys.has('Space')) f.pos.y += sp;
    if (inp.keys.has('KeyQ') || inp.keys.has('KeyC')) f.pos.y -= sp;
    this.cam.position.copy(f.pos);
    tv.copy(f.pos).sub(dir);
    this.cam.lookAt(tv);
  }
}