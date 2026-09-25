import * as THREE from 'three';
import { mulberry32 } from '../core/noise';
import { jitter, glowTexture } from '../core/shared';
import { MAT, box, cyl, cone, mesh, anim, fire, glow, addLight, bench, scorpionStatue, lampBox } from '../build/builders';
import { R, WATER, BRIDGES, GROTTO, ISLET, BENCHES, PATHS, sampleCurve, SPAWN } from './layout';

const V = THREE.Vector3;

export function bridgePlatform(a, b, w, ha, hb, arch) {
  const dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, L = Math.sqrt(L2);
  return {
    heightAt(x, z) {
      const px = x - a[0], pz = z - a[1];
      const t = (px * dx + pz * dz) / L2;
      if (t < -0.02 || t > 1.02) return null;
      if (Math.abs(px * dz - pz * dx) / L > w / 2) return null;
      const tt = Math.max(0, Math.min(1, t));
      return ha + (hb - ha) * tt + arch * Math.sin(Math.PI * tt);
    },
  };
}
export const discPlatform = (x, z, r, y) => ({ heightAt: (px, pz) => ((px - x) ** 2 + (pz - z) ** 2 < r * r ? y : null) });
export const boxPlatform = (x, z, hw, hd, rot, y) => {
  const c = Math.cos(rot), s = Math.sin(rot);
  return { heightAt(px, pz) { const dx = px - x, dz = pz - z; return Math.abs(dx * c - dz * s) < hw && Math.abs(dx * s + dz * c) < hd ? y : null; } };
};

export class Landmarks {
  constructor(e) {
    this.e = e;
    const T = e.terrain, C = e.colliders, scene = e.scene;
    const H = (x, z) => T.getHeight(x, z);
    const root = new THREE.Group();
    scene.add(root);
    const rng = mulberry32(4242);
    const place = (obj, x, z, yOff = 0, rot = 0) => { obj.position.set(x, H(x, z) + yOff, z); obj.rotation.y = rot; root.add(obj); return obj; };
    const reg = (g, occl = true) => {
      g.updateMatrixWorld(true);
      if (occl) e.occluders.push(g);
      for (const L of g.userData.lights || []) e.lightPool.add({ pos: new V(...L.p).applyMatrix4(g.matrixWorld), color: L.color, intensity: L.intensity, dist: L.dist, always: L.always });
      for (const f of g.userData.fires || []) e.fires.push(new V(...f).applyMatrix4(g.matrixWorld));
      for (const fn of g.userData.anim || []) e.anims.push(fn);
    };

    // bridges
    for (const br of BRIDGES) {
      let ha = Math.max(H(br.a[0], br.a[1]), WATER + 0.8), hb = Math.max(H(br.b[0], br.b[1]), WATER + 0.8);
      if (br.type === 'crystal') hb = ha + 2.5;
      else ha = hb = Math.max(ha, hb);
      const plat = bridgePlatform(br.a, br.b, br.w, ha + 0.25, hb + 0.25, br.arch);
      e.platforms.push(plat);
      const dx = br.b[0] - br.a[0], dz = br.b[1] - br.a[1], L = Math.hypot(dx, dz), rot = Math.atan2(dx, dz);
      const g = new THREE.Group();
      const deckMat = br.type === 'stone' ? MAT.stone : br.type === 'rope' ? MAT.wood : MAT.crystal;
      const n = Math.ceil(L / 1.2);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = br.a[0] + dx * t, z = br.a[1] + dz * t;
        const y = plat.heightAt(x, z) ?? ha;
        const th = br.type === 'stone' ? 0.8 : 0.18;
        const seg = box(br.w, th, L / n + 0.05, deckMat, x, y - th / 2, z);
        seg.rotation.y = rot;
        g.add(seg);
        if (i % 3 === 0) for (const s of [-1, 1]) {
          const px = x + Math.cos(rot) * s * (br.w / 2), pz = z - Math.sin(rot) * s * (br.w / 2);
          g.add(br.type === 'crystal' ? mesh(new THREE.OctahedronGeometry(0.25), MAT.crystalTeal, px, y + 0.9, pz) : cyl(0.1, 0.12, 1.3, br.type === 'stone' ? MAT.stone : MAT.darkWood, px, y + 0.5, pz, 6));
        }
      }
      if (br.type === 'crystal') for (let i = 0; i < 6; i++) glow(g, br.a[0] + (dx * (i + 0.5)) / 6, (ha + hb) / 2 + 1, br.a[1] + (dz * (i + 0.5)) / 6, '#05ce91', 3, true);
      root.add(g);
      for (const s of [-1, 1]) {
        const cx = (br.a[0] + br.b[0]) / 2 + Math.cos(rot) * s * (br.w / 2 + 0.15), cz = (br.a[1] + br.b[1]) / 2 - Math.sin(rot) * s * (br.w / 2 + 0.15);
        C.addBox(cx, cz, 0.15, L / 2 - 1.5, rot, Math.min(ha, hb) - 0.3, Math.max(ha, hb) + 4, 'rail');
      }
    }

