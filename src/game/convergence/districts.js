import * as Blvd from './district/layout';
import { buildDistrict } from './district';
import { buildClockTower } from './boulevard/clockTower';

// The Convergence's neighbourhoods. More districts (Market, Gardens, Star, Vega) plug in here.
export const DISTRICTS = {
  boulevard: {
    id: 'boulevard', name: 'Astral Boulevard', groundAt: Blvd.groundAt, zoneAt: Blvd.zoneAt, spawn: Blvd.SPAWN,
    fog: ['#d9e6ee', 90, 420], steps: ['Paving Astral Boulevard', 'Raising the storefronts', 'Winding the celestial clock'],
    build(e, r) { buildDistrict(e, r); return buildClockTower(e); },
  },
};