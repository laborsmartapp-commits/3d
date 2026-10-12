import { groundAt, zoneAt, SPAWN } from './layout';
import { buildStar } from './index';
import { starSquareStage } from '../../stages/adapters';

// Star Square as its own stage: Krush is the only performer (no sim avatar), dry streets, no water.
export const STAR_SQUARE = {
  id: 'star-square', name: 'Star Square', groundAt, zoneAt, spawn: SPAWN, water: -1000,
  fog: ['#433f66', 140, 520], steps: ['Laying Star Square', 'Raising the skyline', 'Lighting the fountain'],
  stage: starSquareStage,
  build(e) { return buildStar(e); },
};