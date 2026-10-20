import * as THREE from 'three';
import { getMaterials } from '../realm/materials';
import { SetScene } from '../realm/setScene';
import { SetEditor } from '../realm/setEditor';
import { SetStore } from '../realm/setStore';
import { RealmEnv } from '../realm/env';
import { Cutaway } from '../realm/cutaway';
import { Anchors } from '../realm/anchors';
import { RealmController } from '../realm/controller';
import { walkables, layoutHook } from '../realm/layout';
import { CATALOG } from '../realm/catalog';
import { generatedStage } from '../stages/adapters';
import { styleOf } from './styles';
import { genMaterials } from './materials';
import { Merge, Inst } from './merge';
import { makeLayout, inRect } from './layout';
import { buildFloors, buildWall, buildRoof, buildStairs } from './arch';
import { buildBuilding } from './buildings';
import { buildElement } from './elements';
import { buildNature } from './nature';
import { buildVfx } from './vfx';
import { buildGround, buildMarks } from './ground';
import { StageProbe } from './probe';

// A saved GeneratedStage record as a stage on the shared street-level engine. Stage id is per stage
// family (all versions share scenes/takes); the editable set is stored per version.
export function generatedDistrict(rec) {
  const spec = rec.spec, L = makeLayout(spec), size = Math.max(spec.bounds.w, spec.bounds.d);
  return {
    id: `gen-${rec.root_id || rec.id}`, name: spec.name, record: rec, spec, layout: L,
    groundAt: L.groundAt, zoneAt: L.zoneAt, covered: L.covered, spawn: spec.spawn, water: -1000,
    fog: ['#d6e8f6', size * 0.8, Math.max(320, size * 5)], steps: ['Shaping the ground', 'Raising the architecture', 'Placing furnishings, nature and effects'],
    stage: generatedStage, showPlayer: true,
    build(e) { return buildGenerated(e, spec, L, rec); },
  };
}

function buildGenerated(e, spec, L, rec) {
  layoutHook.cur = L; walkables.length = 0;
  const S = styleOf(spec.style), mat = genMaterials(spec.style), P = e.prof, sync = (n, fn) => (P ? P.sync(n, fn) : fn());
  const R = { e, M: getMaterials(), cut: [], floorMeshes: [], houseFloors: [], wallMeshes: [], doors: [], lightSources: [], rooms: [], realmId: rec.preview ? `gen-preview-${rec.id}` : `gen-${rec.id}`, baseName: `${spec.name} v${rec.version || 1}` };
  R.emit = () => R.ctl?.emit();
  R.baseSet = () => ({ objects: spec.furnishings.map((f) => toObject(f, L)), environment: { outdoor: 'auto' }, view: {} });
  if (e.sky) e.sky.visible = false;
  const c = {
    e, R, S, L, spec, mat, C: e.colliders, floorMg: new Merge(), wallMg: new Merge(), mg: new Merge(), inst: new Inst(), roofs: [], jets: [], extraNature: [],
    trim: mat('painted_wood', S.flat ? '#e6dccb' : '#f4efe6').m, glass: mat('glass').m, metal: mat('brushed_metal').m, win: R.M.glow.window,
  };
  const root = new THREE.Group(); root.name = 'generated-stage'; e.scene.add(root);
  sync('generated: ground + terrain', () => buildGround(c, root));
  sync('generated: architecture', () => {
    buildFloors(c, spec.floors);
    spec.walls.forEach((w) => buildWall(c, w));
    L.stairs.forEach((s) => buildStairs(c, s));
    spec.roofs.forEach((r) => buildRoof(c, r));
    spec.buildings.forEach((b) => buildBuilding(c, b));
    spec.elements.forEach((x) => buildElement(c, x));
  });
  sync('generated: merge static geometry', () => {
    R.floorMeshes.push(...c.floorMg.build(root));
    for (const m of c.wallMg.build(root)) { R.wallMeshes.push(m); e.occluders.push(m); }
    c.mg.build(root); c.inst.build(root);
  });
  sync('generated: nature (instanced)', () => buildNature(c, [...spec.nature, ...c.extraNature]));
  let vfxTick;
  sync('generated: vfx + lights + marks', () => {
    vfxTick = buildVfx(c, [...spec.vfx, ...c.jets.map((j, i) => ({ id: `jet${i}`, type: 'water_jet', x: j.x, y: j.y, z: j.z, scale: j.s, count: 8 }))]);
    for (const l of spec.lights) R.lightSources.push({ kind: l.type === 'interior' ? 'room' : l.type === 'exterior' ? 'street' : 'always', room: 'gen', x: l.x, y: l.y, z: l.z, i: l.intensity, d: l.range, c: l.color });
    buildMarks(c, spec.marks);
  });
  sync('generated: set systems (editor, env, anchors)', () => {
    R.set = new SetScene(R); R.store = new SetStore(R); R.env = new RealmEnv(R); R.cutaway = new Cutaway(R); R.anchors = new Anchors(R); R.editor = new SetEditor(R);
    R.ctl = e.realm = new RealmController(R);
  });
  const snap = e.renderBundle?.take?.world_snapshot;
  if (snap?.objects) R.store.applySnapshot(snap); else R.store.init();
  const sp = spec.spawn || { x: 0, z: 0 }, probe = new StageProbe(e, sp.x, L.baseGroundAt(sp.x, sp.z, 0) + 1.6, sp.z, c.roofs);
  R.probe = probe; e.genProbe = probe;
  let last = null;
  return (t) => {
    const dt = last === null ? 0 : Math.min(0.05, Math.max(0, t - last)); last = t;
    R.ctl.tick(t, dt); vfxTick(t, dt); probe.tick(t);
    // Ceilings lift away while the camera looks down into the room from above (dollhouse view).
    const cam = e.studio?.viewThrough ? e.studio.outputCam() || e.camera : e.camera, p = e.player.pos, cp = cam.position;
    // From well above the building (overhead / architectural view) every ceiling lifts away.
    for (const r of c.roofs) r.node.visible = !(cp.y > r.r.y + 0.3 && (inRect(r.r, p.x, p.z, 1) || inRect(r.r, cp.x, cp.z) || cp.y > r.r.y + 4));
  };
}

// Blueprint furnishing -> editable set object (stable id = blueprint id).
function toObject(f, L) {
  const place = CATALOG[f.type]?.place || 'floor';
  const y = place === 'floor' ? L.baseGroundAt(f.x, f.z, f.y ?? 0) : f.y ?? 0.76;
  const o = { id: f.id, key: f.id, type: f.type, x: f.x, y, z: f.z, rx: 0, ry: f.ry || 0, rz: 0, sx: f.scale || 1, sy: f.scale || 1, sz: f.scale || 1 };
  if (f.color) o.color = f.color;
  if (f.finish) o.finish = f.finish;
  return o;
}

// Production cameras proposed by the blueprint, added to the open scene.
export function addStageCameras(e) {
  const sm = e.studio, list = e.D.spec?.cameras || [];
  for (const k of list) {
    sm.addCamera();
    const id = sm.cams.selId;
    sm.editCamera(id, (cam) => Object.assign(cam, { name: k.name, mode: 'static', x: k.x, y: k.y, z: k.z, fov: k.fov, target: { x: k.look_x, y: k.look_y, z: k.look_z } }));
  }
  return list.length;
}