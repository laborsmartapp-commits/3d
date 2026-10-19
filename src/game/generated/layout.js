import { walkables } from '../realm/layout';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// Point inside a (rotated) rectangle {x,z,w,d,ry}.
export const inRect = (o, x, z, m = 0) => { const c = Math.cos(o.ry || 0), s = Math.sin(o.ry || 0), dx = x - o.x, dz = z - o.z; return Math.abs(dx * c - dz * s) <= o.w / 2 + m && Math.abs(dx * s + dz * c) <= o.d / 2 + m; };

// A flight of stairs: dir = compass direction of ascent (0 = +z). at(x, z) = walk height or null.
export function stairShape(s) {
  const sn = Math.sin(s.dir), cs = Math.cos(s.dir);
  return { ...s, at(x, z) { const dx = x - s.x, dz = z - s.z, along = dx * sn + dz * cs, across = dx * cs - dz * sn; if (Math.abs(across) > s.w / 2 || Math.abs(along) > s.run / 2 + 0.05) return null; return s.from_y + (s.to_y - s.from_y) * clamp((along + s.run / 2) / s.run, 0, 1); } };
}
// Arched footbridge between two points.
function bridgeShape(e) {
  const dx = e.x2 - e.x1, dz = e.z2 - e.z1, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, w = e.w || 2, y = e.y ?? Math.min(1.2, L * 0.08);
  return { at(x, z) { const px = x - e.x1, pz = z - e.z1, t = (px * ux + pz * uz) / L, across = Math.abs(-px * uz + pz * ux); if (t < 0 || t > 1 || across > w / 2) return null; return y * Math.sin(Math.PI * t); } };
}

// Ground, floors, stairs, walkable elements and named zones of a generated stage: one query drives
// characters, cameras and furniture placement (same contract as the Living Realm layout).
export function makeLayout(spec) {
  const hills = spec.terrain?.hills || [], floors = spec.floors || [];
  const surf = [], shapes = [], covers = [];
  const stairs = (spec.stairs || []).map(stairShape);
  for (const e of spec.elements || []) {
    const r = { x: e.x, z: e.z, w: e.w || 2, d: e.d || 2, ry: e.ry || 0 };
    if (e.type === 'sidewalk') surf.push({ ...r, y: 0.15 });
    else if (e.type === 'path' || e.type === 'plaza') surf.push({ ...r, y: 0.03 });
    else if (e.type === 'platform') {
      const h = e.h ?? 0.5; surf.push({ ...r, y: h });
      // Taller platforms get real steps on their front (+z local) edge so actors can climb them.
      if (h > 0.55) { const run = h * 1.7, a = r.ry, ox = Math.sin(a) * (r.d / 2 + run / 2), oz = Math.cos(a) * (r.d / 2 + run / 2); stairs.push(stairShape({ id: `${e.id}_steps`, x: r.x + ox, z: r.z + oz, w: Math.min(3, r.w * 0.6), run, from_y: 0, to_y: h, dir: a + Math.PI, material: e.material || 'concrete', auto: true })); }
    } else if (e.type === 'gazebo') { const rr = e.r || 3; surf.push({ x: e.x, z: e.z, w: rr * 1.8, d: rr * 1.8, ry: 0, y: 0.2 }); covers.push({ x: e.x, z: e.z, w: rr * 2, d: rr * 2 }); }
    else if (e.type === 'bridge' && e.x1 != null) shapes.push(bridgeShape(e));
  }
  for (const r of spec.roofs || []) covers.push(r);
  for (const b of spec.buildings || []) covers.push(b);
  const zones = [...(spec.zones || [])].sort((a, b) => a.w * a.d - b.w * b.d);

  const terrain = (x, z) => { let h = 0; for (const k of hills) { const d = Math.hypot(x - k.x, z - k.z) / k.r; if (d < 1) h += k.h * (0.5 + 0.5 * Math.cos(Math.PI * d)); } return h; };
  const baseGroundAt = (x, z, y = 0) => {
    const lim = y + 0.65; let g = terrain(x, z);
    for (const f of floors) if (f.y <= lim && f.y > g && inRect(f, x, z)) g = f.y;
    for (const s of surf) if (s.y <= lim && s.y > g && inRect(s, x, z)) g = s.y;
    for (const s of stairs) { const h = s.at(x, z); if (h != null && h <= lim && h > g) g = h; }
    for (const s of shapes) { const h = s.at(x, z); if (h != null && h <= lim && h > g) g = h; }
    return g;
  };
  const groundAt = (x, z, y = 0, ignore) => {
    const lim = y + 0.65; let g = baseGroundAt(x, z, y);
    for (const w of walkables) {
      if (ignore?.has(w)) continue;
      const dx = x - w.x, dz = z - w.z, c = Math.cos(w.rot), s = Math.sin(w.rot);
      if (Math.abs(dx * c - dz * s) <= w.hw && Math.abs(dx * s + dz * c) <= w.hd && w.y <= lim && w.y > g) g = w.y;
    }
    return g;
  };
  const zoneAt = (x, z) => zones.find((o) => inRect(o, x, z))?.name || spec.name;
  const covered = (x, z) => covers.some((r) => inRect(r, x, z));
  return { terrain, baseGroundAt, groundAt, zoneAt, covered, stairs, surf };
}