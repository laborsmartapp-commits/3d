import { getMaterials } from './materials';
import { buildHouse } from './house';
import { buildExterior } from './exterior';
import { SetScene } from './setScene';
import { SetEditor } from './setEditor';
import { SetStore } from './setStore';
import { RealmEnv } from './env';
import { Cutaway } from './cutaway';
import { Anchors } from './anchors';
import { RealmController } from './controller';
import { DEV_TOOLS } from './modelPrep';
import { installModelLab } from './modelLab';
import { installRealmTest } from './devTest';

// Builds Krush's Living Realm into a stage engine and returns its per-frame tick.
export function buildRealm(e) {
  const R = { e, M: getMaterials(), cut: [], floorMeshes: [], houseFloors: [], wallMeshes: [], doors: [], lightSources: [] };
  R.emit = () => R.ctl?.emit();
  if (e.sky) e.sky.visible = false;
  buildExterior(R);
  buildHouse(R);
  R.set = new SetScene(R);
  R.store = new SetStore(R);
  R.env = new RealmEnv(R);
  R.cutaway = new Cutaway(R);
  R.anchors = new Anchors(R);
  R.editor = new SetEditor(R);
  R.ctl = e.realm = new RealmController(R);
  const snap = e.renderBundle?.take?.world_snapshot;
  if (snap?.objects) R.store.applySnapshot(snap); else R.store.init();
  if (DEV_TOOLS) { window.__modelLab = installModelLab(R); window.__realmTest = installRealmTest(R); }
  let last = null;
  return (t) => { const dt = last === null ? 0 : Math.min(0.05, Math.max(0, t - last)); last = t; R.ctl.tick(t, dt); };
}