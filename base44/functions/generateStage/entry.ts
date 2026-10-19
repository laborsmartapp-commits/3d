import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { capabilityDoc, STYLES, MATERIALS } from '../../shared/stageCapabilities.ts';
import { validateSpec, applyPatch } from '../../shared/stageValidate.ts';

// Model ids verified against the platform AI catalog (both answered a live probe).
const MODELS = { standard: 'claude-sonnet-5', maximum: 'claude_opus_5_5' };
const MAX_PER_HOUR = 12;
const short = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

const ITEM = { type: 'object', additionalProperties: true };
const ARR = { type: 'array', items: ITEM };
const SECTIONS = { zones: ARR, floors: ARR, walls: ARR, roofs: ARR, stairs: ARR, buildings: ARR, elements: ARR, nature: ARR, furnishings: ARR, vfx: ARR, lights: ARR, cameras: ARR, marks: ARR };
const BLUEPRINT = {
  type: 'object',
  properties: {
    name: { type: 'string' }, summary: { type: 'string' }, category: { type: 'string' },
    bounds: { type: 'object', properties: { w: { type: 'number' }, d: { type: 'number' } } },
    ground: { type: 'object', properties: { material: { type: 'string' }, color: { type: 'string' } } },
    palette: { type: 'array', items: { type: 'string' } },
    terrain: { type: 'object', properties: { hills: ARR } },
    ...SECTIONS,
    spawn: { type: 'object', properties: { x: { type: 'number' }, z: { type: 'number' }, yaw: { type: 'number' } } },
    substitutions: { type: 'array', items: { type: 'string' } },
  },
  required: ['name', 'summary', 'bounds', 'ground', 'floors', 'furnishings', 'cameras', 'spawn', 'substitutions'],
};
const PATCH = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    add: { type: 'object', properties: SECTIONS },
    remove: { type: 'array', items: { type: 'string' } },
    update: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, set: ITEM } } },
    substitutions: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'substitutions'],
};

function settingsText(o) {
  const line = (k, v) => (v == null || v === '' || (Array.isArray(v) && !v.length) ? '' : `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}\n`);
  return line('Stage name', short(o.name, 80)) + line('Stage type', o.category) + line('Texture / rendering style', STYLES[o.style]?.label) + line('Scale', o.scale)
    + line('Architectural complexity', o.complexity) + line('Environment', o.environment) + line('Walkability', o.walkability) + line('Levels', o.levels)
    + line('Decoration density', o.density) + line('Materials & surfaces', o.materials) + line('Furnishings & props', o.props)
    + line('VFX', o.vfx) + line('Production purpose', o.purpose) + line('Performance target', o.target);
}

function rules(style) {
  const S = STYLES[style] || STYLES.stylized_hires;
  return `You are the stage-blueprint planner inside MationStudio. You design 3D film stages that MationStudio's own procedural builders construct.
Use ONLY the components, materials, furnishings, effects and parameters in the CAPABILITY REGISTRY. Never invent types, materials or asset names: anything unlisted is discarded by the validator.
Know the difference: a material is a surface definition (procedural texture + PBR values), not an image file; floors/stairs/platforms are walkable, buildings are solid non-enterable exteriors, enterable rooms are floors+walls+roofs; an "emissive" material only glows, a lights[] entry actually illuminates; furnishings are editable catalog meshes built from primitives (there are no imported 3D model files); vfx are animated real-time systems.
When something requested does not exist in the registry, build the closest compatible thing and add one plain sentence per substitution to "substitutions" (e.g. "No car model exists: parked cars were left out"). Never silently drop a significant requested feature.
Rendering style "${S.label}": geometry = ${S.geometry}; materials = ${S.materials}. Choose materials, proportions, detail and vegetation that suit this style.
Never include weather, time of day, sky, fog, rain, snow or lightning: the director sets those live in the Weather bubble.
Spatial rules: metres, y up, stage centred on (0,0), everything inside bounds. Interiors: floors under every room, walls (h 3-4.5) with door/opening gaps connecting every room to the spawn, a flat roof as ceiling, windows/glass in exterior walls, stairs (run >= 1.5 x rise) to upper floors. Furniture: against walls with sensible facing (ry=0 faces +z, so a sofa against a wall at larger z needs ry=PI), 1.2 m walking lanes, never inside walls. Spawn on open walkable floor. 3-6 production cameras with clear sightlines (look_x/look_y/look_z) and floor marks where actors perform. Name zones meaningfully.
Lighting: practical fixtures = furnishing (lamp, sconce, street_lamp...) and, where extra light is wanted, a lights[] entry at the same spot.`;
}

