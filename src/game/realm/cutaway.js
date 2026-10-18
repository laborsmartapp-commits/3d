import * as THREE from 'three';

const ray = new THREE.Ray(), hit = new THREE.Vector3(), tv = new THREE.Vector3(), fw = new THREE.Vector3();
const caster = new THREE.Raycaster();

// Camera-aware visibility: walls, ceilings, upper floor and roof pieces between a camera and what it is
// looking at are hidden for that render only (never removed), so every camera sees into the house.
export class Cutaway {
  constructor(R) {
    this.R = R; this.mode = 'auto'; this.roof = 'auto'; this.upper = true; this.ready = false; this.sticky = new Map();
    R.e.scene.onBeforeRender = (r, s, cam) => this.update(cam);
  }
  load(v) { this.mode = v?.mode || 'auto'; this.roof = v?.roof || 'auto'; this.upper = v?.upper !== false; }
  save() { return { mode: this.mode, roof: this.roof, upper: this.upper }; }
  set(p) { Object.assign(this, p); this.R.store.markDirty(); }
  prepare() {
    for (const c of this.R.cut) { c.box = new THREE.Box3(); for (const m of c.meshes) c.box.expandByObject(m); c.box.expandByScalar(0.02); }
    this.ready = true;
  }
  focus(cam) {
    const e = this.R.e, out = [], p = cam.position;
    cam.getWorldDirection(fw);
    for (const a of Object.values(e.actors || {})) {
      if (a.hidden || !a.h?.root.visible) continue;
      tv.set(a.pos.x, a.pos.y + 1.3, a.pos.z);
      if (tv.distanceTo(p) < 45 && tv.clone().sub(p).dot(fw) > 0) out.push(tv.clone());
    }
    const ed = this.R.editor; if (ed.enabled) for (const o of ed.items) out.push(new THREE.Vector3(o.x, o.y + 0.6, o.z));
    caster.set(p, fw); caster.far = 40;
    const h = caster.intersectObjects(this.R.houseFloors, false)[0];
    if (h) out.push(h.point.clone().add(new THREE.Vector3(0, 0.5, 0)));
    return out;
  }
  update(cam) {
    if (!this.ready) this.prepare();
    const R = this.R, now = performance.now(), base = (c) => (!this.upper && c.floor >= 2) || (this.roof === 'hide' && c.floor === 3);
    let st = this.sticky.get(cam.uuid); if (!st) this.sticky.set(cam.uuid, (st = new Map()));
    if (this.mode === 'auto') {
      const pts = this.focus(cam);
      for (const f of pts) {
        const d = cam.position.distanceTo(f); ray.origin.copy(cam.position); ray.direction.copy(f).sub(cam.position).normalize();
        for (const c of R.cut) {
          if (base(c) || (c.floor === 3 && this.roof === 'show') || c.box.containsPoint(f)) continue;
          if (ray.intersectBox(c.box, hit) && hit.distanceTo(cam.position) < d - 0.3) st.set(c, now + 250);
        }
      }
    }
    const hiddenRooms = new Set();
    for (const c of R.cut) {
      const hide = base(c) || (this.mode === 'auto' && (st.get(c) || 0) > now);
      if (c.group.visible === hide) c.group.visible = !hide;
      if (hide && c.kind === 'floor2') hiddenRooms.add(c.room);
    }
    for (const o of R.set.items.values()) {
      const want = !o.hidden && !(o.floor === 2 && (!this.upper || hiddenRooms.has(o.roomId)));
      if (o.node.visible !== want) o.node.visible = want;
    }
  }
}