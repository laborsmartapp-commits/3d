import * as THREE from 'three';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { groundAt, inHouse, F2, SLAB, TOP } from './layout';

const ray = new THREE.Raycaster(), DOWN = new THREE.Vector3(0, -1, 0);
const DIRS = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1)];
const uid = () => Math.random().toString(36).slice(2, 10);
const visibleChain = (o) => { for (let n = o; n; n = n.parent) if (!n.visible) return false; return true; };

function corners(f) { const c = Math.cos(f.rot), s = Math.sin(f.rot); return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => [f.x + a * f.hw * c + b * f.hd * s, f.z - a * f.hw * s + b * f.hd * c]); }
function sat(A, B) {
  for (const P of [A, B]) for (let i = 0; i < 2; i++) {
    const [x0, z0] = P[i], [x1, z1] = P[i + 1], ax = z1 - z0, az = -(x1 - x0);
    const pa = A.map(([x, z]) => x * ax + z * az), pb = B.map(([x, z]) => x * ax + z * az);
    if (Math.max(...pa) < Math.min(...pb) + 1e-3 || Math.max(...pb) < Math.min(...pa) + 1e-3) return false;
  }
  return true;
}

// Set Editing Mode: click to select, gizmo move/rotate/scale, placement assistance, undo/redo.
export class SetEditor {
  constructor(R) {
    this.R = R; const e = (this.e = R.e);
    Object.assign(this, { sel: [], door: null, hist: [], fut: [], snap: true, grid: false, collide: true, gizmo: 'translate', enabled: false, dragging: false });
    const tc = (this.tc = new TransformControls(e.camera, e.renderer.domElement));
    tc.setSize(0.85); tc.enabled = false;
    this.helper = tc.getHelper(); this.helper.visible = false; e.scene.add(this.helper);
    tc.addEventListener('dragging-changed', (ev) => { this.dragging = ev.value; if (ev.value) this.before = this.R.set.serialize(); else this.endDrag(); });
    tc.addEventListener('objectChange', () => this.moved());
    this.pivot = new THREE.Object3D(); e.scene.add(this.pivot);
    this.box = new THREE.BoxHelper(undefined, '#05cc8d'); this.box.visible = false; e.scene.add(this.box);
    const lg = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(15), 3));
    this.foot = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: '#05cc8d', depthTest: false })); this.foot.renderOrder = 10; this.foot.visible = false; e.scene.add(this.foot);
    this.applySnap();
  }

  get items() { return this.sel.map((id) => this.R.set.get(id)).filter(Boolean); }
  enable(on) { this.enabled = on; this.tc.enabled = on; if (!on) { this.sel = []; this.door = null; } this.attach(); this.R.emit(); }
  applySnap() { this.tc.setTranslationSnap(this.grid ? 0.25 : null); this.tc.setRotationSnap(this.snap ? THREE.MathUtils.degToRad(15) : null); this.tc.setScaleSnap(this.snap ? 0.05 : null); }
  setOption(k, v) { this[k] = v; this.applySnap(); this.R.emit(); }
  setGizmo(m) { this.gizmo = m; this.tc.setMode(m); this.R.emit(); }

  // ---- selection
  select(ids, additive = false) {
    const set = this.R.set, out = new Set(additive ? this.sel : []);
    for (const id of ids) { const o = set.get(id); if (!o) continue; if (additive && out.has(id) && ids.length === 1) { out.delete(id); continue; } out.add(id); if (o.group) for (const x of set.list) if (x.group === o.group) out.add(x.id); }
    this.sel = [...out]; this.door = null; this.attach(); this.R.emit();
  }
  pick(c, additive) {
    const e = this.e; ray.setFromCamera(new THREE.Vector2(c.x, c.y), e.camera); ray.far = 200;
    const walls = this.R.wallMeshes.filter(visibleChain), doors = this.R.doors.flatMap((d) => d.pivot.children).filter(visibleChain);
    const hits = ray.intersectObjects([...this.R.set.root.children.filter((n) => n.visible), ...walls, ...doors], true);
    const h = hits.find((x) => visibleChain(x.object));
    if (!h) return this.select([]);
    if (h.object.userData.door) { this.sel = []; this.door = h.object.userData.door; this.attach(); return this.R.emit(); }
    let n = h.object; while (n && !n.userData.setId) n = n.parent;
    if (!n) return this.select([]);
    this.select([n.userData.setId], additive);
  }
  attach() {
    const tc = this.tc; tc.detach(); this.rel = null;
    const it = this.items.filter((o) => !o.locked);
    if (this.enabled && it.length === 1) tc.attach(it[0].node);
    else if (this.enabled && it.length > 1) {
      const c = new THREE.Vector3(); it.forEach((o) => c.add(o.node.position)); c.divideScalar(it.length);
      this.pivot.position.copy(c); this.pivot.rotation.set(0, 0, 0); this.pivot.scale.set(1, 1, 1); this.pivot.updateMatrixWorld(true);
      const inv = this.pivot.matrixWorld.clone().invert();
      this.rel = it.map((o) => ({ o, m: inv.clone().multiply(o.node.matrixWorld) }));
      tc.attach(this.pivot);
    }
    tc.setMode(this.gizmo); this.helper.visible = this.enabled && it.length > 0;
  }

  // ---- transforms
  read(o) { const n = o.node; Object.assign(o, { x: n.position.x, y: n.position.y, z: n.position.z, rx: n.rotation.x, ry: n.rotation.y, rz: n.rotation.z, sx: n.scale.x, sy: n.scale.y, sz: n.scale.z }); }
  moved() {
    if (this.rel) { this.pivot.updateMatrixWorld(true); for (const { o, m } of this.rel) new THREE.Matrix4().multiplyMatrices(this.pivot.matrixWorld, m).decompose(o.node.position, o.node.quaternion, o.node.scale); }
    for (const o of this.items.filter((x) => !x.locked)) { this.read(o); if (this.snap && this.gizmo === 'translate') this.place(o); this.R.set.apply(o); }
    this.check();
  }
  endDrag() {
    if (!this.before) return;
    this.hist.push(this.before); this.fut = []; this.before = null; if (this.hist.length > 80) this.hist.shift();
    if (this.rel) this.attach();
    this.R.store.markDirty(); this.navCheck();
  }
  push() { this.hist.push(this.R.set.serialize()); if (this.hist.length > 80) this.hist.shift(); this.fut = []; }
  change(fn) { this.push(); fn(); this.check(); this.attach(); this.R.store.markDirty(); this.navCheck(); }
  // Generated stages: warn (never undo) when an edit closes the way to a room or doorway.
  navCheck() { const o = this.items[0]; this.R.nav?.afterEdit(o ? `${this.R.set.def(o)?.name || o.type} (${o.id})` : ''); }

  place(o) {
    const def = this.R.set.def(o), p = def.place || 'floor';
    if (p === 'floor') o.y = groundAt(o.x, o.z, o.y, this.ownWalks(o));
    else if (p === 'surface') o.y = this.surfaceY(o);
    else if (p === 'wall') this.toWall(o);
    else if (p === 'hang') { const f = groundAt(o.x, o.z, o.y - 2.2); o.y = (inHouse(o.x, o.z) ? (f >= F2 - 0.1 ? TOP : F2 - SLAB) : f + 3) - o.box.max.y * o.sy; }
  }
  // Stand-on surfaces of the pieces being moved: they move with the selection, so they can't support it.
  ownWalks(o) { return new Set([o, ...this.sel.map((id) => this.R.set.get(id))].map((x) => x?.walk).filter(Boolean)); }
  surfaceY(o) {
    const g = groundAt(o.x, o.z, o.y, this.ownWalks(o)), skip = new Set(this.sel.length ? this.sel : [o.id]);
    ray.set(new THREE.Vector3(o.x, o.y + 1.0, o.z), DOWN); ray.far = 3;
    const nodes = this.R.set.list.filter((x) => !skip.has(x.id) && x.id !== o.id && x.node.visible).map((x) => x.node);
    const h = ray.intersectObjects(nodes, true)[0];
    return h && h.point.y > g ? h.point.y : g;
  }
  toWall(o) {
    const c = new THREE.Vector3(o.x, o.y + (o.box.max.y * o.sy) / 2, o.z); let best = null;
    const walls = this.R.wallMeshes.filter(visibleChain);
    for (const d of DIRS) { ray.set(c, d); ray.far = 1.2; const h = ray.intersectObjects(walls, false)[0]; if (h && (!best || h.distance < best.distance)) best = h; }
    if (!best) return;
    const n = best.face.normal.clone(); n.y = 0; if (n.lengthSq() < 0.1) return; n.normalize();
    o.x = best.point.x + n.x * 0.004; o.z = best.point.z + n.z * 0.004; o.ry = Math.atan2(n.x, n.z);
  }
  check() {
    const C = this.e.colliders;
    for (const o of this.items) {
      o.overlap = false; if (!this.collide || !o.foot || (this.R.set.def(o).place || 'floor') !== 'floor') continue;
      const A = corners(o.foot); A.push(A[0]);
      for (const k of C.query(o.foot.x, o.foot.z, Math.hypot(o.foot.hw, o.foot.hd) + 0.5)) {
        if (o.cols?.includes(k) || k.type !== 'b' || (k.tag !== 'set' && k.tag !== 'wall') || o.y + 0.2 < k.y0 || o.y + 0.2 > k.y1) continue;
        if (this.items.some((x) => x.cols?.includes(k))) continue;
        const B = corners({ x: k.x, z: k.z, hw: k.hw, hd: k.hd, rot: k.rot }); B.push(B[0]);
        if (sat(A, B)) { o.overlap = true; break; }
      }
    }
  }

  // ---- operations
  insert(d, ndc) {
    const e = this.e; ray.setFromCamera(new THREE.Vector2(ndc?.x || 0, ndc?.y || 0), e.camera); ray.far = 80;
    const targets = [...this.R.floorMeshes, ...this.R.wallMeshes, ...this.R.set.root.children].filter(visibleChain);
    const h = ray.intersectObjects(targets, true).find((x) => visibleChain(x.object));
    const p = h ? h.point : e.camera.position.clone().add(ray.ray.direction.clone().multiplyScalar(3));
    let o;
    this.change(() => {
      const ry = Math.round(Math.atan2(e.camera.position.x - p.x, e.camera.position.z - p.z) / (Math.PI / 2)) * (Math.PI / 2);
      o = this.R.set.add({ ...d, x: p.x, y: p.y, z: p.z, ry });
      if (!o) return;
      if (h && h.normal && Math.abs(h.normal.y) < 0.3) { o.x += h.normal.x * 0.3; o.z += h.normal.z * 0.3; }
      this.place(o); o.orig = { x: o.x, y: o.y, z: o.z, rx: 0, ry: o.ry, rz: 0, sx: 1, sy: 1, sz: 1 }; this.R.set.apply(o);
    });
    if (o) this.select([o.id]);
    return o;
  }
  duplicate() {
    const src = this.items; if (!src.length) return;
    const groups = new Map(), ids = [];
    this.change(() => { for (const o of src) { const d = this.R.set.data(o); delete d.id; delete d.key; const c = Math.cos(o.ry), s = Math.sin(o.ry); d.x += 0.6 * c; d.z -= 0.6 * s; if (d.group) { if (!groups.has(d.group)) groups.set(d.group, uid()); d.group = groups.get(d.group); } d.locked = false; const n = this.R.set.add(d); this.place(n); this.R.set.apply(n); ids.push(n.id); } });
    this.select(ids);
  }
  remove() { const it = this.items; if (!it.length) return; this.change(() => it.forEach((o) => this.R.set.remove(o.id))); this.sel = []; this.attach(); this.R.emit(); }
  patch(p) { const it = this.items; if (!it.length) return; this.change(() => it.forEach((o) => { Object.assign(o, p); if ('color' in p) this.R.set.recolor(o); this.R.set.apply(o); })); }
  setField(f, v) { const it = this.items; if (!it.length || !Number.isFinite(v)) return; this.change(() => it.forEach((o) => { if (o.locked) return; o[f] = v; if (this.snap && (f === 'x' || f === 'z')) this.place(o); this.R.set.apply(o); })); }
  rotateBy(deg) { this.change(() => this.items.forEach((o) => { if (o.locked) return; o.ry += THREE.MathUtils.degToRad(deg); if ((this.R.set.def(o).place || 'floor') !== 'wall') this.R.set.apply(o); else this.R.set.apply(o); })); }
  drop() { this.change(() => this.items.forEach((o) => { if (o.locked) return; this.place(o); this.R.set.apply(o); })); }
  reset() { this.change(() => this.items.forEach((o) => { if (o.locked || !o.orig) return; Object.assign(o, o.orig); this.R.set.apply(o); })); }
  replace(type) { this.change(() => this.items.forEach((o) => { o.type = type; o.color = null; o.model_uri = o.model_asset_id = o.model_name = null; this.R.set.build(o); this.place(o); this.R.set.apply(o); })); }
  // Swap the visual of the selected pieces (or every piece of the same type in this set) for an imported
  // model, keeping position, rotation, scale, id and anchors. asset = null restores the original piece.
  setModel(asset, allOfType = false) {
    const types = new Set(this.items.filter((o) => o.type !== 'asset').map((o) => o.type));
    const targets = allOfType ? this.R.set.list.filter((o) => types.has(o.type)) : this.items.filter((o) => o.type !== 'asset');
    this.change(() => targets.forEach((o) => { Object.assign(o, asset ? { model_asset_id: asset.id, model_uri: asset.file_uri, model_name: asset.name, color: null } : { model_asset_id: null, model_uri: null, model_name: null }); this.R.set.build(o); this.R.set.apply(o); }));
    this.R.emit();
  }
  group() { if (this.sel.length < 2) return; const g = uid(); this.patch({ group: g }); }
  ungroup() { this.patch({ group: null }); }
  undo() { if (!this.hist.length) return; this.fut.push(this.R.set.serialize()); this.restore(this.hist.pop()); }
  redo() { if (!this.fut.length) return; this.hist.push(this.R.set.serialize()); this.restore(this.fut.pop()); }
  restore(list) { const keep = this.sel; this.R.set.load(list); this.sel = keep.filter((id) => this.R.set.get(id)); this.attach(); this.R.store.markDirty(); }
  reset_history() { this.hist = []; this.fut = []; this.sel = []; this.door = null; this.attach(); }
  focus(id) {
    const o = this.R.set.get(id); if (!o) return;
    const f = this.e.rig.free, c = new THREE.Vector3(o.x, o.y + 0.8, o.z), dir = new THREE.Vector3(Math.sin(o.ry), 0.55, Math.cos(o.ry)).normalize();
    f.pos.copy(c).addScaledVector(dir, 3.2); f.yaw = Math.atan2(dir.x, dir.z); f.pitch = Math.asin(dir.y);
  }

  update() {
    const it = this.items, show = this.enabled && it.length > 0;
    this.box.visible = show; this.foot.visible = show && !!it[0]?.foot;
    if (!show) return;
    // Selection outline is rebuilt only when the selection, its transform or its model changes.
    const key = `${this.R.set.rev}|${it.map((o) => `${o.id},${o.x},${o.y},${o.z},${o.rx},${o.ry},${o.rz},${o.sx},${o.sy},${o.sz}`).join(';')}`;
    if (key === this.boxKey) return;
    this.boxKey = key;
    this.box.setFromObject(it[0].node);
    this.box.material.color.set(it.some((o) => o.locked) ? '#f59e0b' : '#05cc8d');
    const f = it[0].foot; if (!f) return;
    const p = this.foot.geometry.attributes.position, cs = corners(f), y = it[0].y + 0.02;
    cs.concat([cs[0]]).forEach(([x, z], i) => p.setXYZ(i, x, y, z)); p.needsUpdate = true;
    this.foot.material.color.set(it.some((o) => o.overlap) ? '#ef4444' : '#05cc8d');
  }
}