import * as THREE from 'three';

const uid = () => 'cam_' + Math.random().toString(36).slice(2, 10);
export const followDefaults = () => ({ target: 'krush', fwd: -8, side: 0, up: 3, lookHeight: 1.4, posSmooth: 5, rotSmooth: 8, rigid: false, followRotation: true, lockYaw: 0 });
const axes = (y) => ({ fx: Math.sin(y), fz: Math.cos(y), rx: Math.cos(y), rz: -Math.sin(y) });

// Pure function so playback / the cloud worker compute exactly the same follow pose.
export function followPose(f, a) {
  const k = axes(f.followRotation ? a.yaw : f.lockYaw);
  return { pos: new THREE.Vector3(a.x + k.fx * f.fwd + k.rx * f.side, a.y + f.up, a.z + k.fz * f.fwd + k.rz * f.side), look: new THREE.Vector3(a.x, a.y + f.lookHeight, a.z) };
}

export class CameraManager {
  constructor(e) { this.e = e; this.list = []; this.selId = null; this.rt = new Map(); this.helpers = false; }
  get selected() { return this.list.find((c) => c.id === this.selId) || null; }
  get(id) { return this.list.find((c) => c.id === id); }
  cam(id) { return this.rt.get(id)?.cam; }
  // Characters by stable id. Only Krush (the player) today; more actors register here later.
  actor() { const p = this.e.player; return { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw }; }

  load(list) {
    for (const id of [...this.rt.keys()]) this.drop(id);
    this.list = (list || []).map((c) => ({ ...c, follow: { ...followDefaults(), ...c.follow } }));
    this.list.forEach((c) => this.mount(c));
    this.selId = this.list[0]?.id || null;
  }

  mount(c) {
    const cam = new THREE.PerspectiveCamera(c.fov, 16 / 9, 0.1, 3000);
    const viz = new THREE.PerspectiveCamera(c.fov, 16 / 9, 0.3, 9);
    const mat = new THREE.MeshBasicMaterial({ color: '#f59e0b' });
    const gizmo = new THREE.Group();
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.3, 12), new THREE.MeshBasicMaterial({ color: '#111827' }));
    lens.rotation.x = Math.PI / 2; lens.position.z = -0.48;
    gizmo.add(new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, 0.65), mat), lens);
    const helper = new THREE.CameraHelper(viz);
    // Layer 1 = editor-only. Production cameras render layer 0 only, so gizmos never appear in footage.
    [gizmo, helper].forEach((o) => o.traverse((n) => n.layers.set(1)));
    this.e.scene.add(cam, viz, gizmo, helper);
    this.rt.set(c.id, { cam, viz, gizmo, helper, mat, pos: new THREE.Vector3(), look: new THREE.Vector3(), snap: true });
    this.apply(c, 0);
  }

  drop(id) { const r = this.rt.get(id); if (!r) return; this.e.scene.remove(r.cam, r.viz, r.gizmo, r.helper); r.helper.dispose(); this.rt.delete(id); }

  apply(c, dt) {
    const r = this.rt.get(c.id);
    if (c.mode === 'follow') {
      const t = followPose(c.follow, this.actor());
      if (r.snap || c.follow.rigid || !dt) { r.pos.copy(t.pos); r.look.copy(t.look); r.snap = false; }
      else { r.pos.lerp(t.pos, 1 - Math.exp(-c.follow.posSmooth * dt)); r.look.lerp(t.look, 1 - Math.exp(-c.follow.rotSmooth * dt)); }
      r.cam.position.copy(r.pos); r.cam.lookAt(r.look);
    } else {
      r.cam.position.set(c.x, c.y, c.z);
      if (c.target) r.cam.lookAt(c.target.x, c.target.y, c.target.z); else r.cam.rotation.set(c.pitch, c.yaw, 0, 'YXZ');
    }
    if (r.cam.fov !== c.fov) { r.cam.fov = r.viz.fov = c.fov; r.cam.updateProjectionMatrix(); r.viz.updateProjectionMatrix(); }
    r.gizmo.position.copy(r.cam.position); r.gizmo.quaternion.copy(r.cam.quaternion);
    r.viz.position.copy(r.cam.position); r.viz.quaternion.copy(r.cam.quaternion); r.viz.updateMatrixWorld(); r.helper.update();
  }

  update(dt, recId) {
    for (const c of this.list) {
      this.apply(c, dt);
      const r = this.rt.get(c.id);
      r.gizmo.visible = r.helper.visible = this.helpers;
      r.mat.color.set(c.id === recId ? '#ef4444' : c.id === this.selId ? '#05ce91' : '#f59e0b');
    }
  }

  pose(id) { const c = this.cam(id); const r = (v) => +v.toFixed(4); return c ? [...c.position.toArray(), ...c.quaternion.toArray(), c.fov].map(r) : null; }

  aimAt(c, x, y, z) { const dx = x - c.x, dy = y - c.y, dz = z - c.z; c.yaw = Math.atan2(-dx, -dz); c.pitch = Math.atan2(dy, Math.hypot(dx, dz)); }
  aimAtActor(c) { const a = this.actor(); c.target = null; this.aimAt(c, a.x, a.y + 1.4, a.z); }

  add() {
    const c = { id: uid(), name: `Camera ${this.list.length + 1}`, mode: 'static', yaw: 0, pitch: 0, fov: 45, target: null, follow: followDefaults() };
    this.resetPose(c);
    this.list.push(c); this.mount(c); this.selId = c.id;
    return c;
  }

  // Default placement: 6 m in front of Krush at eye height, looking back at him.
  resetPose(c) { const a = this.actor(), k = axes(a.yaw); Object.assign(c, { x: a.x + k.fx * 6, y: a.y + 1.6, z: a.z + k.fz * 6, target: null }); this.aimAtActor(c); }

  placeAtView(c) {
    const m = this.e.camera, eu = new THREE.Euler().setFromQuaternion(m.quaternion, 'YXZ');
    Object.assign(c, { x: m.position.x, y: m.position.y, z: m.position.z, yaw: eu.y, pitch: eu.x, target: null });
  }

  nudge(c, dir, amt) {
    const f = [-Math.sin(c.yaw), -Math.cos(c.yaw)], rt = [Math.cos(c.yaw), -Math.sin(c.yaw)];
    if (dir === 'fwd') { c.x += f[0] * amt; c.z += f[1] * amt; }
    if (dir === 'right') { c.x += rt[0] * amt; c.z += rt[1] * amt; }
    if (dir === 'up') c.y += amt;
    if (dir === 'yaw') { c.target = null; c.yaw += amt; }
    if (dir === 'pitch') { c.target = null; c.pitch = Math.max(-1.5, Math.min(1.5, c.pitch + amt)); }
  }

  // Capture the camera's current offset from the character so following starts with no jump.
  lockFollow(c) {
    const r = this.rt.get(c.id), a = this.actor(), k = axes(a.yaw), d = r.cam.position.clone().sub(new THREE.Vector3(a.x, a.y, a.z));
    Object.assign(c.follow, { fwd: +(d.x * k.fx + d.z * k.fz).toFixed(3), side: +(d.x * k.rx + d.z * k.rz).toFixed(3), up: +d.y.toFixed(3), lockYaw: a.yaw });
    r.snap = true;
  }

  remove(id) { this.drop(id); this.list = this.list.filter((c) => c.id !== id); if (this.selId === id) this.selId = this.list[0]?.id || null; }
}