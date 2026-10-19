import { Engine } from '@/game/Engine';
import { ConvergenceEngine } from '@/game/convergence/ConvergenceEngine';
import { DISTRICTS } from '@/game/convergence/districts';
import { STAR_SQUARE } from '@/game/convergence/star/stage';
import { LIVING_REALM } from '@/game/realm/stage';

// How the headless renderer builds each registered stage. New stages add one entry here.
export const RENDER_ENGINES = {
  'celestia-grotto': (el, bundle, onState) => { const e = new Engine(el, onState, () => {}); e.renderBundle = bundle; return e; },
  'star-square': (el, bundle, onState) => new ConvergenceEngine(el, onState, STAR_SQUARE),
  'living-realm': (el, bundle, onState) => { const e = new ConvergenceEngine(el, onState, LIVING_REALM); e.renderBundle = bundle; return e; },
  convergence: (el, bundle, onState) => new ConvergenceEngine(el, onState, DISTRICTS[bundle.take.world_snapshot?.district] || DISTRICTS.boulevard),
};

export async function createStageEngine(bundle, el) {
  const id = bundle.take.world || 'celestia-grotto';
  const make = RENDER_ENGINES[id];
  if (!make) throw new Error(`Stage "${id}" has no headless renderer registered`);
  const e = make(el, bundle, () => {});
  await e.init();
  if (!e.studio || !e.renderer) throw new Error(`Stage "${id}" failed to initialise`);
  return e;
}