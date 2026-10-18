import { groundAt, zoneAt, SPAWN } from './layout';
import { buildRealm } from './index';
import { livingRealmStage } from '../stages/adapters';

// Krush's Living Realm as a stage on the shared street-level engine (player, camera, collision, studio).
export const LIVING_REALM = {
  id: 'living-realm', name: "Krush's Living Realm", groundAt, zoneAt, spawn: SPAWN, water: -1000,
  fog: ['#d6e8f6', 40, 380], steps: ['Laying the street and yard', "Raising Krush's house", 'Dressing every room'],
  stage: livingRealmStage,
  build(e) { return buildRealm(e); },
};