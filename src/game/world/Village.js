import { VILLAGE_BUILDINGS, VILLAGE, DOCK, WATER } from './layout';
import { boxPlatform } from './Landmarks';

export function buildVillage(e) {
  const B = e.build;
  for (const b of VILLAGE_BUILDINGS) {
    const o = B.placeStatic(b.type, b.x, b.z, b.rot, { id: b.id });
    o.lightRule = b.type === 'cottage' || b.type === 'cabin' ? 'home' : 'shop';
  }
  B.placeStatic('fountain', VILLAGE.x, VILLAGE.z, 0, { id: 'v_fountain' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    B.placeStatic('streetlamp', VILLAGE.x + Math.cos(a) * 11.5, VILLAGE.z + Math.sin(a) * 11.5, -a, { id: 'v_lamp' + i });
  }
  B.placeStatic('fire_pit', 98.5, 82.5, 0, { id: 'v_fire' });
  B.placeStatic('sign', 95, 76, Math.PI * 0.9, { id: 'v_sign' });
  B.placeStatic('flag', 103, 90, 0, { id: 'v_flag1' });
  B.placeStatic('flag', 78, 90, 0, { id: 'v_flag2' });
  const dockY = WATER + 0.2;
  B.placeStatic('fishing_dock', DOCK.x, DOCK.z, DOCK.rot, { id: 'v_dock', y: dockY });
  e.platforms.push(boxPlatform(DOCK.x - 4.5, DOCK.z, 1.3, 4.6, DOCK.rot, dockY + 0.7));
}