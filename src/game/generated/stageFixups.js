import { inRect } from './layout';

const r2 = (v) => Math.round(v * 100) / 100;
const inFoot = (f, x, z) => { const c = Math.cos(f.rot), s = Math.sin(f.rot), dx = x - f.x, dz = z - f.z; return Math.abs(dx * c - dz * s) < f.hw + 0.2 && Math.abs(dx * s + dz * c) < f.hd + 0.2; };

// Engine-side placement fixes for blueprint effects and lights. They change how the saved blueprint is shown,
// never the blueprint itself, so every stage benefits without regeneration.

// A blueprint fire at a fireplace burns inside its open firebox, sized to fit the opening.
export function seatFires(vfx, furn, L) {
  return vfx.map((v) => {
    const f = v.type === 'fire' && furn.find((p) => p.type === 'fireplace' && Math.hypot(p.x - v.x, p.z - v.z) < 1);
    if (!f) return v;
    const s = f.scale || 1, ry = f.ry || 0;
    return { ...v, x: f.x + 0.05 * s * Math.sin(ry), z: f.z + 0.05 * s * Math.cos(ry), y: L.baseGroundAt(f.x, f.z, f.y ?? 0) + 0.17 * s, scale: Math.min(v.scale, 0.85 * s) };
  });
}

// A practical light hung just over a piece of furniture (e.g. 0.25 m above a piano lid) burns a hot spot into
// glossy finishes. Such lights move up under the ceiling of their room; colour, intensity and range stay.
export function liftLights(R, spec) {
  const notes = [];
  for (const l of R.lightSources) {
    if (l.kind !== 'room') continue;
    const o = R.set.list.find((s) => s.foot && !s.hidden && l.y > s.y && l.y - (s.y + s.box.max.y * s.sy) < 0.9 && inFoot(s.foot, l.x, l.z));
    const roof = o && spec.roofs.find((r) => inRect(r, l.x, l.z));
    if (!roof || roof.y - 0.35 <= l.y) continue;
    notes.push(`${o.type} ${o.id}: light raised ${r2(l.y)} -> ${r2(roof.y - 0.35)} m`); l.y = roof.y - 0.35;
  }
  return notes;
}