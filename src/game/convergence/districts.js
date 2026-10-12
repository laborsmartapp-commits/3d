import * as Blvd from './district/layout';
import { buildDistrict } from './district';
import { buildClockTower } from './boulevard/clockTower';
import * as Star from './star/layout';
import { buildStar } from './star';

// The Convergence's neighbourhoods. More districts (Market, Gardens, Star, Vega) plug in here.
export const DISTRICTS = {
  boulevard: {
    id: 'boulevard', name: 'Astral Boulevard', groundAt: Blvd.groundAt, zoneAt: Blvd.zoneAt, spawn: Blvd.SPAWN,
    fog: ['#d9e6ee', 90, 420], steps: ['Paving Astral Boulevard', 'Raising the storefronts', 'Winding the celestial clock'],
    build(e, r) { buildDistrict(e, r); return buildClockTower(e); },
  },
  // Star Square runs on the Convergence engine but is filmed as its own stage.
  star: {
    id: 'star', stage: 'star-square', name: 'Star Square', groundAt: Star.groundAt, zoneAt: Star.zoneAt, spaces: Star.SPACES, spawn: Star.SPAWN,
    fog: ['#433f66', 140, 520], steps: ['Paving Star Square', 'Raising the avenues', 'Lighting the screens'],
    build: buildStar,
  },
};