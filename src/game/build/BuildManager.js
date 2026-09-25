import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { DEFS, footprint } from './catalog';
import { CTX, MAT } from './builders';
import { WATER, VILLAGE } from '../world/layout';

const V = THREE.Vector3;
const SMALL = (def) => def.cat === 'decor' || def.cat === 'lights';

export class BuildManager {
  constructor(e) {
    this.e = e;
    this.objects = new Map();
    this.statics = new Map();
    this.stored = [];
    this.ghost = null; this.ghostDef = null; this.ghostTier = 1;
    this.rot = 0; this.moving = null; this.fromStored = null; this.selected = null; this.devPlace = false;
    this.ghostPos = new V(); this.touchPoint = null;
    this.valid = { ok: false, reason: '' };
    this.ghostMat = new THREE.MeshBasicMaterial({ color: '#05ce91', transparent: true, opacity: 0.4, depthWrite: false });
    this.ray = new THREE.Raycaster();
    this.ray.camera = e.camera;
    this.outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([new V(), new V(), new V(), new V()]), new THREE.LineBasicMaterial({ color: '#05ce91', depthTest: false }));
    this.outline.visible = false;
    this.outline.frustumCulled = false;
    e.scene.add(this.outline);
    this.helper = null;
  }

  corners(x, z, w, d, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([lx, lz]) => [x + lx * c + lz * s, z - lx * s + lz * c]).concat([[x, z]]);
  }

  baseY(def, x, z, rot, tier) {
    if (SMALL(def)) return this.e.groundAt(x, z);
    const [w, d] = footprint(def, tier);
    const hs = this.corners(x, z, w, d, rot).map(([cx, cz]) => this.e.groundAt(cx, cz));
    return (Math.min(...hs) + Math.max(...hs)) / 2;
  }

  instantiate(def, { id, x, z, rot = 0, tier = 1, scale = 1, isStatic = false, y = null }) {
    const e = this.e;
    const winMat = MAT.window.clone();
    CTX.win = winMat;
    const g = def.build(tier);
    CTX.win = MAT.window;
    const [w, d] = footprint(def, tier);
    const by = y ?? this.baseY(def, x, z, rot, tier);
    g.position.set(x, by, z);
    g.rotation.y = rot;
    g.scale.setScalar(scale);
    e.scene.add(g);
    g.updateMatrixWorld(true);
    const obj = { id, def, tier, scale, group: g, winMat, x, z, rot, y: by, colliders: [], inters: [], lights: [], fires: [], anims: g.userData.anim || [], isStatic, built: 1, doorUntil: 0 };
    const C = e.colliders;
    if (def.collide === 'box') obj.colliders.push(C.addBox(x, z, (w / 2) * scale * 0.95, (d / 2) * scale * 0.95, rot, by - 3, by + 40, 'struct'));
    else if (def.collide === 'circle') obj.colliders.push(C.addCircle(x, z, (Math.min(w, d) / 2) * scale * 0.7, by - 3, by + 30, 'struct'));
    if (!SMALL(def)) e.occluders.push(g);
    const toW = (p) => new V(...p).applyMatrix4(g.matrixWorld);
    for (const L of g.userData.lights || []) obj.lights.push(e.lightPool.add({ pos: toW(L.p), color: L.color, intensity: L.intensity, dist: L.dist, always: L.always }));
    for (const f of g.userData.fires || []) { const p = toW(f); e.fires.push(p); obj.fires.push(p); }
    const I = (it) => obj.inters.push(e.interact.add(it));
    for (const s of g.userData.seats || []) { const p = toW([s[0], s[1], s[2]]); const st = { x: p.x, y: p.y, z: p.z, rot: rot + s[3] }; I({ verb: 'Sit', label: def.name, radius: 1.6, pos: p, action: () => e.player.sitAt(st) }); }
    if (g.userData.door) I({ verb: 'Open', label: def.name, radius: 2.2, pos: toW(g.userData.doorLocal), action: () => { obj.doorUntil = e.time + 4; e.audio.burst({ type: 'bandpass', freq: 400, dur: 0.3, vol: 0.15 }); } });
    if (def.interact === 'sign') I({ verb: 'Read', label: def.name, radius: 2, pos: new V(x, by, z), action: () => e.notify('Duskmere — where the Scorpion Moon rises over still water.') });
    if (def.interact === 'portal') I({ verb: 'Visit', label: 'Star Portal', radius: 3, pos: new V(x, by, z), action: () => e.onPanel('directory') });
    if (def.interact === 'shrine') I({ verb: 'Inspect', label: def.name, radius: 2.5, pos: new V(x, by, z), action: () => e.notify('The shrine hums softly. The island is watching over you.') });
    return obj;
  }

  destroy(obj) {
    const e = this.e;
    e.scene.remove(obj.group);
    obj.colliders.forEach((c) => e.colliders.remove(c));
    const oi = e.occluders.indexOf(obj.group); if (oi >= 0) e.occluders.splice(oi, 1);
    obj.lights.forEach((l) => e.lightPool.remove(l));
    obj.fires.forEach((f) => { const i = e.fires.indexOf(f); if (i >= 0) e.fires.splice(i, 1); });
    obj.inters.forEach((it) => e.interact.remove(it));
    obj.winMat.dispose();
  }

  addRecord(r) {
    const def = DEFS[r.type];
    if (!def) return null;
    const obj = this.instantiate(def, { id: r.id, x: r.x, z: r.z, rot: r.rotation || 0, tier: r.tier || 1, scale: r.scale || 1 });
    obj.rec = r;
    this.objects.set(r.id, obj);
    return obj;
  }

  placeStatic(defId, x, z, rot, opts = {}) {
    const obj = this.instantiate(DEFS[defId], { id: opts.id, x, z, rot, isStatic: true, y: opts.y });
    this.statics.set(opts.id, obj);
    return obj;
  }

  clear() { this.cancel(); for (const o of this.objects.values()) this.destroy(o); this.objects.clear(); this.stored = []; }
  playerCount() { return this.objects.size; }
  storedList() { return this.stored.map((r) => ({ id: r.id, name: DEFS[r.type]?.name || r.type, type: r.type })); }

  tick(dt) {
    const e = this.e, night = e.env.night, t = e.time, w = e.env.p.wind, h = e.env.hour;
    const run = (o) => {
      for (const fn of o.anims) fn(t, night, w, dt);
      const door = o.group.userData.door;
      if (door) door.rotation.y += ((o.doorUntil > t ? -1.4 : 0) - door.rotation.y) * Math.min(1, dt * 5);
      const lit = o.lightRule === 'home' ? e.npcs.occupants(o.id) > 0 : o.lightRule === 'shop' ? h > 16 && h < 23.5 : true;
      o.winMat.emissiveIntensity = 0.12 + night * (lit ? 2.4 : 0.05);
      if (o.built < 1) {
        o.built = Math.min(1, o.built + dt / 1.3);
        const k = o.built, s = 1 + 2.7 * Math.pow(k - 1, 3) + 1.7 * Math.pow(k - 1, 2);
        o.group.scale.set(o.scale, o.scale * Math.max(0.02, s), o.scale);
      }
    };
    for (const o of this.statics.values()) run(o);
    for (const o of this.objects.values()) run(o);
  }

  emitState() {
    const s = this.selected;
    this.e.emit({
      build: {
        ghost: this.ghostDef ? { name: this.ghostDef.name, valid: this.valid.ok, reason: this.valid.reason, moving: !!this.moving } : null,
        selected: s ? { id: s.id, name: s.def.name, tier: s.tier, tierName: s.def.tiers?.[s.tier - 1], nextName: s.def.tiers?.[s.tier], canUpgrade: !!s.def.tiers && s.tier < s.def.tiers.length, upgradeCost: s.def.upgradeCost?.[s.tier] } : null,
        devPlace: this.devPlace,
      },
      stored: this.storedList(),
    });
  }

  selectCatalog(defId, opts = {}) {
    this.clearGhost(); this.deselect();
    const def = DEFS[defId];
    this.ghostDef = def; this.ghostTier = opts.tier || 1;
    this.devPlace = !!opts.dev || (this.devPlace && opts.keepDev);
    this.fromStored = opts.fromStored || null; this.moving = opts.moving || null;
    if (opts.rot !== undefined) this.rot = opts.rot;
    CTX.win = this.ghostMat;
    const g = def.build(this.ghostTier);
    CTX.win = MAT.window;
    g.traverse((o) => { if (o.isMesh) { o.material = this.ghostMat; o.castShadow = false; } if (o.isSprite) o.visible = false; });
    this.ghost = g;
    this.e.scene.add(g);
    this.touchPoint = null;
    this.emitState();
  }

  clearGhost() {
    if (this.ghost) this.e.scene.remove(this.ghost);
    this.ghost = null; this.ghostDef = null; this.outline.visible = false;
  }

  cancel() {
    if (this.moving) { const r = this.moving; this.moving = null; this.addRecord(r); }
    this.fromStored = null;
    this.clearGhost(); this.deselect(); this.emitState();
  }

  rotateGhost(deg) { this.rot += (deg * Math.PI) / 180; }

  validate(def, x, z, rot, tier) {
    const e = this.e;
    const bad = (reason) => ({ ok: false, reason });
    const [w, d] = footprint(def, tier);
    const cs = this.corners(x, z, w, d, rot);
    const hs = cs.map(([cx, cz]) => e.groundAt(cx, cz));
    if (hs.some((h) => h < -100)) return bad('Off the island edge');
    if (!def.water && hs.some((h) => h < WATER + 0.4)) return bad('Too close to water');
    if (Math.max(...hs) - Math.min(...hs) > (def.slopeTol || 1.8)) return bad('Terrain too steep');
    let cost = this.moving || this.fromStored ? 0 : def.cost;
    if (!this.devPlace) {
      if (e.readOnly) return bad('Visitors cannot build here');
      if (!SMALL(def)) {
        const plot = e.plots.plotContaining(cs);
        if (!plot) return bad('Must fit within a plot of land');
        if (!e.plots.isOwned(plot)) return bad('Purchase this land first');
        if (cs.some(([cx, cz]) => e.terrain.pathWeight(cx, cz) > 0.55)) return bad('Blocks a road');
      } else {
        const pl = e.plots.plotAt(x, z);
        if (pl && !e.plots.isOwned(pl)) return bad('This land is not yours');
        if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < 34) return bad('Village grounds are protected');
      }
      if (cost > (e.island?.shards || 0)) return bad('Not enough Moonshards');
    } else cost = 0;
    const rad = (Math.hypot(w, d) / 2) * 0.75;
    for (const o of [...this.objects.values(), ...this.statics.values()]) {
      const [ow, od] = footprint(o.def, o.tier);
      if (Math.hypot(o.x - x, o.z - z) < rad + (Math.hypot(ow, od) / 2) * 0.75) return bad('Overlaps a structure');
    }
    for (const o of e.colliders.query(x, z, rad)) if (o.tag !== 'struct' && o.tag !== 'rail' && e.colliders.contains(o, x, z, rad * 0.7)) return bad('Blocked by nature');
    return { ok: true, reason: cost ? `Place for ${cost} Moonshards` : 'Ready to place' };
  }

  update(dt, inp) {
    const e = this.e;
    for (const code of inp.pressed) {
      if (!this.ghost) break;
      if (code === 'KeyQ') this.rotateGhost(-15);
      if (code === 'KeyE' || code === 'KeyR') this.rotateGhost(15);
    }
    if (this.ghost && inp.wheel && inp.keys.has('ShiftLeft')) this.rot += inp.wheel * 0.003;
    for (const c of inp.clicks) {
      if (this.ghost) {
        if (c.touch) { const p = e.pickGround(c.x, c.y); if (p) this.touchPoint = p; }
        else this.place();
      } else this.pick(c);
    }
    if (!this.ghost) return;
    let p = null;
    if (!e.isTouch && e.input.mouse.has) p = e.pickGround(e.input.mouse.x, e.input.mouse.y);
    else p = this.touchPoint || e.rig.bld.focus;
    if (!p) return;
    const def = this.ghostDef;
    this.ghostPos.set(p.x, this.baseY(def, p.x, p.z, this.rot, this.ghostTier), p.z);
    this.ghost.position.copy(this.ghostPos);
    this.ghost.rotation.y = this.rot;
    const v = this.validate(def, p.x, p.z, this.rot, this.ghostTier);
    this.ghostMat.color.set(v.ok ? '#05ce91' : '#ef4444');
    this.ghostMat.opacity = 0.35 + Math.sin(e.time * 4) * 0.08;
    const [w, d] = footprint(def, this.ghostTier);
    const pos = this.outline.geometry.attributes.position;
    this.corners(p.x, p.z, w, d, this.rot).slice(0, 4).forEach(([cx, cz], i) => pos.setXYZ(i, cx, e.groundAt(cx, cz) + 0.15, cz));
    pos.needsUpdate = true;
    this.outline.material.color.set(v.ok ? '#05ce91' : '#ef4444');
    this.outline.visible = true;
    if (v.ok !== this.valid.ok || v.reason !== this.valid.reason) { this.valid = v; this.emitState(); }
  }

  pick(c) {
    if (this.e.readOnly) return;
    this.ray.setFromCamera(new THREE.Vector2(c.x, c.y), this.e.camera);
    const groups = [...this.objects.values()].map((o) => o.group);
    const hit = this.ray.intersectObjects(groups, true).find((h) => h.object.isMesh);
    if (!hit) { this.deselect(); this.emitState(); return; }
    let g = hit.object;
    while (g.parent && !groups.includes(g)) g = g.parent;
    const obj = [...this.objects.values()].find((o) => o.group === g);
    if (obj) this.select(obj);
  }

  select(obj) {
    this.deselect();
    this.selected = obj;
    this.helper = new THREE.BoxHelper(obj.group, '#05ce91');
    this.e.scene.add(this.helper);
    this.emitState();
  }

  deselect() { if (this.helper) { this.e.scene.remove(this.helper); this.helper = null; } this.selected = null; }

  completed(obj) {
    const e = this.e;
    e.audio.build();
    const [w, d] = footprint(obj.def, obj.tier);
    for (let i = 0; i < 6; i++) e.fx.emit(new V(obj.x + (Math.random() - 0.5) * w, obj.y, obj.z + (Math.random() - 0.5) * d), { count: 8, color: '#c9b79a', up: 1.2, spread: 1, life: 1.2 });
    if (!SMALL(obj.def)) { e.notify(`${obj.def.name} constructed`); e.cinematic(new V(obj.x, obj.y + 3, obj.z), Math.max(w, d) + 14, 9, 3.2); }
  }

  async place() {
    const e = this.e, v = this.valid;
    if (!this.ghostDef) return;
    if (!v.ok) { e.audio.error(); e.notify(v.reason); return; }
    const def = this.ghostDef, x = this.ghostPos.x, z = this.ghostPos.z, rot = this.rot;
    const plot = e.plots.plotAt(x, z);
    if (this.moving || this.fromStored) {
      const rec = this.moving || this.fromStored;
      Object.assign(rec, { x, z, rotation: rot, is_stored: false, plot_id: plot?.id || '' });
      const wasStored = !!this.fromStored;
      this.moving = null; this.fromStored = null;
      this.stored = this.stored.filter((r) => r.id !== rec.id);
      const obj = this.addRecord(rec);
      obj.built = 0;
      this.clearGhost();
      this.completed(obj);
      this.emitState();
      await base44.entities.IslandObject.update(rec.id, { x, z, rotation: rot, is_stored: false, plot_id: rec.plot_id });
      if (wasStored) e.notify(`${def.name} placed from storage`);
      return;
    }
    if (!this.devPlace) e.addShards(-def.cost);
    const rec = { island_id: e.island.id, type: def.id, x, z, rotation: rot, scale: 1, tier: 1, is_stored: false, plot_id: plot?.id || '' };
    const tempId = 'tmp_' + Math.random();
    const obj = this.addRecord({ ...rec, id: tempId });
    obj.built = 0;
    if (!SMALL(def)) this.clearGhost();
    this.completed(obj);
    this.emitState();
    const saved = await base44.entities.IslandObject.create(rec);
    this.objects.delete(tempId);
    obj.id = saved.id; obj.rec = saved;
    this.objects.set(saved.id, obj);
  }

  rebuild(obj, changes) {
    const rec = { ...obj.rec, ...changes };
    this.destroy(obj);
    this.objects.delete(obj.id);
    const n = this.addRecord(rec);
    this.select(n);
    return n;
  }

  rotateSel(deg) {
    const o = this.selected; if (!o) return;
    const rotation = (o.rot || 0) + (deg * Math.PI) / 180;
    this.rebuild(o, { rotation });
    base44.entities.IslandObject.update(o.id, { rotation });
  }

  scaleSel(k) {
    const o = this.selected; if (!o) return;
    const scale = Math.max(0.3, Math.min(4, (o.scale || 1) * k));
    this.rebuild(o, { scale });
    base44.entities.IslandObject.update(o.id, { scale });
  }

  upgradeSel() {
    const o = this.selected, e = this.e;
    if (!o || !o.def.tiers || o.tier >= o.def.tiers.length) return;
    const cost = o.def.upgradeCost[o.tier];
    if (cost > e.island.shards) { e.notify('Not enough Moonshards'); e.audio.error(); return; }
    e.addShards(-cost);
    const n = this.rebuild(o, { tier: o.tier + 1 });
    n.built = 0;
    this.completed(n);
    base44.entities.IslandObject.update(o.id, { tier: n.tier });
  }

  moveSel() { const o = this.selected; if (!o) return; this.deselect(); this.destroy(o); this.objects.delete(o.id); this.selectCatalog(o.def.id, { moving: o.rec, rot: o.rot, tier: o.tier, keepDev: true }); }
  duplicateSel() { const o = this.selected; if (!o) return; this.selectCatalog(o.def.id, { rot: o.rot, keepDev: true }); }

  storeSel() {
    const o = this.selected; if (!o) return;
    this.deselect(); this.destroy(o); this.objects.delete(o.id);
    o.rec.is_stored = true;
    this.stored.push(o.rec);
    this.e.notify(`${o.def.name} moved to storage`);
    this.emitState();
    base44.entities.IslandObject.update(o.id, { is_stored: true });
  }

  demolishSel() {
    const o = this.selected, e = this.e; if (!o) return;
    this.deselect(); this.destroy(o); this.objects.delete(o.id);
    const refund = Math.floor(o.def.cost * 0.5);
    e.addShards(refund);
    e.fx.emit(new V(o.x, o.y + 1, o.z), { count: 40, color: '#8a8290', up: 2, spread: 3, life: 1.4 });
    e.notify(`${o.def.name} demolished (+${refund} Moonshards)`);
    this.emitState();
    base44.entities.IslandObject.delete(o.id);
  }

  placeStored(id) { const r = this.stored.find((s) => s.id === id); if (r) this.selectCatalog(r.type, { fromStored: r, tier: r.tier || 1 }); }
}