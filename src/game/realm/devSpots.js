import { STAIR, F1, F2 } from './layout';

// Development test starting positions (NOT a gameplay teleport). Furniture spots are derived from the live
// set's own interaction anchors, so they follow the furniture if it is moved in Set Edit.
const cx = (STAIR.x0 + STAIR.x1) / 2;
const obj = (R, key) => R.set.list.find((o) => o.key === key || o.id === key);
export const anchorOf = (R, key, label) => { const o = obj(R, key); if (!o) return null; const l = R.set.anchors(o); return (label ? l.find((a) => a.label === label) : null) || l[0] || null; };

// Stand d metres out along the anchor's facing direction, looking at the mark.
const approach = (a, d) => a && { x: a.x + Math.sin(a.yaw) * d, z: a.z + Math.cos(a.yaw) * d, y: a.y, yaw: a.yaw + Math.PI, anchor: a };

export const SPOTS = {
  stairBottom: () => ({ x: cx, z: STAIR.lo + 0.6, y: F1, yaw: Math.PI }),
  stairTop: () => ({ x: cx, z: STAIR.hi - 0.6, y: F2, yaw: 0 }),
  couch: (R) => approach(anchorOf(R, 'liv.sectional', 'Sit Center'), 0.7),
  boothDoor: () => ({ x: -5.9, z: -1.75, y: F1, yaw: -Math.PI / 2 }), // studio side of the Booth Door
  studioDesk: (R) => approach(anchorOf(R, 'stu.chair'), 1.2),
  boothMic: (R) => approach(anchorOf(R, 'bth.mic'), 1.0),
  djBooth: (R) => { const a = anchorOf(R, 'dj.booth'); return a && { x: a.x + 0.6, z: a.z, y: a.y + 0.4, yaw: -Math.PI / 2, anchor: a }; },
};