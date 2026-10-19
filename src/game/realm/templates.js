import { DEFAULT_SET } from './defaultSet';
import { F1, F2, SLAB, TOP, PORCH, baseGroundAt } from './layout';
import { prepare } from './catalog';

const N = 0, S = Math.PI, E = Math.PI / 2;
export const ENV_DEFAULT = { hour: 15.5, azimuth: 35, sun: 1, weather: 'clear', fog: 1, exposure: 1, interior: 1, outdoor: 'auto', accent: 'warm', party: false, rooms: {} };

// Named set configurations: each starts from the everyday dressing and re-stages it.
export const TEMPLATES = {
  everyday: { name: 'Everyday House', env: {} },
  party: {
    name: 'Backyard Party', env: { hour: 21.3, party: true, accent: 'party', outdoor: 'on', interior: 0.8 },
    move: { 'pat.c1': { x: -2.6, z: -16.2, ry: S }, 'pat.c2': { x: -0.9, z: -16.5, ry: S }, 'pat.c3': { x: 0.9, z: -16.5, ry: S }, 'pat.c4': { x: 2.6, z: -16.2, ry: S }, 'pat.cooler': { x: -2.2, z: -17.4 }, 'pat.umb': { x: -6.0, z: -10.6 } },
    add: [
      { key: 'pty.b1', type: 'balloons', x: -3.4, z: -18.4, f: 0 }, { key: 'pty.b2', type: 'balloons', x: 3.4, z: -18.4, f: 0, color: '#05cc8d' }, { key: 'pty.b3', type: 'balloons', x: -6.6, z: -8.4, f: 0, color: '#a56bff' },
      { key: 'pty.s3', type: 'party_spot', x: -3.4, z: -17.2, f: 0 }, { key: 'pty.s4', type: 'party_spot', x: 3.4, z: -17.2, f: 0 },
      { key: 'pty.pizza', type: 'pizza_box', x: -3.3, z: -10.2, f: 0, dy: 0.74 }, { key: 'pty.can1', type: 'soda_can', x: -3.9, z: -10.0, f: 0, dy: 0.74 }, { key: 'pty.can2', type: 'soda_can', x: -3.0, z: -10.4, f: 0, dy: 0.74, color: '#05cc8d' },
      { key: 'pty.str4', type: 'string_lights', x: 0, z: -16.8, f: 0 },
    ],
  },
  christmas: {
    name: 'Christmas Interior', env: { hour: 18.4, accent: 'warm', outdoor: 'on', interior: 1.15 },
    remove: ['liv.floorlamp', 'foy.vase'],
    move: { 'liv.arm1': { x: -8.1, z: 0.6 } },
    add: [
      { key: 'xm.tree', type: 'christmas_tree', x: -8.0, z: 4.9, f: 1 }, { key: 'xm.gifts', type: 'gift_stack', x: -7.3, z: 4.4, f: 1 }, { key: 'xm.gift1', type: 'gift_box', x: -8.6, z: 4.2, f: 1 }, { key: 'xm.gift2', type: 'gift_box', x: -7.6, z: 5.5, ry: 0.4, f: 1, color: '#2f6f73' },
      { key: 'xm.gar1', type: 'garland', x: 2.3, z: 3.5, ry: E, f: 1, dy: 0.8 }, { key: 'xm.gar2', type: 'garland', x: -1.76, z: 5.2, ry: E, f: 1, dy: 0.8 },
      { key: 'xm.wr1', type: 'wreath', x: -4.2, z: 6.115, ry: N, f: 1, dy: 1.25 }, { key: 'xm.wr2', type: 'wreath', x: 4.0, z: 6.115, ry: N, f: 1, dy: 1.25 }, { key: 'xm.wr3', type: 'wreath', x: 0, z: 6.13, ry: N, f: 1, dy: 1.35 },
      { key: 'xm.candles', type: 'candle_set', x: 5.0, z: 3.5, f: 1, dy: 0.755 },
    ],
  },
};

function resolve(a) {
  const base = a.f === 1 ? F1 : a.f === 2 ? F2 : a.f === 'p' ? PORCH.y : baseGroundAt(a.x, a.z, 0);
  const y = a.dy === 'ceil' ? (a.f === 2 ? TOP : F2 - SLAB) - prepare(a.type).box.max.y : base + (a.dy || 0);
  const o = { key: a.key, type: a.type, x: a.x, y, z: a.z, ry: a.ry || 0 };
  if (a.color) o.color = a.color;
  return o;
}

export function buildTemplate(key) {
  const t = TEMPLATES[key] || TEMPLATES.everyday;
  let list = DEFAULT_SET.map((a) => ({ ...a }));
  if (t.remove) list = list.filter((a) => !t.remove.includes(a.key));
  if (t.move) for (const a of list) if (t.move[a.key]) Object.assign(a, t.move[a.key]);
  if (t.add) list.push(...t.add);
  return { objects: list.map(resolve), environment: { ...ENV_DEFAULT, ...t.env }, view: null };
}