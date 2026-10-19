import { groundAt, zoneAt, SPAWN, inHouse, PORCH } from './layout';

// Rain, snow and wet ground stay out of the house and off the covered porch.
const covered = (x, z) => inHouse(x, z) || (x >= PORCH.x0 && x <= PORCH.x1 && z >= PORCH.z0 && z <= PORCH.z1);
import { buildRealm } from './index';
import { livingRealmStage } from '../stages/adapters';

// Krush's Living Realm as a stage on the shared street-level engine (player, camera, collision, studio).
export const LIVING_REALM = {
  id: 'living-realm', name: "Krush's Living Realm", groundAt, zoneAt, spawn: SPAWN, water: -1000,
  fog: ['#d6e8f6', 40, 380], steps: ['Laying the street and yard', "Raising Krush's house", 'Dressing every room'],
  stage: livingRealmStage, showPlayer: true, covered, weather: { hour: 15, conditions: ['clear'] },
  build(e) { return buildRealm(e); },
};