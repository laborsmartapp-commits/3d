import * as THREE from 'three';
import { rng, validate } from './layout';
import { makeStarMaterials, setStarWet } from './materials';
import { Merger } from '../market/merge';
import { Ambient } from '../market/ambient';
import { applyDusk, LightPool, Spill } from './lights';
import { Signs } from './signs';
import { Screens } from './screens';
import { buildGround } from './ground';
import { buildBuildings } from './buildings';
import { buildWedges } from './wedges';
import { buildProps } from './props';
import { buildFountain } from './fountain';
import { buildArt } from './art';

const NEAR = 70 * 70;

// Builds Star Square into e.scene and returns its per-frame tick(time, focusX, focusZ).
export function buildStar(e) {
  const M = makeStarMaterials();
  const K = { e, M, R: rng(17), mg: new Merger(), occ: new Merger(), amb: new Ambient(e.scene), pool: new LightPool(e.scene, e.isTouch ? 6 : 10), spill: new Spill(), signs: new Signs(), interact: [], seats: [], anims: [], stats: { arch: {}, win: 0, lit: 0 } };
  K.screens = new Screens(K);
  e.setWet = (on) => { setStarWet(M, on); applyDusk(e, on ? 'drizzle' : 'clear'); };
  applyDusk(e);
  buildGround(K);
  buildBuildings(K);
  buildWedges(K);
  buildProps(K);
  buildArt(K);
  const show = (K.show = e.fountain = buildFountain(K));
  K.mg.build(e.scene);
  const occ = new THREE.Group(); K.occ.build(occ); e.scene.add(occ); e.occluders.push(...occ.children);
  K.spill.build(e.scene);
  const report = validate();
  console.info('[star square]', { ...report, archetypes: K.stats.arch, windows: K.stats.win, screenMB: +(K.screens.bytes / 1048576).toFixed(1) });
  let last = null;
  return (t, fx = 0, fz = 0) => {
    const dt = last === null ? 0 : Math.min(0.05, Math.max(0, t - last)); last = t;
    K.amb.update(dt, fx, fz);
    K.pool.update(dt, fx, fz);
    K.screens.update(t, fx, fz);
    for (const a of K.anims) if ((a.x - fx) ** 2 + (a.z - fz) ** 2 < NEAR) a.fn(t);
    show.update(dt, t, fx, fz);
  };
}