import { getMaterials } from './materials';
import { buildHouse } from './house';
import { buildExterior } from './exterior';
import { SetScene } from './setScene';
import { SetEditor } from './setEditor';
import { SetStore } from './setStore';
import { RealmEnv } from './env';
import { Cutaway } from './cutaway';
import { Anchors } from './anchors';
import { Hoops } from './hoops';
import { RealmController } from './controller';
import { walkables, layoutHook } from './layout';
import { DEV_TOOLS } from './modelPrep';
import { installModelLab } from './modelLab';
import { installRealmTest } from './devTest';

// Builds Krush's Living Realm into a stage engine and returns its per-frame tick.
export function buildRealm(e) {
  const R = { e, M: getMaterials(), cut: [], floorMeshes: [], houseFloors: [], wallMeshes: [], doors: [], lightSources: [] };
  R.emit = () => R.ctl?.emit();
  if (e.sky) e.sky.visible = false;
  layoutHook.cur = null; // the house lot owns the ground again after a generated stage
  walkables.length = 0; // set pieces from a previously built (disposed) realm must not stay walkable
  const P = e.prof, sync = (n, fn) => (P ? P.sync(n, fn) : fn());
  sync('realm: street + yard', () => buildExterior(R));
  sync('realm: house shell', () => buildHouse(R));
  sync('realm: set systems (env, cutaway, editor)', () => {
    R.set = new SetScene(R);
    R.store = new SetStore(R);
    R.env = new RealmEnv(R);
    R.cutaway = new Cutaway(R);
    R.hoops = new Hoops(R);
    R.anchors = new Anchors(R);
    R.editor = new SetEditor(R);
    R.ctl = e.realm = new RealmController(R);
  });
  const snap = e.renderBundle?.take?.world_snapshot;
  if (snap?.objects) sync('realm: furnish from take snapshot', () => R.store.applySnapshot(snap));
  else {
    let t; const p = sync('realm: furnish default set', () => { t = P?.now(); return R.store.init(); });
    p.then(() => P?.add('realm: saved set (server fetch + refurnish)', t, 'assets'));
  }
  if (DEV_TOOLS) { window.__modelLab = installModelLab(R); window.__realmTest = installRealmTest(R); }
  let last = null;
  return (t) => { const dt = last === null ? 0 : Math.min(0.05, Math.max(0, t - last)); last = t; R.ctl.tick(t, dt); };
}