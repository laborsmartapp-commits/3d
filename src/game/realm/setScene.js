import * as THREE from 'three';
import { CATALOG, instantiate } from './catalog';
import { walkables, zoneAt, floorOf, roomAt } from './layout';
import { loadModel } from '../studio/GlbAvatar';
import { prepareModel, getFit, putFit } from './modelPrep';
import { pbrMaterial } from './pbr';

const uid = () => Math.random().toString(36).slice(2, 10);
const DEF = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1, hidden: false, locked: false, color: null, group: null };
const FIELDS = ['id', 'key', 'type', 'name', 'asset_id', 'asset_uri', 'x', 'y', 'z', 'rx', 'ry', 'rz', 'sx', 'sy', 'sz', 'color', 'hidden', 'locked', 'group', 'model_asset_id', 'model_uri', 'model_name', 'model_fit', 'finish'];
// Furniture finish -> [material kind, default colour] (matches FURNITURE_FINISHES in the stage capability registry).
export const FINISH = { velvet: ['velvet'], boucle: ['boucle', '#efe9df'], linen: ['linen'], leather: ['fine_leather', '#6b4430'], walnut: ['fine_wood', '#6a452c'], oak: ['fine_wood', '#b8875a'], ebony: ['fine_wood', '#2a1d16'], lacquer: ['lacquer'], marble: ['marble', '#f2efe9'], travertine: ['travertine', '#d9c8a9'], brass: ['brass', '#c9a24f'], chrome: ['chrome', '#e8ecef'], glass: ['glass', '#cfe6f2'] };
export const ASSET_DEF = { name: 'Imported Model', cat: 'Imported Models', place: 'floor', solid: true };
// A model that never finishes loading falls back to the original piece instead of waiting forever.
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);
const r4 = (v) => (typeof v === 'number' ? Math.round(v * 10000) / 10000 : v);

// The editable scene graph: every furnishing is an instance with its own id, transform and state.
export class SetScene {
  constructor(R) { this.R = R; this.e = R.e; this.items = new Map(); this.root = new THREE.Group(); this.root.name = 'set'; R.e.scene.add(this.root); this.rev = 0; }
  get list() { return [...this.items.values()]; }
  def(o) { return o.type === 'asset' ? ASSET_DEF : CATALOG[o.type]; }
  get(id) { return this.items.get(id); }

  add(d) {
    if (d.type !== 'asset' && !CATALOG[d.type]) return null;
    const o = { ...DEF, ...d, id: d.id || uid() };
    o.orig ||= { x: o.x, y: o.y, z: o.z, rx: o.rx, ry: o.ry, rz: o.rz, sx: o.sx, sy: o.sy, sz: o.sz };
    this.items.set(o.id, o); this.build(o); this.apply(o); this.rev++;
    return o;
  }

