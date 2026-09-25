import * as THREE from 'three';
import { lerpAngle, mulberry32 } from '../core/noise';
import { WATER, VILLAGE, LAGOON, GROTTO } from '../world/layout';

const matC = new Map();
const mat = (c, em) => { const k = c + (em || ''); if (!matC.has(k)) matC.set(k, new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, emissive: em || '#000000', emissiveIntensity: em ? 1.2 : 0 })); return matC.get(k); };
const mk = (geo, m, x, y, z, p) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; p.add(o); return o; };

export const SPECIES = {
  deer: { name: 'Duskhorn Deer', body: [0.32, 0.38, 0.72], leg: 0.8, color: '#7a5a46', antlers: '#58f5d0', speed: [1.1, 7], home: 'forest', drinks: true, count: 6, lore: 'Its antlers catch moonlight and hold it until dawn.' },
  spirit: { name: 'Spirit Stag', body: [0.34, 0.4, 0.78], leg: 0.85, color: '#9fe8ff', glow: '#5eead4', antlers: '#e0fbff', speed: [1, 8], home: 'grotto', nocturnal: true, rare: true, count: 1, lore: 'A rare spirit of the island. Few have seen it twice.' },
  fox: { name: 'Crystal Fox', body: [0.16, 0.18, 0.4], leg: 0.32, color: '#c2622f', crystals: '#a855f7', tail: true, speed: [1.4, 8], home: 'forest', count: 5, lore: 'Amethyst grows along its spine as it ages.' },
  rabbit: { name: 'Moss Hare', body: [0.12, 0.13, 0.18], leg: 0.1, color: '#8c7a66', ears: true, hop: true, speed: [1, 6], home: 'meadow', count: 10, lore: 'It sleeps in hollows lined with glowing moss.' },
  cat: { name: 'Shadow Cat', body: [0.13, 0.15, 0.3], leg: 0.24, color: '#1b1826', eyes: '#f59e0b', tail: true, speed: [0.8, 5], home: 'village', pet: true, count: 2, lore: "Duskmere's unofficial mayor." },
  frog: { name: 'Lantern Frog', body: [0.09, 0.06, 0.1], leg: 0.05, color: '#2f8f5a', glow: '#bef264', hop: true, speed: [0.5, 3], home: 'shore', count: 6, lore: 'Its throat glows to call the rain.' },
};

function buildAnimal(sp) {
  const root = new THREE.Group();
  const [sx, sy, sz] = sp.body;
  const m = mat(sp.color, sp.glow);
  const bodyY = sp.leg + sy * 0.7;
  const body = mk(new THREE.SphereGeometry(1, 12, 10), m, 0, bodyY, 0, root);
  body.scale.set(sx, sy, sz);
  const head = new THREE.Group(); head.position.set(0, bodyY + sy * 0.6, sz * 0.9); root.add(head);
  mk(new THREE.SphereGeometry(sy * 0.7, 10, 8), m, 0, 0, 0, head);
  mk(new THREE.SphereGeometry(sy * 0.35, 8, 6), m, 0, -sy * 0.15, sy * 0.6, head);
  if (sp.antlers) for (const s of [-1, 1]) {
    mk(new THREE.CylinderGeometry(0.02, 0.04, 0.6, 5), mat(sp.antlers, sp.antlers), s * 0.12, 0.38, -0.05, head).rotation.z = -s * 0.5;
    mk(new THREE.CylinderGeometry(0.015, 0.025, 0.3, 5), mat(sp.antlers, sp.antlers), s * 0.28, 0.55, 0, head).rotation.z = s * 0.4;
  }
  if (sp.ears) for (const s of [-1, 1]) mk(new THREE.CapsuleGeometry(0.025, 0.14, 2, 5), m, s * 0.04, 0.13, -0.02, head).rotation.x = -0.3;
  if (sp.eyes) for (const s of [-1, 1]) mk(new THREE.SphereGeometry(0.018, 6, 4), mat(sp.eyes, sp.eyes), s * 0.05, 0.03, 0.09, head);
  if (sp.crystals) for (let i = 0; i < 3; i++) mk(new THREE.OctahedronGeometry(0.06), mat(sp.crystals, sp.crystals), 0, bodyY + sy * 0.95, -0.1 + i * 0.12, root).scale.y = 2;
  let tail = null;
  if (sp.tail) { tail = new THREE.Group(); tail.position.set(0, bodyY, -sz * 0.9); root.add(tail); mk(new THREE.CapsuleGeometry(sy * 0.3, sz * 0.8, 3, 6), m, 0, 0, -sz * 0.4, tail).rotation.x = Math.PI / 2 + 0.4; }
  const legs = [];
  for (const [lx, lz] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    const lg = new THREE.Group(); lg.position.set(lx * sx * 0.6, sp.leg, lz * sz * 0.6); root.add(lg);
    mk(new THREE.CapsuleGeometry(Math.max(0.02, sx * 0.14), Math.max(0.02, sp.leg * 0.8), 2, 5), m, 0, -sp.leg / 2, 0, lg);
    legs.push(lg);
  }
  return { root, body, head, legs, tail, bodyY };
}

