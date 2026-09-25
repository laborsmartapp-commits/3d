import * as THREE from 'three';
import { createHumanoid, animateHumanoid } from './Humanoid';
import { lerpAngle } from '../core/noise';
import { SPAWN, WATER } from '../world/layout';

export class Player {
  constructor(e) {
    this.e = e;
    this.h = createHumanoid({ skin: '#d8a88a', shirt: '#0f4f4a', pants: '#1e1b2e', hair: '#2b1b3a', accent: '#05ce91', cloak: '#3b1d5e', boots: '#1a1320' });
    e.scene.add(this.h.root);
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.anim = { mode: 'idle', phase: 0, t: 0, speed: 0 };
    this.respawn();
  }

  respawn() {
    this.pos.set(SPAWN.x, this.e.groundAt(SPAWN.x, SPAWN.z), SPAWN.z);
    this.vel.set(0, 0, 0);
    this.yaw = SPAWN.yaw;
    this.onGround = true;
    this.sitting = null;
    this.swimming = false;
    this.gesture = null;
    this.landT = 0;
  }

  teleport(x, z) { this.sitting = null; this.pos.set(x, this.e.groundAt(x, z) + 0.5, z); this.vel.set(0, 0, 0); }

  sitAt(seat) {
    this.sitting = seat;
    this.pos.set(seat.x, seat.y - 0.47, seat.z);
    this.vel.set(0, 0, 0);
    this.yaw = seat.rot;
  }

  gestureFor(mode, dur = 2.2) { this.gesture = { mode, until: this.anim.t + dur }; }

  update(dt, inp, camYaw, fp, frozen) {
    const e = this.e;
    this.anim.t += dt;
    const mv = inp.move;
    const mag = frozen ? 0 : Math.min(1, Math.hypot(mv.x, mv.y));
    if (this.sitting) {
      if (!frozen && (mag > 0.1 || inp.jump)) { this.pos.x += Math.sin(this.yaw) * 0.8; this.pos.z += Math.cos(this.yaw) * 0.8; this.sitting = null; }
      else { this.anim.mode = 'sit'; this.finish(dt, fp); return; }
    }
    const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
    let dx = fx * mv.y + rx * mv.x, dz = fz * mv.y + rz * mv.x;
    const dl = Math.hypot(dx, dz);
    if (dl > 0) { dx /= dl; dz /= dl; }
    const sprint = inp.sprint && !this.swimming;
    const speed = this.swimming ? 3.2 : sprint ? 9 : inp.walk ? 2 : mag < 0.55 ? 2.2 : 5;
    const target = mag > 0.05 ? speed : 0;
    const kk = 1 - Math.exp(-(this.onGround || this.swimming ? 9 : 2.2) * dt);
    this.vel.x += (dx * target - this.vel.x) * kk;
    this.vel.z += (dz * target - this.vel.z) * kk;
    if (fp) this.yaw = camYaw + Math.PI;
    else if (mag > 0.05) this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 10));

    const px = this.pos.x, pz = this.pos.z;
    const gOld = e.groundAt(px, pz);
    const canMove = (x, z) => {
      const g = e.groundAt(x, z);
      if (g < -500) return true;
      if (!this.onGround && !this.swimming) return g <= this.pos.y + 0.5;
      const hs = Math.hypot(x - px, z - pz);
      if (hs < 1e-6) return true;
      const rise = e.groundAt(px + ((x - px) / hs) * 0.5, pz + ((z - pz) / hs) * 0.5) - gOld;
      return !(rise > 0.45 && rise / 0.5 > 1.2);
    };
    const nx = px + this.vel.x * dt, nz = pz + this.vel.z * dt;
    if (canMove(nx, nz)) { this.pos.x = nx; this.pos.z = nz; }
    else if (canMove(nx, pz)) { this.pos.x = nx; this.vel.z *= 0.5; }
    else if (canMove(px, nz)) { this.pos.z = nz; this.vel.x *= 0.5; }
    else { this.vel.x *= 0.2; this.vel.z *= 0.2; }
    e.colliders.resolve(this.pos, 0.35, this.pos.y + 0.5);

    const g = e.groundAt(this.pos.x, this.pos.z);
    const depth = WATER - g;
    this.swimming = depth > 1.35 && this.pos.y <= WATER - 0.4;
    if (this.swimming) {
      this.pos.y += (WATER - 1.25 - this.pos.y) * Math.min(1, dt * 6);
      this.vel.y = 0;
      this.onGround = false;
    } else {
      if (inp.jump && this.onGround && !frozen) { this.vel.y = 9.5; this.onGround = false; }
      this.vel.y -= 26 * dt;
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= g) {
        if (!this.onGround && this.vel.y < -13) this.landT = 0.25;
        this.pos.y = g; this.vel.y = 0; this.onGround = true;
      } else if (this.onGround && this.pos.y - g < 0.6 && this.vel.y <= 0) { this.pos.y = g; this.vel.y = 0; }
      else this.onGround = false;
    }
    if (this.pos.y < -90) { this.respawn(); e.notify('The winds carry you back to Starfall Overlook'); }
    this.landT = Math.max(0, this.landT - dt);

    const hs = Math.hypot(this.vel.x, this.vel.z);
    let mode = this.swimming ? (hs > 0.5 ? 'swim' : 'tread') : !this.onGround ? (this.vel.y > 0 ? 'jump' : 'fall') : this.landT > 0 ? 'land' : hs > 6.5 ? 'run' : hs > 0.4 ? 'walk' : 'idle';
    if (this.gesture) { if (this.anim.t > this.gesture.until || hs > 0.5) this.gesture = null; else if (mode === 'idle') mode = this.gesture.mode; }
    const cycle = hs > 6.5 ? 2.6 : hs > 3 ? 1.9 : 1.3;
    const prev = this.anim.phase;
    this.anim.phase += ((hs * dt) / cycle) * Math.PI * 2 * (this.swimming ? 0.5 : 1);
    if (this.onGround && hs > 0.4 && Math.floor(prev / Math.PI) !== Math.floor(this.anim.phase / Math.PI)) e.onFootstep(this.pos, depth > 0.05);
    this.anim.mode = mode;
    this.anim.speed = hs;
    this.finish(dt, fp);
  }

  finish(dt, fp) {
    const r = this.h.root;
    r.position.copy(this.pos);
    r.rotation.y = this.yaw;
    r.visible = !fp && this.e.mode !== 'intro';
    animateHumanoid(this.h, this.anim, dt);
  }
}