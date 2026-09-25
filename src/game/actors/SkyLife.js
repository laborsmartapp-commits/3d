import * as THREE from 'three';
import { patchMaterial, mergeGeo } from '../core/shared';
import { WATER, LAGOON, RIVER_S, MOUNTAIN } from '../world/layout';

const bm = (c, em, ei = 1) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, emissive: em || '#000000', emissiveIntensity: em ? ei : 0 });

export class SkyLife {
  constructor(e) {
    this.e = e;
    const fishGeo = mergeGeo([new THREE.ConeGeometry(0.1, 0.45, 6).rotateX(Math.PI / 2), new THREE.ConeGeometry(0.1, 0.16, 3).rotateX(-Math.PI / 2).translate(0, 0, -0.28)]);
    const fishMat = patchMaterial(new THREE.MeshStandardMaterial({ roughness: 0.4 }), { glow: 0.8, key: 'fish' });
    this.schools = [
      { cx: LAGOON.x, cz: LAGOON.z, r: 14, a: 0, sp: 0.15, n: 14 },
      { cx: LAGOON.x - 8, cz: LAGOON.z + 6, r: 20, a: 2, sp: -0.1, n: 14 },
      { cx: LAGOON.x + 6, cz: LAGOON.z - 8, r: 10, a: 4, sp: 0.2, n: 12 },
      { river: true, i: 40, dir: 1, n: 8 },
    ];
    const total = this.schools.reduce((s, x) => s + x.n, 0);
    this.fish = new THREE.InstancedMesh(fishGeo, fishMat, total);
    const cols = ['#2ee6c0', '#a855f7', '#f59e0b', '#60a5fa'];
    this.fishData = [];
    let k = 0;
    for (const s of this.schools) for (let i = 0; i < s.n; i++) {
      this.fish.setColorAt(k, new THREE.Color(cols[(k * 7) % 4]));
      this.fishData.push({ s, ang: Math.random() * 6.28, rad: 0.5 + Math.random() * 3, dy: Math.random(), ph: Math.random() * 6, scatter: 0, pos: new THREE.Vector3(), jump: -1, k: k++ });
    }
    this.fish.instanceColor.needsUpdate = true;
    this.fish.frustumCulled = false;
    e.scene.add(this.fish);
    this.jumpT = 5;
    this.o = new THREE.Object3D();

    const whale = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), bm('#2b3a5c')); body.scale.set(10, 8, 30); whale.add(body);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), bm('#8aa0c0')); belly.scale.set(8.5, 5, 26); belly.position.y = -3; whale.add(belly);
    for (const s of [-1, 1]) { const fin = new THREE.Mesh(new THREE.BoxGeometry(14, 0.8, 5), bm('#24324f')); fin.position.set(s * 13, -2, 6); fin.rotation.z = s * -0.3; whale.add(fin); }
    const tail = new THREE.Group(); tail.position.z = -28; whale.add(tail);
    const fl = new THREE.Mesh(new THREE.BoxGeometry(26, 0.8, 8), bm('#24324f')); fl.position.z = -5; tail.add(fl);
    const spotM = new THREE.MeshBasicMaterial({ color: '#5eead4' });
    for (let i = 0; i < 18; i++) { const sp = new THREE.Mesh(new THREE.SphereGeometry(0.7, 6, 4), spotM); sp.position.set((i % 2 ? 1 : -1) * 9.3, 1 + Math.sin(i) * 2, -20 + i * 2.5); whale.add(sp); }
    whale.traverse((o) => { if (o.material) o.material.fog = false; });
    e.scene.add(whale);
    this.whale = { g: whale, tail, a: 0 };

    const manta = new THREE.Group();
    const mb = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), bm('#1e1b3a', '#6d28d9', 0.4)); mb.scale.set(6, 1.2, 8); manta.add(mb);
    const wings = [-1, 1].map((s) => { const w = new THREE.Group(); const wm = new THREE.Mesh(new THREE.ConeGeometry(6, 14, 3), bm('#1e1b3a', '#7c3aed', 0.5)); wm.rotation.z = (s * Math.PI) / 2; wm.scale.set(1, 1, 0.12); wm.position.x = s * 7; w.add(wm); manta.add(w); return w; });
    manta.scale.setScalar(1.6);
    e.scene.add(manta);
    this.manta = { g: manta, wings, a: 1 };

    const dragon = new THREE.Group();
    const dm = bm('#5b1d3f', '#f59e0b', 0.25);
    const db = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), dm); db.scale.set(0.8, 0.7, 2); dragon.add(db);
    const dh = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), dm); dh.position.set(0, 0.5, 2.2); dragon.add(dh);
    for (let i = 0; i < 5; i++) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.4 - i * 0.06, 8, 6), dm); t.position.set(0, 0, -2 - i * 0.7); dragon.add(t); }
    const dwings = [-1, 1].map((s) => { const w = new THREE.Group(); const wm = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 3), bm('#7a2352', '#be185d', 0.3)); wm.rotation.z = (s * Math.PI) / 2; wm.scale.z = 0.1; wm.position.x = s * 2.2; w.add(wm); dragon.add(w); return w; });
    dragon.visible = false;
    e.scene.add(dragon);
    this.dragon = { g: dragon, wings: dwings, active: 0, next: 150 + Math.random() * 200, a: 0 };
  }

  update(dt) {
    const e = this.e, t = e.time, o = this.o, pl = e.player.pos;
    for (const s of this.schools) {
      if (s.river) {
        s.i += s.dir * dt * 1.2;
        if (s.i > 70 || s.i < 30) s.dir *= -1;
        const p = RIVER_S[Math.floor(s.i)];
        s.x = p[0]; s.z = p[1];
      } else { s.a += s.sp * dt; s.x = s.cx + Math.cos(s.a) * s.r; s.z = s.cz + Math.sin(s.a) * s.r; }
    }
    this.jumpT -= dt;
    if (this.jumpT < 0) { const f = this.fishData[Math.floor(Math.random() * 40)]; f.jump = 0; this.jumpT = 4 + Math.random() * 8; e.fx.emit(f.pos, { count: 10, color: '#bdf6ff', up: 2, spread: 0.4, life: 0.8 }); }
    for (const f of this.fishData) {
      const s = f.s;
      const d = Math.hypot(f.pos.x - pl.x, f.pos.z - pl.z);
      f.scatter += ((d < 6 ? 1 : 0) - f.scatter) * Math.min(1, dt * 3);
      const a = f.ang + t * (s.river ? 0.5 : 0.8) * (f.k % 2 ? 1 : -1);
      const rr = f.rad * (1 + f.scatter * 2.5);
      const nx = s.x + Math.cos(a) * rr, nz = s.z + Math.sin(a) * rr;
      let y = WATER - 0.8 - f.dy * (s.river ? 0.6 : 2);
      if (f.jump >= 0) {
        f.jump += dt / 0.9;
        y = WATER - 0.3 + Math.sin(Math.min(1, f.jump) * Math.PI) * 1.4;
        if (f.jump >= 1) { f.jump = -1; e.fx.emit(f.pos, { count: 8, color: '#bdf6ff', up: 1.5, spread: 0.3, life: 0.6 }); }
      }
      const dx = nx - f.pos.x, dz = nz - f.pos.z;
      f.pos.set(nx, y, nz);
      o.position.copy(f.pos);
      o.rotation.set(f.jump >= 0 ? -Math.cos(f.jump * Math.PI) * 0.8 : 0, Math.atan2(dx, dz) + Math.sin(t * 8 + f.ph) * 0.15, 0);
      o.updateMatrix();
      this.fish.setMatrixAt(f.k, o.matrix);
    }
    this.fish.instanceMatrix.needsUpdate = true;
    const w = this.whale;
    w.a += dt * 0.02;
    const wy = 170 + Math.sin(w.a * 2) * 40;
    w.g.position.set(Math.cos(w.a) * 850, wy, Math.sin(w.a) * 700);
    w.g.lookAt(Math.cos(w.a + 0.01) * 850, wy, Math.sin(w.a + 0.01) * 700);
    w.tail.rotation.x = Math.sin(t * 0.8) * 0.25;
    const m = this.manta;
    m.a += dt * 0.035;
    m.g.position.set(Math.cos(m.a) * 330, -80 + Math.sin(m.a * 3) * 15, Math.sin(m.a) * 330);
    m.g.lookAt(Math.cos(m.a + 0.01) * 330, -80, Math.sin(m.a + 0.01) * 330);
    m.wings.forEach((wg, i) => { wg.rotation.z = Math.sin(t * 0.9) * 0.35 * (i ? 1 : -1); });
    const dr = this.dragon;
    if (dr.active > 0) {
      dr.active -= dt; dr.a += dt * 0.5;
      dr.g.position.set(MOUNTAIN.x + Math.cos(dr.a) * 70, 95 + Math.sin(dr.a * 2) * 10, MOUNTAIN.z + Math.sin(dr.a) * 70);
      dr.g.lookAt(MOUNTAIN.x + Math.cos(dr.a + 0.05) * 70, 95, MOUNTAIN.z + Math.sin(dr.a + 0.05) * 70);
      dr.wings.forEach((wg, i) => { wg.rotation.z = Math.sin(t * 6) * 0.7 * (i ? 1 : -1); });
      if (dr.active <= 0) dr.g.visible = false;
    } else {
      dr.next -= dt;
      if (dr.next < 0) { dr.active = 50; dr.next = 200 + Math.random() * 250; dr.g.visible = true; e.notify("A tiny dragon circles Scorpion's Crown"); }
    }
  }
}