export class Animals {
  constructor(e) {
    this.e = e;
    this.rng = mulberry32(77);
    this.list = [];
    for (const [key, sp] of Object.entries(SPECIES)) {
      for (let i = 0; i < sp.count; i++) {
        const home = this.pickHome(sp);
        const b = buildAnimal(sp);
        e.scene.add(b.root);
        const a = { key, sp, ...b, pos: new THREE.Vector3(home.x, 0, home.z), home, yaw: this.rng() * 6, state: 'idle', timer: this.rng() * 3, target: null, phase: 0, t: this.rng() * 10, seen: false };
        a.pos.y = e.groundAt(a.pos.x, a.pos.z);
        this.list.push(a);
        e.interact.add({ verb: sp.pet ? 'Pet' : 'Observe', label: sp.name, radius: sp.pet ? 2 : 7, getPos: () => a.pos, enabled: () => a.root.visible && a.state !== 'flee', action: () => e.onAnimalInteract(a) });
      }
    }
    this.flocks = this.buildBirds();
  }

  pickHome(sp) {
    const e = this.e, rng = this.rng;
    if (sp.home === 'village') return { x: VILLAGE.x + (rng() - 0.5) * 20, z: VILLAGE.z + (rng() - 0.5) * 20, r: 14 };
    if (sp.home === 'grotto') return { x: GROTTO.x + 14, z: GROTTO.z + 10, r: 25 };
    if (sp.home === 'shore') {
      const s = e.terrain.shorePoints.filter((p) => Math.hypot(p.x - LAGOON.x, p.z - LAGOON.z) < 60);
      const p = s[Math.floor(rng() * s.length)] || LAGOON;
      return { x: p.x, z: p.z, r: 8 };
    }
    const pts = sp.home === 'forest' ? e.veg.forestPoints : e.veg.meadowPoints;
    const p = pts[Math.floor(rng() * pts.length)] || { x: 60, z: -60 };
    return { x: p.x, z: p.z, r: sp.home === 'forest' ? 30 : 22 };
  }

  validGround(x, z, allowWater) {
    const g = this.e.groundAt(x, z);
    if (g < -100) return false;
    if (!allowWater && g < WATER + 0.3) return false;
    return this.e.terrain.slopeAt(x, z) < 0.9;
  }