// The live Set Edit arrangement (moved / recoloured / added furniture) becomes the blueprint's furnishings.
function toFurnishings(list) {
  return list.slice(0, 400).filter((o) => o && typeof o.type === 'string' && !o.hidden).map((o) => ({ id: typeof o.key === 'string' ? o.key : typeof o.id === 'string' ? o.id : undefined, type: o.type, x: +o.x || 0, y: +o.y || 0, z: +o.z || 0, ry: +o.ry || 0, scale: +o.sx || 1, color: o.color || undefined }));
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const action = body.action;
    if (action === 'capabilities') return Response.json({ registry: capabilityDoc(), models: MODELS });

    const Stages = base44.entities.GeneratedStage;
    const parent = body.parent_id ? await Stages.get(body.parent_id) : null;
    if (body.parent_id && !parent) return Response.json({ error: 'Stage not found' }, { status: 404 });
    const save = async (spec, report, extra) => {
      const rec = await Stages.create({ name: spec.name, description: spec.summary, category: spec.category, texture_style: spec.style, status: 'active', report, spec, ...extra });
      return extra.root_id ? rec : Stages.update(rec.id, { root_id: rec.id });
    };
    const lineage = (mode) => ({ version: (parent.version || 1) + 1, root_id: parent.root_id || parent.id, parent_id: parent.id, creation_mode: mode, settings: parent.settings, prompt: parent.prompt, tags: parent.tags, template_origin: parent.template_origin });
    const target = parent?.settings?.target;

    // Non-AI operations: duplicate, save the current Set Edit arrangement as a version, swap surface materials.
    if (action === 'duplicate' && parent) {
      const { spec, report } = validateSpec({ ...parent.spec, name: short(body.name, 80) || `${parent.name} (copy)` }, { style: parent.spec.style, target, environment: parent.spec.environment });
      const rec = await save(spec, report, { version: 1, creation_mode: 'duplicate', parent_id: parent.id, settings: parent.settings, prompt: parent.prompt, tags: parent.tags, template_origin: parent.root_id || parent.id });
      return Response.json({ stage: rec });
    }
    if (action === 'edit' && parent) {
      const swaps = Array.isArray(body.swaps) ? body.swaps.slice(0, 20) : [];
      const s = JSON.parse(JSON.stringify(parent.spec));
      if (Array.isArray(body.current_objects)) s.furnishings = toFurnishings(body.current_objects);
      for (const w of swaps) {
        if (!MATERIALS[w.to]) continue;
        if (w.section === 'ground') { s.ground.material = w.to; continue; }
        const key = w.section === 'buildings' ? 'facade' : 'material';
        for (const o of s[w.section] || []) if ((o[key] || '') === w.from) o[key] = w.to;
      }
      const { spec, report } = validateSpec(s, { style: s.style, target, environment: s.environment });
      const note = swaps.length ? `Materials: ${swaps.map((w) => `${w.from} → ${w.to}`).join(', ')}` : 'Saved the current Set Edit arrangement';
      const rec = await save(spec, report, { ...lineage('edit'), prompt_summary: note, refine_history: [...(parent.refine_history || []), { kind: 'edit', summary: note, at: new Date().toISOString() }] });
      return Response.json({ stage: rec });
    }

    // Commit a previewed refinement as a new version (re-validated: the client never writes a raw spec).
    if (action === 'commit' && parent && body.spec) {
      const { spec, report } = validateSpec(body.spec, { style: parent.spec.style, target, environment: parent.spec.environment });
      report.ai = body.report?.ai; report.substitutions = Array.isArray(body.report?.substitutions) ? body.report.substitutions.slice(0, 20) : [];
      const summary = short(body.summary, 300), instruction = short(body.instruction, 500);
      const rec = await save(spec, report, { ...lineage('refine'), prompt_summary: summary, refine_history: [...(parent.refine_history || []), { instruction, summary, at: new Date().toISOString() }] });
      return Response.json({ stage: rec });
    }

    if (!['create', 'variation', 'refine'].includes(action)) return Response.json({ error: 'Unknown action' }, { status: 400 });
    const since = new Date(Date.now() - 3600e3).toISOString();
    const recent = await Stages.count({ created_by_id: user.id, created_date: { $gte: since }, creation_mode: { $in: ['structured', 'quick', 'variation', 'refine'] } });
    if (recent >= MAX_PER_HOUR) return Response.json({ error: `Generation limit reached (${MAX_PER_HOUR} per hour). Try again later.` }, { status: 429 });
    const model = MODELS[body.quality] || MODELS.standard;
    const llm = base44.asServiceRole.integrations.Core;
    const registry = JSON.stringify(capabilityDoc());
    const started = Date.now();

    if (action === 'refine') {
      if (!parent) return Response.json({ error: 'Choose a stage to refine' }, { status: 400 });
      const instruction = short(body.instruction, 500).trim();
      if (!instruction) return Response.json({ error: 'Describe the change' }, { status: 400 });
      const base = JSON.parse(JSON.stringify(parent.spec));
      if (Array.isArray(body.current_objects)) base.furnishings = toFurnishings(body.current_objects); // keep the director's Set Edit arrangement
      const prompt = `${rules(base.style)}\n\nCAPABILITY REGISTRY:\n${registry}\n\nCURRENT STAGE BLUEPRINT (every object has an id):\n${JSON.stringify(base)}\n\nREFINEMENT REQUEST: "${instruction}"\n\nReturn a PATCH, not a new stage: "add" new objects per section (omit ids), "update" existing objects by id with only the changed fields in "set", "remove" ids only when the request clearly asks to delete something. Leave every unrelated object exactly as it is. Place new objects clear of existing walls, buildings and furniture. "summary" = one sentence describing the change.`;
      const patch = await llm.InvokeLLM({ prompt, response_json_schema: PATCH, model });
      const merged = applyPatch(base, patch);
      const { spec, report } = validateSpec(merged, { style: base.style, target, environment: base.environment });
      const changes = { added: Object.values(patch.add || {}).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0), updated: patch.update?.length || 0, removed: patch.remove?.length || 0 };
      report.ai = { model, seconds: Math.round((Date.now() - started) / 1000), changes };
      report.substitutions = (patch.substitutions || []).slice(0, 20);
      // Preview only: the client shows the result and commits it with action "commit" (or discards it).
      return Response.json({ preview: { spec, report, summary: short(patch.summary, 300), instruction } });
    }

    const settings = action === 'variation' ? parent?.settings : body.settings;
    if (!settings?.style || !STYLES[settings.style]) return Response.json({ error: 'Choose a texture / rendering style' }, { status: 400 });
    const details = short(action === 'variation' ? parent?.prompt : body.prompt, 600);
    const variation = action === 'variation' ? `\nThis is a VARIATION of an existing stage ("${parent.spec.summary}"). Same brief, clearly different layout, arrangement and detailing.` : '';
    const prompt = `${rules(settings.style)}\n\nCAPABILITY REGISTRY:\n${registry}\n\nDIRECTOR'S STRUCTURED BRIEF:\n${settingsText(settings)}${details ? `\nSPECIAL CREATIVE DETAILS: "${details}"` : ''}${variation}\n\nReturn the complete stage blueprint as JSON. Fill the "${settings.target || 'balanced'}" performance budget with meaningful detail without exceeding it.`;
    const raw = await llm.InvokeLLM({ prompt, response_json_schema: BLUEPRINT, model });
    if (settings.name && action === 'create') raw.name = short(settings.name, 80);
    raw.category = settings.category || raw.category;
    const { spec, report } = validateSpec(raw, { style: settings.style, target: settings.target, environment: settings.environment });
    report.ai = { model, seconds: Math.round((Date.now() - started) / 1000) };
    report.substitutions = (raw.substitutions || []).slice(0, 20);
    const extra = action === 'variation' ? lineage('variation') : { version: 1, creation_mode: body.mode === 'quick' ? 'quick' : 'structured', settings, prompt: details, tags: [settings.category, settings.style].filter(Boolean) };
    const rec = await save(spec, report, { ...extra, prompt_summary: short(spec.summary, 300) });
    return Response.json({ stage: rec });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}