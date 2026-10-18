import * as THREE from 'three';
import { CATALOG, instantiate } from './catalog';
import { walkables, zoneAt, floorOf, roomAt } from './layout';
import { loadModel } from '../studio/GlbAvatar';

const uid = () => Math.random().toString(36).slice(2, 10);
const DEF = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sx: 1, sy: 1, sz: 1, hidden: false, locked: false, color: null, group: null };
const FIELDS = ['id', 'key', 'type', 'name', 'asset_id', 'asset_uri', 'x', 'y', 'z', 'rx', 'ry', 'rz', 'sx', 'sy', 'sz', 'color', 'hidden', 'locked', 'group', 'model_asset_id', 'model_uri', 'model_name', 'model_fit'];
export const ASSET_DEF = { name: 'Imported Model', cat: 'Imported Models', place: 'floor', solid: true };
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
      loadModel(o.asset_uri).then((g) => {
        if (o.node !== node) return;
        const m = g.scene.clone(true); m.updateMatrixWorld(true);
        m.traverse((c) => { if (c.isMesh) { c.castShadow = c.receiveShadow = true; } });
        o.box = new THREE.Box3().setFromObject(m); node.remove(ph); node.add(m);
        this.apply(o); this.rev++; this.R.emit();
      }).catch(() => { o.error = 'Model failed to load'; this.R.emit(); });
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
    o.node = node; o.proto = proto; o.box = proto.box; o.error = null; node.add(stand); // original shows until the model arrives
    loadModel(o.model_uri).then((g) => {
      if (o.node !== node) return;
      const m = g.scene.clone(true); m.updateMatrixWorld(true);
      m.traverse((c) => { if (c.isMesh) c.castShadow = c.receiveShadow = true; });
      const b = proto.box, mb = new THREE.Box3().setFromObject(m), ms = mb.getSize(new THREE.Vector3());
      const k = o.model_fit === false ? 1 : Math.min((b.max.x - b.min.x) / (ms.x || 1), (b.max.z - b.min.z) / (ms.z || 1), (b.max.y - b.min.y) / (ms.y || 1) * 1.15);
      m.scale.multiplyScalar(k);
      m.position.set((b.max.x + b.min.x) / 2 - ((mb.max.x + mb.min.x) / 2) * k, b.min.y - mb.min.y * k, (b.max.z + b.min.z) / 2 - ((mb.max.z + mb.min.z) / 2) * k);
      node.remove(stand); node.add(m); node.updateMatrixWorld(true); this.rev++; this.R.emit();
    }).catch(() => { o.error = 'Upgrade model failed to load — showing the original piece'; this.R.emit(); });
  }

  recolor(o) {
    const main = o.proto?.main; if (!main) return;
    for (const m of o.node.children) {
      if (!m.isMesh || (m.material !== main && !m.userData.mainClone)) continue;
      if (!o.color) { if (m.userData.mainClone) m.material.dispose(); m.material = main; m.userData.mainClone = false; continue; }
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
    if (o.col) { C.remove(o.col); o.col = null; }
    if (o.walk) { const i = walkables.indexOf(o.walk); if (i >= 0) walkables.splice(i, 1); o.walk = null; }
    const def = this.def(o); if (o.hidden || !def) return;
    const b = o.box, hw = ((b.max.x - b.min.x) / 2) * o.sx, hd = ((b.max.z - b.min.z) / 2) * o.sz;
    const lx = ((b.max.x + b.min.x) / 2) * o.sx, lz = ((b.max.z + b.min.z) / 2) * o.sz, c = Math.cos(o.ry), s = Math.sin(o.ry);
    const wx = o.x + lx * c + lz * s, wz = o.z - lx * s + lz * c;
    o.foot = { x: wx, z: wz, hw, hd, rot: o.ry };
    const place = def.place || 'floor';
    if (def.solid !== false && place === 'floor' && hw > 0.12 && hd > 0.12) o.col = C.addBox(wx, wz, hw * 0.9, hd * 0.9, o.ry, o.y - 0.3, o.y + b.max.y * o.sy, 'set');
    if (def.walk) { o.walk = { x: wx, z: wz, hw, hd, rot: o.ry, y: o.y + def.walk * o.sy }; walkables.push(o.walk); }
  }

  remove(id) {
    const o = this.items.get(id); if (!o) return;
    this.root.remove(o.node); o.hidden = true; this.physics(o); this.items.delete(id); this.rev++;
  }
  clear() { for (const id of [...this.items.keys()]) this.remove(id); }
  load(list) { this.clear(); for (const d of list || []) this.add(d); }
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
    return def.anchors.map(([kind, label, ax, ay, az, ary = 0]) => ({ kind, label, x: o.x + ax * o.sx * c + az * o.sz * s, y: o.y + ay * o.sy, z: o.z - ax * o.sx * s + az * o.sz * c, yaw: o.ry + ary, o }));
  }
}