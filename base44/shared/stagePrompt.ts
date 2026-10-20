import { STYLES } from './stageCapabilities.ts';

// Model ids verified against the platform AI catalog (both answered a live probe).
export const MODELS = { standard: 'claude-sonnet-5', maximum: 'claude_opus_5_5' };
export const short = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

export function settingsText(o) {
  const line = (k, v) => (v == null || v === '' || (Array.isArray(v) && !v.length) ? '' : `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}\n`);
  return line('Stage name', short(o.name, 80)) + line('Stage type', o.category) + line('Texture / rendering style', STYLES[o.style]?.label) + line('Visual quality target', o.visual) + line('Scale', o.scale)
    + line('Architectural complexity', o.complexity) + line('Environment', o.environment) + line('Walkability', o.walkability) + line('Levels', o.levels)
    + line('Decoration density', o.density) + line('Materials & surfaces', o.materials) + line('Furnishings & props', o.props)
    + line('VFX', o.vfx) + line('Production purpose', o.purpose) + line('Performance target', o.target);
}

export function rules(style) {
  const S = STYLES[style] || STYLES.stylized_hires;
  return `You are the stage-blueprint planner inside MationStudio. You design 3D film stages that MationStudio's own procedural builders construct.
Use ONLY the components, materials, furnishings, effects and parameters in the CAPABILITY REGISTRY. Never invent types, materials or asset names: anything unlisted is rejected by the validator.
Know the difference: a material is a surface definition (procedural texture + PBR values), not an image file; floors/stairs/platforms are walkable, buildings are solid non-enterable exteriors, enterable rooms are floors+walls+roofs; an "emissive" material only glows, a lights[] entry actually illuminates; furnishings are editable catalog pieces (no imported 3D model files); vfx are animated real-time systems.
When something requested does not exist in the registry, build the closest compatible thing and add one plain sentence per substitution to "substitutions" (e.g. "No piano bench exists: used an ottoman"). Never silently drop a significant requested feature.
Rendering style "${S.label}": geometry = ${S.geometry}; materials = ${S.materials}.
Never include weather, time of day, sky, fog, rain, snow or lightning: the director sets those live in the Weather bubble.
Spatial rules: metres, y up, stage centred on (0,0), everything inside bounds. Rotation ry in radians; a furnishing with ry=0 faces +z (a sofa against a wall at larger z needs ry=PI). Keep 1.2 m walking lanes; never place anything inside walls.`;
}