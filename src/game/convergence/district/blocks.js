import { buildRow } from '../boulevard/buildings';
import { PLAZA, LIM, PARK } from './layout';

// A long face gets a passage through its middle into the block's courtyard.
function face(e, axis, side, f, a0, a1, r, walls) {
  if (a1 - a0 >= 50) {
    const m = (a0 + a1) / 2;
    buildRow(e, side, f, a0, m - 3, r, { axis, walls });
    buildRow(e, side, f, m + 3, a1, r, { axis, walls });
  } else buildRow(e, side, f, a0, a1, r, { axis, walls });
}

// A city block: shopfronts on all four sides facing the streets, a courtyard inside.
export function buildBlock(e, b, r, walls) {
  const { x0, x1, z0, z1, central } = b;
  for (const [f, side] of [[x0, 1], [x1, -1]]) {
    const blvd = Math.abs(f) === 13;
    if (central && blvd) {
      buildRow(e, side, f, z0, -PLAZA.hz, r, { walls });
      buildRow(e, side, f, PLAZA.hz, z1, r, { walls });
      buildRow(e, side, Math.sign(f) * PLAZA.hx, -PLAZA.hz, PLAZA.hz, r, { walls });
    } else face(e, 'z', side, f, z0, z1, r, walls);
  }
  face(e, 'x', 1, z0, x0 + 12, x1 - 12, r, walls);
  face(e, 'x', -1, z1, x0 + 12, x1 - 12, r, walls);
}

// The frontages that close the district: the market's east side and the far ends.
export function buildEdges(e, r) {
  buildRow(e, 1, 123, -LIM.z - 12, LIM.z + 12, r, { walls: ['brickRed', 'brick', 'sandstone'] });
  buildRow(e, -1, -LIM.z, PARK.x1, 123, r, { axis: 'x', walls: ['sandstone', 'marble'] });
  buildRow(e, 1, LIM.z, PARK.x1, 123, r, { axis: 'x', walls: ['sandstone', 'marble'] });
}