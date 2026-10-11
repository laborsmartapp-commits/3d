import { BLOCKS, SPACES } from './layout';
import { buildGround } from './ground';
import { buildBlock, buildEdges } from './blocks';
import { buildPark } from './park';
import { buildStreetProps } from './streetProps';
import { Forest, spaceRing } from './kit';

// Each band of blocks has its own stone, so players can tell where they are.
const PALETTE = { '-137': ['brick', 'sandstone'], '-57': ['marble', 'sandstone'], '83': ['brickRed', 'brick'] };

export function buildDistrict(e, r) {
  const forest = new Forest();
  buildGround(e);
  for (const b of BLOCKS) buildBlock(e, b, r, PALETTE[b.z0]);
  buildEdges(e, r);
  buildPark(e, r, forest);
  buildStreetProps(e, r, forest);
  for (const s of SPACES) spaceRing(e, s);
  forest.build(e, r);
}