  buildBirds() {
    const e = this.e, rng = this.rng, flocks = [];
    const perches = e.veg.treeTops.length ? e.veg.treeTops : [new THREE.Vector3(0, 30, 0)];
    const wingG = new THREE.PlaneGeometry(0.34, 0.14).translate(0.17, 0, 0);
    for (let f = 0; f < 5; f++) {
      const moon = f === 4;
      const bodyM = mat(moon ? '#c7d2fe' : ['#1f3b4d', '#3b2a5a', '#5a2d2a', '#2a4a3a'][f % 4], moon ? '#818cf8' : null);
      const wingM = new THREE.MeshStandardMaterial({ color: moon ? '#e0e7ff' : '#222233', side: THREE.DoubleSide, emissive: moon ? '#6366f1' : '#000000', emissiveIntensity: moon ? 1 : 0 });
      const perch = perches[Math.floor(rng() * perches.length)].clone();
      const birds = [];
      for (let i = 0; i < 6; i++) {
        const g = new THREE.Group();
        const b = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), bodyM); b.scale.set(0.09, 0.08, 0.2); g.add(b);
        const hd = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), bodyM); hd.position.set(0, 0.05, 0.16); g.add(hd);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.07, 4), mat('#f59e0b')); beak.rotation.x = Math.PI / 2; beak.position.set(0, 0.04, 0.24); g.add(beak);
        const wl = new THREE.Group(), wr = new THREE.Group();
        wl.position.x = 0.05; wr.position.x = -0.05;
        wl.add(new THREE.Mesh(wingG, wingM));
        const rm = new THREE.Mesh(wingG, wingM); rm.scale.x = -1; wr.add(rm);
        wl.rotation.x = wr.rotation.x = -Math.PI / 2;
        g.add(wl, wr);
        g.scale.setScalar(1.6);
        g.position.copy(perch);
        e.scene.add(g);
        birds.push({ g, wl, wr, off: new THREE.Vector3((rng() - 0.5) * 3, rng() * 0.3, (rng() - 0.5) * 3), fo: new THREE.Vector3((rng() - 0.5) * 6, (rng() - 0.5) * 3, (rng() - 0.5) * 6), ph: rng() * 6, hop: 0 });
      }
      flocks.push({ birds, perch, state: 'perched', timer: 10 + rng() * 20, from: perch.clone(), to: perch.clone(), mid: new THREE.Vector3(), t: 0, dur: 1, moon, circle: 0, circleC: new THREE.Vector3() });
    }
    return flocks;
  }

  takeOff(fl, to) {
    const e = this.e, rng = this.rng, perches = e.veg.treeTops;
    fl.from.copy(fl.perch);
    if (to) fl.to.copy(to);
    else if (rng() < 0.2) { fl.to.set(VILLAGE.x + (rng() - 0.5) * 10, 0, VILLAGE.z + (rng() - 0.5) * 10); fl.to.y = e.groundAt(fl.to.x, fl.to.z) + 0.1; }
    else fl.to.copy(perches[Math.floor(rng() * perches.length)]);
    fl.mid.lerpVectors(fl.from, fl.to, 0.5); fl.mid.y = Math.max(fl.from.y, fl.to.y) + 20 + rng() * 15;
    fl.circle = rng() < 0.3 ? 12 : 0;
    fl.circleC.copy(fl.mid);
    fl.dur = Math.max(4, fl.from.distanceTo(fl.to) / 11);
    fl.t = 0;
    fl.state = 'flying';
  }

  landNear(pos) {
    const fl = this.flocks[Math.floor(this.rng() * 4)];
    if (fl.state !== 'perched') return;
    const to = new THREE.Vector3(pos.x + 6, 0, pos.z + 4);
    to.y = this.e.groundAt(to.x, to.z) + 0.1;
    if (to.y > -100) this.takeOff(fl, to);
  }

  update(dt, faunaK) {
    const e = this.e, env = e.env, pl = e.player.pos, night = env.night > 0.6, pSpeed = Math.hypot(e.player.vel.x, e.player.vel.z);
    let active = 0;
    const camP = e.camera.position;
    this.list.forEach((a, idx) => {
      const sp = a.sp;
      let visible = idx / this.list.length < faunaK;
      if (sp.nocturnal) visible = visible && night;
      a.root.visible = visible;
      if (!visible) return;
      active++;
      a.t += dt; a.timer -= dt;
      const dp = Math.hypot(a.pos.x - pl.x, a.pos.z - pl.z);
      if (!sp.pet && a.state !== 'flee' && (dp < 2.8 || (dp < 6 && pSpeed > 4))) {
        const dx = a.pos.x - pl.x, dz = a.pos.z - pl.z, d = Math.hypot(dx, dz) || 1;
        a.target = { x: a.pos.x + (dx / d) * 18, z: a.pos.z + (dz / d) * 18 };
        a.state = 'flee'; a.timer = 3;
      }
      if (a.state === 'flee' && a.timer < 0) { a.state = 'idle'; a.timer = 2; }
      if (a.state !== 'flee' && a.state !== 'sleep' && night && !sp.nocturnal && sp.home !== 'village') a.state = 'sleep';
      if (a.state === 'sleep' && !night) { a.state = 'idle'; a.timer = 1; }
      if (a.state === 'idle' && dp < 12 && dp > 3 && !sp.pet && this.rng() < dt * 0.5) { a.state = 'observe'; a.timer = 2 + this.rng() * 2; }
      if (['idle', 'observe', 'graze', 'drink'].includes(a.state) && a.timer < 0) {
        const r = this.rng();
        a.state = 'idle'; a.timer = 2 + this.rng() * 4;
        if (sp.drinks && r < 0.18) {
          const s = e.terrain.shorePoints.filter((p) => Math.hypot(p.x - a.home.x, p.z - a.home.z) < 70);
          if (s.length) { const p = s[Math.floor(this.rng() * s.length)]; a.target = { x: p.x, z: p.z }; a.state = 'toDrink'; }
        } else if (r < 0.7) {
          const ang = this.rng() * Math.PI * 2, rr = this.rng() * a.home.r;
          a.target = { x: a.home.x + Math.cos(ang) * rr, z: a.home.z + Math.sin(ang) * rr };
          a.state = 'wander';
        } else { a.state = 'graze'; a.timer = 3 + this.rng() * 4; }
      }
      let moving = false, speed = 0;
      if (a.target && ['wander', 'flee', 'toDrink'].includes(a.state)) {
        const dx = a.target.x - a.pos.x, dz = a.target.z - a.pos.z, d = Math.hypot(dx, dz);
        speed = a.state === 'flee' ? sp.speed[1] : sp.speed[0];
        if (d < 0.6) { a.target = null; a.state = a.state === 'toDrink' ? 'drink' : 'idle'; a.timer = a.state === 'drink' ? 5 + this.rng() * 3 : 2 + this.rng() * 4; }
        else {
          const nx = a.pos.x + (dx / d) * speed * dt, nz = a.pos.z + (dz / d) * speed * dt;
          if (this.validGround(nx, nz, a.state === 'toDrink' || sp.home === 'shore')) { a.pos.x = nx; a.pos.z = nz; moving = true; a.yaw = lerpAngle(a.yaw, Math.atan2(dx, dz), 1 - Math.exp(-dt * 8)); }
          else { a.target = null; a.state = 'idle'; a.timer = 1; }
        }
      }
      if (a.state === 'observe') a.yaw = lerpAngle(a.yaw, Math.atan2(pl.x - a.pos.x, pl.z - a.pos.z), 1 - Math.exp(-dt * 4));
      a.pos.y = e.groundAt(a.pos.x, a.pos.z);
      a.root.position.copy(a.pos);
      a.root.rotation.y = a.yaw;
      if (Math.hypot(a.pos.x - camP.x, a.pos.z - camP.z) > 120) return;
      a.phase += ((speed * dt) / Math.max(0.3, sp.leg * 1.4)) * Math.PI;
      const amp = moving ? Math.min(0.9, 0.35 + speed * 0.08) : 0;
      a.legs.forEach((l, i) => { l.rotation.x = Math.sin(a.phase + (i === 0 || i === 3 ? 0 : Math.PI)) * amp; });
      const sleep = a.state === 'sleep';
      a.body.position.y = sp.hop && moving ? a.bodyY + Math.abs(Math.sin(a.phase)) * 0.15 : a.bodyY - (sleep ? sp.leg * 0.8 : 0);
      a.legs.forEach((l) => { l.visible = !sleep; });
      const headDown = a.state === 'graze' || a.state === 'drink';
      a.head.rotation.x += ((headDown ? 0.9 : a.state === 'observe' ? -0.25 : sleep ? 0.3 : 0) - a.head.rotation.x) * Math.min(1, dt * 5);
      a.head.position.y = a.bodyY + sp.body[1] * 0.6 - (headDown ? 0.25 * sp.leg : 0) - (sleep ? sp.leg * 0.8 : 0);
      if (a.tail) a.tail.rotation.y = Math.sin(a.t * (sp.pet ? 2 : 6)) * 0.4;
    });
    const t = e.time;
    const leader = new THREE.Vector3(), p = new THREE.Vector3(), prev = new THREE.Vector3();
    for (const fl of this.flocks) {
      const vis = fl.moon ? night : true;
      if (fl.state === 'perched') {
        fl.timer -= dt;
        const near = pl.distanceTo(fl.perch) < 11;
        if ((fl.timer < 0 && (!night || fl.moon)) || near) { this.takeOff(fl); if (near) e.audio.chirp(); }
      } else {
        fl.t += dt / fl.dur;
        if (fl.circle > 0 && fl.t > 0.5) { fl.circle -= dt; fl.t = 0.5; }
        if (fl.t >= 1) { fl.state = 'perched'; fl.perch.copy(fl.to); fl.timer = 12 + this.rng() * 30; }
      }
      const tt = Math.min(1, fl.t);
      if (fl.state === 'flying') {
        const u = 1 - tt;
        leader.set(0, 0, 0).addScaledVector(fl.from, u * u).addScaledVector(fl.mid, 2 * u * tt).addScaledVector(fl.to, tt * tt);
        if (fl.circle > 0) leader.set(fl.circleC.x + Math.cos(t * 0.6) * 15, fl.circleC.y + Math.sin(t) * 2, fl.circleC.z + Math.sin(t * 0.6) * 15);
      } else leader.copy(fl.perch);
      for (const b of fl.birds) {
        b.g.visible = vis;
        if (!vis) continue;
        prev.copy(b.g.position);
        if (fl.state === 'flying') {
          const conv = Math.max(0, (tt - 0.85) / 0.15);
          p.copy(leader).addScaledVector(b.fo, 1 - conv).addScaledVector(b.off, conv);
          p.y += Math.sin(t * 2 + b.ph) * 0.5;
          b.g.position.lerp(p, 1 - Math.exp(-dt * 6));
          const f2 = Math.sin(t * 18 + b.ph) * 0.9;
          b.wl.rotation.y = -f2; b.wr.rotation.y = f2;
          if (prev.distanceToSquared(b.g.position) > 1e-5) { p.copy(b.g.position).multiplyScalar(2).sub(prev); b.g.lookAt(p); }
        } else {
          b.hop -= dt;
          if (b.hop < 0) { b.hop = 1 + this.rng() * 3; b.off.x += (this.rng() - 0.5) * 0.4; b.off.z += (this.rng() - 0.5) * 0.4; b.g.rotation.set(0, this.rng() * 6, 0); }
          p.copy(leader).add(b.off);
          b.g.position.lerp(p, 1 - Math.exp(-dt * 8));
          b.wl.rotation.y = 1.2; b.wr.rotation.y = -1.2;
        }
      }
    }
    return active + this.flocks.length * 6;
  }
}