  build(o) {
    if (o.node) this.root.remove(o.node);
    if (o.type === 'asset') {
      o.node = new THREE.Group(); o.proto = null;
      o.box = new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 0.6, 0.3));
      const ph = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6).translate(0, 0.3, 0), new THREE.MeshStandardMaterial({ color: '#05cc8d', wireframe: true }));
      o.node.add(ph);
      const node = o.node;
      o.loading = true;
      const t0 = performance.now();
      loadModel(o.asset_uri).then(async (g) => {
        if (o.node !== node) return;
        this.e.prof?.asset(`${o.name || 'model'} download+parse`, t0, true);
        const { m } = prepareModel(g), t1 = performance.now();
        await this.e.renderer.compileAsync(m, this.e.camera, this.e.scene).catch(() => {});
        this.e.prof?.asset(`${o.name || 'model'} shader compile`, t1, true);
        if (o.node !== node) return;
        o.box = new THREE.Box3().setFromObject(m); node.remove(ph); node.add(m); o.loading = false;
        this.apply(o); this.rev++; this.R.emit();
      }).catch(() => { if (o.node !== node) return; o.loading = false; o.error = 'Model failed to load'; this.R.emit(); });
    } else if (o.model_uri) this.buildUpgrade(o);
    else { const { node, proto } = instantiate(o.type); o.node = node; o.proto = proto; o.box = proto.box; }
    o.node.userData.setId = o.id; o.node.rotation.order = 'YXZ';
    this.root.add(o.node);
    this.recolor(o);
  }

  // Visual upgrade: a catalog piece shown with an imported GLB/GLTF. The catalog type still owns the
  // footprint, collision, walk height, light markers and interaction anchors, so the instance keeps its
  // transform, id and saved-layout slot; only the visual changes. The model is fitted to the piece's
  // original footprint (model_fit !== false) and sits on its base, so swapping never moves the layout.
  buildUpgrade(o) {
    const { node: stand, proto } = instantiate(o.type), node = new THREE.Group();
    o.node = node; o.proto = proto; o.box = proto.box; o.cal = null; o.error = null; o.loading = true; node.add(stand); // original shows until the model arrives
    const t0 = performance.now();
    withTimeout(loadModel(o.model_uri), 45000).then(async (g) => {
      if (o.node !== node) return; // superseded by a newer swap/restore
      this.e.prof?.asset(`${o.model_name || o.type} download+parse`, t0, true);
      const { m } = prepareModel(g), t1 = performance.now(); // lights/cameras stripped: see modelPrep.js
      // Shader programs for the model's materials are prepared before it is shown.
      await this.e.renderer.compileAsync(m, this.e.camera, this.e.scene).catch(() => {});
      this.e.prof?.asset(`${o.model_name || o.type} shader compile`, t1, true);
      if (o.node !== node) return;
      const f = getFit(o) || putFit(o, this.fit(o, proto, m));
      m.scale.multiplyScalar(f.k); m.position.fromArray(f.pos); m.updateMatrixWorld(true);
      o.box = f.box.clone(); o.cal = f.cal; o.loading = false;
      node.remove(stand); node.add(m); this.apply(o); this.rev++; this.R.emit();
    }).catch(() => { if (o.node !== node) return; o.loading = false; o.error = 'Model failed to load — showing the original piece'; this.R.emit(); });
  }

  // Fit the model to the piece's original footprint, uniform scale only (proportions are never distorted),
  // then recalibrate collision bounds and anchors against the visible model. Cached per (type, model).
  fit(o, proto, m) {
    const b = proto.box, mb = new THREE.Box3().setFromObject(m), ms = mb.getSize(new THREE.Vector3());
    const k = o.model_fit === false ? 1 : Math.min((b.max.x - b.min.x) / (ms.x || 1), (b.max.z - b.min.z) / (ms.z || 1), (b.max.y - b.min.y) / (ms.y || 1) * 1.15);
    const pos = [(b.max.x + b.min.x) / 2 - ((mb.max.x + mb.min.x) / 2) * k, b.min.y - mb.min.y * k, (b.max.z + b.min.z) / 2 - ((mb.max.z + mb.min.z) / 2) * k];
    const s0 = m.scale.clone(), p0 = m.position.clone();
    m.scale.multiplyScalar(k); m.position.fromArray(pos); m.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(m), tmp = { ...o, box };
    const cal = this.calibrate(tmp, m);
    m.scale.copy(s0); m.position.copy(p0); m.updateMatrixWorld(true);
    return { k, pos, box, cal };
  }

  // Seat anchors move onto the model's actual cushion: sample heights front-to-back at the anchor's
  // side position, take the lowest raised surface in the front 70% as the seat. Other anchors stay put,
  // clamped inside the model's footprint. Labels/kinds (the anchor identity) never change.
  calibrate(o, m) {
    const def = this.def(o); if (!def?.anchors) return null;
    const bx = o.box, ray = new THREE.Raycaster(), down = new THREE.Vector3(0, -1, 0), top = bx.max.y + 1;
    const h = (x, z) => { ray.set(new THREE.Vector3(x, top, z), down); const hit = ray.intersectObject(m, true)[0]; return hit ? hit.point.y : null; };
    const cl = (v, a, b) => Math.min(b - 0.08, Math.max(a + 0.08, v));
    return def.anchors.map(([kind, label, ax, ay, az, ary = 0]) => {
      const x = cl(ax, bx.min.x, bx.max.x);
      if (kind !== 'sit') return [kind, label, x, ay, cl(az, bx.min.z, bx.max.z), ary];
      const n = 14, pts = [];
      for (let i = 0; i < n; i++) { const z = bx.max.z - ((bx.max.z - bx.min.z) * (i + 0.5)) / n, y = h(x, z); if (y != null && y > bx.min.y + 0.2) pts.push({ z, y }); }
      const front = pts.filter((p) => p.z > bx.max.z - (bx.max.z - bx.min.z) * 0.7);
      if (!front.length) return [kind, label, x, ay, cl(az, bx.min.z, bx.max.z), ary];
      const seat = Math.min(...front.map((p) => p.y)), on = front.filter((p) => p.y < seat + 0.05);
      return [kind, label, x, seat, on.reduce((s, p) => s + p.z, 0) / on.length, ary];
    });
  }

  recolor(o) {
    const main = o.proto?.main; if (!main) return;
    // A furniture finish (velvet, walnut, marble...) replaces the piece's main surface material.
    // A Stage Creator PBR texture set bound to the finish (R.texSets) takes precedence over the procedural one.
    const fk = FINISH[o.finish], ts = this.R.texSets?.[o.finish];
    const fin = ts ? pbrMaterial(ts, { color: o.color, repeat: Math.max(1, Math.round(1 / ts.tile_m)) }) : fk && this.R.M.tint(fk[0], o.color || fk[1] || `#${main.color.getHexString()}`);
    for (const m of o.node.children) {
      if (!m.isMesh || (m.material !== main && !m.userData.mainClone && !m.userData.finish)) continue;
      if (m.userData.mainClone) m.material.dispose();
      m.userData.mainClone = false; m.userData.finish = !!fin;
      if (fin) { m.material = fin; continue; }
      if (!o.color) { m.material = main; continue; }
      if (!m.userData.mainClone) { m.material = main.clone(); m.userData.mainClone = true; }
      m.material.color.set(o.color);
      if (m.material.sheenColor) m.material.sheenColor.set(o.color).lerp(new THREE.Color('#ffffff'), 0.35);
    }
  }

  apply(o) {
    const n = o.node;
    n.position.set(o.x, o.y, o.z); n.rotation.set(o.rx, o.ry, o.rz); n.scale.set(o.sx, o.sy, o.sz); n.visible = !o.hidden;
    n.updateMatrixWorld(true);
    const rm = roomAt(o.x, o.z, o.y + 0.2);
    o.room = zoneAt(o.x, o.z, o.y + 0.2); o.roomId = rm?.id || null; o.floor = floorOf(o.x, o.z, o.y + 0.2);
    this.physics(o);
  }

  physics(o) {
    const C = this.e.colliders;
    for (const k of o.cols || []) C.remove(k);
    o.col = null; o.cols = null;
    if (o.walk) { const i = walkables.indexOf(o.walk); if (i >= 0) walkables.splice(i, 1); o.walk = null; }
    const def = this.def(o); if (o.hidden || !def) return;
    const b = o.box, hw = ((b.max.x - b.min.x) / 2) * o.sx, hd = ((b.max.z - b.min.z) / 2) * o.sz;
    const lx = ((b.max.x + b.min.x) / 2) * o.sx, lz = ((b.max.z + b.min.z) / 2) * o.sz, c = Math.cos(o.ry), s = Math.sin(o.ry);
    const wx = o.x + lx * c + lz * s, wz = o.z - lx * s + lz * c;
    o.foot = { x: wx, z: wz, hw, hd, rot: o.ry };
    const place = def.place || 'floor';
    if (def.solid !== false && place === 'floor' && hw > 0.12 && hd > 0.12) {
      const y0 = o.y - 0.3, y1 = o.y + b.max.y * o.sy;
      // Irregular pieces (L-sectional, grand piano...) declare compound boxes; others use 90% of their bounds.
      const parts = def.cols
        ? def.cols.map(([cx, cz, bw, bd]) => [o.x + cx * o.sx * c + cz * o.sz * s, o.z - cx * o.sx * s + cz * o.sz * c, Math.max(0.05, bw * o.sx - 0.04), Math.max(0.05, bd * o.sz - 0.04)])
        : [[wx, wz, hw * 0.9, hd * 0.9]];
      o.cols = parts.map(([x, z, a, d]) => Object.assign(C.addBox(x, z, a, d, o.ry, y0, y1, 'set'), { owner: o.id, label: def.name }));
      o.col = o.cols[0];
    }
    if (def.walk) { o.walk = { x: wx, z: wz, hw, hd, rot: o.ry, y: o.y + def.walk * o.sy }; walkables.push(o.walk); }
  }

  remove(id) {
    const o = this.items.get(id); if (!o) return;
    this.root.remove(o.node); o.hidden = true; this.physics(o); this.items.delete(id); this.rev++;
  }
  clear() { for (const id of [...this.items.keys()]) this.remove(id); }
  load(list) {
    const P = this.e.prof; if (!P) { this.clear(); for (const d of list || []) this.add(d); return; }
    P.sync('  set: clear previous', () => this.clear());
    const byType = {}; let t;
    for (const d of list || []) { t = performance.now(); this.add(d); const k = d.model_uri ? `${d.type}+model` : d.type; byType[k] = (byType[k] || 0) + performance.now() - t; }
    const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 6);
    for (const [k, v] of top) P.phases.push({ name: `  set: build ${k}`, kind: 'detail', ms: Math.round(v * 10) / 10, at: Math.round(t - P.t0) });
  }
  data(o) { const d = {}; for (const f of FIELDS) if (o[f] !== undefined && o[f] !== null) d[f] = r4(o[f]); return d; }
  serialize() { return this.list.map((o) => this.data(o)); }

  tick(t, env) { for (const o of this.items.values()) { const tk = o.proto?.def.tick; if (tk && o.node.visible && !o.model_uri) tk(o.node.userData.lives, t, env); } }

  // World positions of light markers on visible objects (lamps, string lights, party fixtures...).
  lights() {
    const out = [], v = new THREE.Vector3();
    for (const o of this.items.values()) { if (o.hidden || !o.node.visible || !o.proto?.lights.length) continue; for (const l of o.proto.lights) { v.set(l.x, l.y, l.z).applyMatrix4(o.node.matrixWorld); out.push({ kind: l.kind, x: v.x, y: v.y, z: v.z, o }); } }
    return out;
  }

  anchors(o) {
    const def = this.def(o); if (!def?.anchors) return [];
    const c = Math.cos(o.ry), s = Math.sin(o.ry);
    return (o.model_uri && o.cal ? o.cal : def.anchors).map(([kind, label, ax, ay, az, ary = 0]) => ({ kind, label, x: o.x + ax * o.sx * c + az * o.sz * s, y: o.y + ay * o.sy, z: o.z - ax * o.sx * s + az * o.sz * c, yaw: o.ry + ary, o }));
  }
}