    // islet with shrine
    const isY = Math.max(H(BRIDGES[2].a[0], BRIDGES[2].a[1]), WATER + 0.8) + 2.75;
    e.platforms.push(discPlatform(ISLET.x, ISLET.z, ISLET.r, isY));
    const islet = new THREE.Group();
    islet.add(cyl(ISLET.r, ISLET.r - 1, 1.5, new THREE.MeshStandardMaterial({ color: '#2e6135' }), 0, -0.75, 0, 24));
    const under = mesh(jitter(new THREE.ConeGeometry(ISLET.r - 1, 34, 14), 0.25, 3), new THREE.MeshStandardMaterial({ color: '#2b2733', flatShading: true }), 0, -18.5, 0);
    under.rotation.x = Math.PI;
    islet.add(under);
    islet.add(box(3, 0.5, 3, MAT.darkStone, 0, 0.25, 0));
    for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) islet.add(box(0.35, 3, 0.35, MAT.obsidian, x, 1.75, z));
    islet.add(box(3.2, 0.3, 3.2, MAT.obsidian, 0, 3.4, 0));
    const orb = mesh(new THREE.SphereGeometry(0.5, 16, 12), MAT.crystalTeal, 0, 1.8, 0);
    islet.add(orb);
    glow(islet, 0, 1.8, 0, '#05ce91', 5, true);
    addLight(islet, 0, 2, 0, '#05ce91', 6, 16, true);
    anim(islet, (t) => { orb.position.y = 1.8 + Math.sin(t * 1.4) * 0.3; });
    islet.position.set(ISLET.x, isY, ISLET.z);
    root.add(islet);
    reg(islet, false);
    C.addBox(ISLET.x, ISLET.z, 1.5, 1.5, 0, isY - 1, isY + 4);

    // Amethyst Grotto: dome with two openings
    const gy = H(GROTTO.x, GROTTO.z);
    const a1 = Math.atan2(-70 - GROTTO.z, -74 - GROTTO.x), a2 = Math.atan2(-88 - GROTTO.z, -50 - GROTTO.x);
    const p1 = Math.PI - a1, p2 = Math.PI - a2, gap = 0.55;
    const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const arcs = [];
    let s1 = norm(p1 + gap), e1 = norm(p2 - gap); if (e1 < s1) e1 += Math.PI * 2; arcs.push([s1, e1]);
    let s2 = norm(p2 + gap), e2 = norm(p1 - gap); if (e2 < s2) e2 += Math.PI * 2; arcs.push([s2, e2]);
    const caveMat = new THREE.MeshStandardMaterial({ color: '#2b2535', roughness: 1, flatShading: true, side: THREE.DoubleSide });
    const cave = new THREE.Group();
    for (const [s, en] of arcs) {
      const m = new THREE.Mesh(jitter(new THREE.SphereGeometry(GROTTO.r, 22, 10, s, en - s, 0, Math.PI / 2), 0.18, 5), caveMat);
      m.scale.y = 0.7; m.castShadow = true; m.receiveShadow = true;
      cave.add(m);
      for (let a = s; a < en; a += 0.18) C.addCircle(GROTTO.x - Math.cos(a) * GROTTO.r, GROTTO.z + Math.sin(a) * GROTTO.r, 1.3, gy - 2, gy + 9, 'cave');
    }
    for (let i = 0; i < 22; i++) {
      const a = rng() * Math.PI * 2, r = 4 + rng() * 7;
      const c = mesh(new THREE.OctahedronGeometry(0.4 + rng() * 0.7), rng() < 0.6 ? MAT.crystal : MAT.crystalTeal, Math.cos(a) * r, 0.5 + rng() * (i < 8 ? 6 : 0.5), Math.sin(a) * r);
      c.scale.y = 1.8 + rng() * 1.5; c.rotation.z = (rng() - 0.5) * 0.8;
      cave.add(c);
    }
    cave.add(cyl(3.2, 3.2, 0.1, MAT.water, 2, 0.05, 2, 20));
    glow(cave, 0, 3, 0, '#a855f7', 10, true);
    addLight(cave, 0, 4, 0, '#a855f7', 9, 22, true);
    cave.position.set(GROTTO.x, gy - 0.4, GROTTO.z);
    root.add(cave);
    reg(cave);

    // Obsidian Ruins
    const ruins = new THREE.Group();
    ruins.add(cyl(13, 13.3, 0.5, MAT.stone, 0, 0, 0, 28));
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2, x = Math.cos(a) * 11, z = Math.sin(a) * 11;
      if (i === 4) { const f = cyl(0.55, 0.55, 6, MAT.stone, x, 0.6, z + 2); f.rotation.z = Math.PI / 2; ruins.add(f); continue; }
      const h = i % 3 === 0 ? 2 + rng() * 2 : 6;
      ruins.add(cyl(0.55, 0.65, h, MAT.stone, x, h / 2, z, 12));
      if (h > 5) ruins.add(box(1.5, 0.5, 1.5, MAT.stone, x, h + 0.25, z));
      C.addCircle(-120 + x, -40 + z, 0.8, -50, 200, 'ruin');
    }
    const st = new THREE.Group(); scorpionStatue(st, 1.4, true); st.rotation.set(0.1, 0.8, 0.12); ruins.add(st);
    for (let i = 0; i < 5; i++) ruins.add(box(5, 0.4, 1.2, MAT.stone, 0, -0.1 + i * 0.35, 14 - i * 0.8));
    const obs = new THREE.Group();
    obs.add(cyl(4, 4.3, 3, MAT.stone, 0, 1.5, 0, 16));
    obs.add(mesh(new THREE.SphereGeometry(4, 16, 8, 0, Math.PI * 1.1, 0, Math.PI / 2), MAT.roofSlate, 0, 3, 0));
    const tel = cyl(0.4, 0.5, 5, MAT.gold, 5.5, 0.6, 1); tel.rotation.z = Math.PI / 2.3; obs.add(tel);
    obs.position.set(-20, 0, -18);
    ruins.add(obs);
    C.addCircle(-140, -58, 4.3, -50, 200, 'ruin');
    C.addCircle(-120, -40, 2.2, -50, 200, 'statue');
    place(ruins, -120, -40, -0.1);
    reg(ruins);

    // natural stone arch
    const arch = mesh(jitter(new THREE.TorusGeometry(7, 1.6, 8, 24, Math.PI), 0.25, 8), new THREE.MeshStandardMaterial({ color: '#3d3945', flatShading: true }));
    place(arch, -131, 5, -1.2, Math.PI / 2 + 0.1);
    reg(arch);
    C.addCircle(-131 + Math.sin(0.1) * 7, 5 + Math.cos(0.1) * 7, 1.8);
    C.addCircle(-131 - Math.sin(0.1) * 7, 5 - Math.cos(0.1) * 7, 1.8);

    // Scorpion's Crown summit
    const crown = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sp = cone(1.2, 5 + (i % 3) * 2, MAT.obsidian, Math.cos(a) * 6.5, 2.5, Math.sin(a) * 6.5, 6);
      sp.rotation.z = Math.cos(a) * -0.25; sp.rotation.x = Math.sin(a) * 0.25;
      crown.add(sp);
      C.addCircle(10 + Math.cos(a) * 6.5, -20 + Math.sin(a) * 6.5, 1.1);
    }
    crown.add(cyl(0.8, 1.1, 1.2, MAT.darkStone, 0, 0.6, 0, 8));
    fire(crown, 0, 1.2, 0, 1.4);
    place(crown, 10, -20, -0.3);
    reg(crown, false);

    // shipwreck
    const wreck = new THREE.Group();
    const hull = mesh(new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MAT.darkWood);
    hull.scale.set(3.2, 2.4, 9.5); hull.position.y = 2; wreck.add(hull);
    wreck.add(box(5.6, 0.2, 15, MAT.wood, 0, 2, 0));
    const mast = cyl(0.25, 0.3, 9, MAT.darkWood, 0, 6, 1); mast.rotation.z = 0.35; wreck.add(mast);
    const sail = box(0.05, 4, 3.5, MAT.cloth, 1.4, 6.5, 1.5); sail.rotation.z = 0.35; wreck.add(sail);
    lampBox(wreck, 1.6, 3, -5);
    place(wreck, -186, -26, -0.8);
    wreck.rotation.set(-0.15, 0.4, 0.3);
    reg(wreck);
    C.addCircle(-186, -26, 4.5);

    // abandoned camp
    const camp = new THREE.Group();
    const tent = cone(2.2, 2.8, MAT.clothTeal, 3, 1.4, 1.5, 4); tent.rotation.y = Math.PI / 4; camp.add(tent);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; camp.add(mesh(new THREE.DodecahedronGeometry(0.25), MAT.darkStone, Math.cos(a) * 0.8, 0.12, Math.sin(a) * 0.8)); }
    fire(camp, 0, 0.1, 0, 0.9);
    place(camp, 40, -108, 0);
    reg(camp, false);
    C.addCircle(43, -106.5, 1.8);

    // benches & sit spots
    for (const b of BENCHES) {
      const y = H(b.x, b.z);
      const g = new THREE.Group();
      if (b.kind === 'bench') bench(g, 0, 0, 0);
      else if (b.kind === 'rock') g.add(mesh(new THREE.DodecahedronGeometry(0.6), MAT.darkStone, 0, 0.1, 0));
      else { const l = cyl(0.35, 0.35, 2, MAT.bark, 0, 0.2, 0, 8); l.rotation.z = Math.PI / 2; g.add(l); }
      g.position.set(b.x, y, b.z); g.rotation.y = b.rot;
      root.add(g);
      e.seats.push({ x: b.x, y: y + 0.45, z: b.z, rot: b.rot, kind: b.kind });
    }
    const deck = new THREE.Group();
    deck.add(box(6, 0.3, 4, MAT.wood, 0, 0.15, 0));
    for (const x of [-3, 3]) deck.add(box(0.12, 1, 4, MAT.darkWood, x, 0.8, 0));
    deck.add(box(6, 1, 0.12, MAT.darkWood, 0, 0.8, 2));
    lampBox(deck, 2.8, 1.5, 2);
    place(deck, 86, 167, 0, Math.atan2(72 - 86, 195 - 167));
    reg(deck, false);

    // hidden hollow
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2;
      if (Math.abs(a - 0.2) < 0.25) continue;
      const x = -150 + Math.cos(a) * 12, z = -100 + Math.sin(a) * 12;
      const rk = mesh(jitter(new THREE.DodecahedronGeometry(2.4, 0), 0.3, i), MAT.darkStone);
      rk.scale.y = 2.6;
      place(rk, x, z, 2);
      C.addCircle(x, z, 2.2);
    }
    const bloom = new THREE.Group();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const p = mesh(new THREE.SphereGeometry(0.5, 10, 8).scale(0.4, 0.1, 1.2), MAT.crystalTeal, Math.sin(a) * 0.6, 0.8, Math.cos(a) * 0.6); p.rotation.y = a; bloom.add(p); }
    glow(bloom, 0, 0.9, 0, '#05ce91', 4, true);
    place(bloom, -146, -96, 0);

    // underside details
    const hg = new THREE.OctahedronGeometry(1, 0).scale(0.4, 2.2, 0.4);
    const rootMat = new THREE.MeshStandardMaterial({ color: '#3a2a1e', roughness: 1 });
    for (let i = 0; i < 80; i++) {
      const t = 0.05 + rng() * 0.75, a = rng() * Math.PI * 2;
      if (i < 55) {
        const rr = R * Math.pow(1 - t, 1.25) * 0.88;
        const m = new THREE.Mesh(hg, rng() < 0.4 ? MAT.crystalTeal : MAT.crystal);
        m.position.set(Math.cos(a) * rr, -15 - t * 170, Math.sin(a) * rr); m.scale.setScalar(1 + rng() * 3.5);
        root.add(m);
      } else {
        const l = 6 + rng() * 16;
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.5, l, 5), rootMat);
        m.position.set(Math.cos(a) * R * 0.97, -14 - rng() * 6 - l / 2, Math.sin(a) * R * 0.97);
        root.add(m);
      }
    }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(4, 0.4, 140, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#8b5cf6', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = -250;
    root.add(beam);
    e.anims.push((t) => { beam.material.opacity = 0.18 + Math.sin(t * 0.8) * 0.07; });
    const tip = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#a855f7', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    tip.position.y = -182; tip.scale.setScalar(40); root.add(tip);

    // floating rocks and tiny islets
    const orbit = new THREE.Group();
    scene.add(orbit);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#3a3542', flatShading: true });
    const grassTop = new THREE.MeshStandardMaterial({ color: '#2e6135', flatShading: true });
    const floaters = [];
    for (let i = 0; i < 30; i++) {
      const a = rng() * Math.PI * 2, r = 235 + rng() * 110, s = 2 + rng() * (i < 6 ? 12 : 6);
      const g = new THREE.Group();
      const rk = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(1, 0), 0.35, i), rockMat);
      rk.scale.set(s, s * 1.3, s);
      g.add(rk);
      if (i < 6) {
        const topM = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.95, s * 0.8, s * 0.3, 8), grassTop);
        topM.position.y = s * 0.95; g.add(topM);
        g.add(cyl(0.2, 0.3, s * 0.8, MAT.bark, 0, s * 1.4, 0, 5));
        g.add(mesh(new THREE.IcosahedronGeometry(s * 0.4, 0), MAT.leafViolet, 0, s * 1.9, 0));
        const wf = new THREE.Mesh(new THREE.PlaneGeometry(s * 0.25, s * 4), new THREE.MeshBasicMaterial({ color: '#9fe8f0', transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false }));
        wf.position.set(s * 0.9, -s, 0); wf.rotation.y = Math.PI / 2; g.add(wf);
      }
      g.position.set(Math.cos(a) * r, -60 + rng() * 110, Math.sin(a) * r);
      g.userData = { by: g.position.y, ph: rng() * 6, sp: 0.2 + rng() * 0.4 };
      orbit.add(g);
      floaters.push(g);
    }
    const chainMat = new THREE.MeshStandardMaterial({ color: '#4b4652', metalness: 0.6, roughness: 0.5 });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      const from = new V(Math.cos(a) * R * 0.8, -40, Math.sin(a) * R * 0.8);
      const to = new V(Math.cos(a) * (R + 45), -70, Math.sin(a) * (R + 45));
      const frag = new THREE.Mesh(jitter(new THREE.DodecahedronGeometry(8, 0), 0.3, k + 40), rockMat);
      frag.position.copy(to); root.add(frag);
      const n = Math.floor(from.distanceTo(to) / 1.6);
      const links = new THREE.InstancedMesh(new THREE.TorusGeometry(0.6, 0.18, 5, 10), chainMat, n);
      const o = new THREE.Object3D();
      for (let i = 0; i < n; i++) { o.position.lerpVectors(from, to, i / n); o.position.y -= Math.sin((i / n) * Math.PI) * 8; o.lookAt(to); o.rotateZ(((i % 2) * Math.PI) / 2); o.updateMatrix(); links.setMatrixAt(i, o.matrix); }
      links.computeBoundingSphere();
      root.add(links);
    }
    e.anims.push((t, n, w, dt) => {
      orbit.rotation.y += dt * 0.004;
      for (const g of floaters) { g.position.y = g.userData.by + Math.sin(t * g.userData.sp + g.userData.ph) * 3; g.rotation.y += dt * 0.02; }
    });

    // harvestable moonshards
    this.shards = [];
    const shardMat = new THREE.MeshStandardMaterial({ color: '#7ff5d4', emissive: '#05ce91', emissiveIntensity: 1.2, roughness: 0.1 });
    const pts = PATHS.slice(0, 9).flatMap((p) => sampleCurve(p.pts, 25));
    for (let i = 0; i < pts.length && this.shards.length < 20; i += 2) {
      const [px, pz] = pts[i];
      const off = 4 + rng() * 4, a = rng() * Math.PI * 2;
      const x = px + Math.cos(a) * off, z = pz + Math.sin(a) * off, y = H(x, z);
      if (y < WATER + 0.5 || Math.hypot(x - SPAWN.x, z - SPAWN.z) < 6) continue;
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), shardMat);
      m.scale.y = 1.8;
      m.position.set(x, y + 0.9, z);
      root.add(m);
      this.shards.push({ mesh: m, x, y, z, respawn: 0 });
    }
    e.anims.push((t, n, w, dt) => {
      for (const s of this.shards) {
        if (!s.mesh.visible) { s.respawn -= dt; if (s.respawn <= 0) s.mesh.visible = true; continue; }
        s.mesh.rotation.y = t * 1.5; s.mesh.position.y = s.y + 0.9 + Math.sin(t * 2 + s.x) * 0.15;
      }
    });
  }
}