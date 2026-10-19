import * as THREE from 'three';
import { CATALOG } from './catalog';
import { ROOMS, zoneAt } from './layout';

const fwd = new THREE.Vector3();
const area = (o) => (o.floor === 1 ? 'Ground Floor' : o.floor === 2 ? 'Upper Floor' : ['Front Porch', 'Front Yard', 'Driveway', 'Sidewalk', 'Street'].includes(o.room) ? 'Front of House' : 'Backyard & Patio');

// Ties the realm's modes (Explore / Set Edit / Production) into the stage engine's frame loop and the HUD.
export class RealmController {
  constructor(R) {
    this.R = R; this.e = R.e; this.mode = 'explore'; this.pending = true; this.lastEmit = -1; this.perfOn = false;
    this.perf = { fps: 0, calls: 0, tris: 0, geos: 0, tex: 0, ms: 0, minFps: 999, samples: [] };
    R.e.renderer.info.autoReset = false;
  }
  emit() { this.pending = true; }
  setMode(m) {
    if (m === this.mode) return;
    const e = this.e;
    if (m === 'edit') {
      const f = e.rig.free; f.pos.copy(e.camera.position); e.camera.getWorldDirection(fwd);
      f.yaw = Math.atan2(-fwd.x, -fwd.z); f.pitch = Math.asin(-fwd.y); f.speed = 5;
      this.R.editor.enable(true);
    } else if (this.mode === 'edit') this.R.editor.enable(false);
    if (m !== 'explore' && m !== 'production') this.R.anchors.emit(null);
    this.mode = m; this.emit();
  }

  // Called before the player step. Returns which parts of the frame the realm handled.
  control(dt, raw, inp) {
    const R = this.R, e = this.e;
    if (this.mode !== 'edit') return R.anchors.update(dt, inp);
    const k = inp.keys, P = inp.pressed, ctrl = k.has('ControlLeft') || k.has('ControlRight') || k.has('MetaLeft') || k.has('MetaRight'), ed = R.editor;
    if (ctrl && P.has('KeyZ')) (k.has('ShiftLeft') || k.has('ShiftRight') ? ed.redo() : ed.undo());
    else if (ctrl && P.has('KeyY')) ed.redo();
    else if (ctrl && P.has('KeyD')) ed.duplicate();
    else if (ctrl && P.has('KeyS')) R.store.save();
    if (P.has('Delete') || P.has('Backspace')) ed.remove();
    if (P.has('Escape')) ed.select([]);
    if (P.has('Digit1')) ed.setGizmo('translate'); if (P.has('Digit2')) ed.setGizmo('rotate'); if (P.has('Digit3')) ed.setGizmo('scale');
    for (const c of inp.clicks) if (ed.tc.axis === null && !ed.dragging) ed.pick(c, k.has('ShiftLeft') || k.has('ShiftRight'));
    const f = e.rig.free;
    if (inp.wheel) { e.camera.getWorldDirection(fwd); f.pos.addScaledVector(fwd, -inp.wheel * 0.004); }
    e.rig.freeCam(dt, ctrl || ed.dragging ? { ...inp, move: { x: 0, y: 0 }, keys: new Set() } : inp);
    return { move: true, cam: true };
  }

  tick(t, dt) {
    const R = this.R, e = this.e, info = e.renderer.info;
    if (this.perfOn) {
      const p = this.perf; p.calls = info.render.calls; p.tris = info.render.triangles; p.geos = info.memory.geometries; p.tex = info.memory.textures; p.fps = e.fps; p.ms = +(dt * 1000).toFixed(1);
      p.samples.push(e.fps); if (p.samples.length > 300) p.samples.shift(); p.minFps = Math.min(...p.samples); p.avgFps = Math.round(p.samples.reduce((a, b) => a + b, 0) / p.samples.length);
      p.lights = R.env.active || 0; p.objects = R.set.items.size; p.visibleObjects = R.set.list.filter((o) => o.node.visible).length; p.colliders = e.colliders.items.size;
      if ((this.perfT = (this.perfT || 0) + dt) > 0.5) { this.perfT = 0; this.pending = true; }
    }
    info.reset();
    R.env.update(dt, t);
    R.set.tick(t, R.env.s);
    for (const d of R.doors) d.update(dt);
    R.editor.update();
    e.syncZone?.();
    if (this.pending && t - this.lastEmit > 0.12) { this.lastEmit = t; this.pending = false; e.emit({ realm: this.snapshot() }); }
  }

  snapshot() {
    const R = this.R, ed = R.editor, st = R.store, set = R.set;
    if (this.listRev !== set.rev || !this.objs) {
      this.listRev = set.rev;
      this.objs = set.list.map((o) => ({ id: o.id, type: o.type, name: o.name || set.def(o)?.name || o.type, cat: set.def(o)?.cat, room: o.room, area: area(o), hidden: o.hidden, locked: o.locked, group: o.group }));
    }
    const sel = ed.items.map((o) => ({ ...set.data(o), label: o.name || set.def(o)?.name, cat: set.def(o)?.cat, room: o.room, overlap: !!o.overlap, colorable: !!o.proto?.main && !o.model_uri, color: o.color || (o.proto?.main ? `#${o.proto.main.color.getHexString()}` : null), anchors: set.anchors(o).map((a) => a.label), error: o.error, loading: !!o.loading }));
    return {
      mode: this.mode, sel, door: ed.door ? { label: ed.door.label, open: ed.door.open } : null, gizmo: ed.gizmo, snap: ed.snap, grid: ed.grid, collide: ed.collide,
      canUndo: ed.hist.length > 0, canRedo: ed.fut.length > 0, dirty: st.dirty, sandbox: st.sandbox, saving: st.saving, error: st.error, loaded: st.loaded,
      version: st.current ? { id: st.current.id, name: st.current.name } : null,
      versions: st.list.map((v) => ({ id: v.id, name: v.name, template: v.template, active: v.id === st.current?.id, count: v.object_count, updated: v.updated_date })),
      env: { ...R.env.s }, outdoorOn: R.env.outdoorOn, view: R.cutaway.save(),
      rooms: ROOMS.map((r) => ({ id: r.id, name: r.name, floor: r.f, on: R.env.roomOn(r.id) })),
      objects: this.objs, objRev: set.rev, perf: this.perfOn ? { ...this.perf, samples: undefined } : null,
      zone: zoneAt(this.e.player.pos.x, this.e.player.pos.z, this.e.player.pos.y),
    };
  }
}

export const typesIn = (cat) => Object.entries(CATALOG).filter(([, d]) => d.cat === cat).map(([type, d]) => ({ type, name: d.name }));