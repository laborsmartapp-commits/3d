import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { capabilityDoc, STYLES, MATERIALS } from '../../shared/stageCapabilities.ts';
import { validateSpec, applyPatch } from '../../shared/stageValidate.ts';
import { SHELL, DRESS, PATCH, SHELL_KEYS, DRESS_KEYS, rowRule, PATCH_RULE, parseSections, parseHills, parseSet } from '../../shared/stageSchemas.ts';

const ALL_KEYS = [...SHELL_KEYS, ...DRESS_KEYS];
const empty = (keys) => Object.fromEntries(keys.map((k) => [k, []]));

// Model ids verified against the platform AI catalog (both answered a live probe).
const MODELS = { standard: 'claude-sonnet-5', maximum: 'claude_opus_5_5' };
const MAX_PER_HOUR = 12;
const short = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

// Generation runs in two AI calls (each must finish inside the platform's 120 s AI window):
// "shell" = layout + architecture, "dress" = furnishings, nature, effects, lights, cameras, marks.
const CAPS = {
  shell: 'Section caps for this call: zones <= 10, floors <= 24, walls <= 48 segments, roofs <= 16, stairs <= 6, buildings <= 16, elements <= 40. Leave furnishings, nature, vfx, lights, cameras and marks for the second call.',
  dress: 'Section caps for this call: furnishings <= 80, lights <= 16, nature <= 24 entries (use count/radius for clusters), vfx <= 8, cameras 3-6, marks <= 8.',
};
const COMPACT = 'Short ids, numbers rounded to 2 decimals, no commentary beyond "summary" and "substitutions".';

function settingsText(o) {
  const line = (k, v) => (v == null || v === '' || (Array.isArray(v) && !v.length) ? '' : `- ${k}: ${Array.isArray(v) ? v.join(', ') : v}\n`);
  return line('Stage name', short(o.name, 80)) + line('Stage type', o.category) + line('Texture / rendering style', STYLES[o.style]?.label) + line('Visual quality target', o.visual) + line('Scale', o.scale)
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

    // Second generation call: dress the saved architecture draft, then activate it.
    if (action === 'dress') {
      const draft = body.draft_id ? await Stages.get(body.draft_id) : null;
      if (!draft || draft.status !== 'draft' || draft.created_by_id !== user.id) return Response.json({ error: 'Draft not found' }, { status: 404 });
      const st = draft.settings || {}, model = draft.report?.ai?.model || MODELS.standard, t0 = Date.now();
      const shell = { ...draft.spec, ...empty(DRESS_KEYS) };
      const prompt = `${rules(draft.spec.style)}\n\nCAPABILITY REGISTRY:\n${JSON.stringify(capabilityDoc())}\n\nDIRECTOR'S STRUCTURED BRIEF:\n${settingsText(st)}${draft.prompt ? `\nSPECIAL CREATIVE DETAILS: "${draft.prompt}"` : ''}\n\nARCHITECTURE ALREADY BUILT (step 1 of 2; every object has an id):\n${JSON.stringify(shell)}\n\nStep 2 of 2: furnish, dress and light this exact architecture. Place every piece inside the rooms with correct facing, clear of walls and openings, with 1.2 m walking lanes; group furniture into designed arrangements (seating around a focal point, rugs under seating, art and sconces on walls, plants in corners). Add lights at fixtures, 3-6 production cameras with clear sightlines and floor marks where actors perform. ${CAPS.dress} ${COMPACT}\n\n${rowRule(DRESS_KEYS)}`;
      const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: DRESS, model });
      const { spec, report } = validateSpec({ ...draft.spec, ...parseSections(raw, DRESS_KEYS), spawn: draft.spec.spawn }, { style: draft.spec.style, target: st.target, environment: draft.spec.environment });
      const s2 = Math.round((Date.now() - t0) / 1000), s1 = draft.report?.ai?.seconds || 0;
      report.ai = { model, seconds: s1 + s2, phases: [{ phase: 'architecture', seconds: s1 }, { phase: 'furnishing', seconds: s2 }] };
      report.substitutions = [...(draft.report?.substitutions || []), ...(raw.substitutions || [])].slice(0, 24);
      const rec = await Stages.update(draft.id, { status: 'active', spec, report, prompt_summary: short(spec.summary, 300) });
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
      const pr = await llm.InvokeLLM({ prompt: `${prompt}\n\n${rowRule(ALL_KEYS)}\n${PATCH_RULE} Use empty lists for sections with nothing to add.`, response_json_schema: PATCH, model });
      const patch = { ...pr, add: parseSections(pr.add, ALL_KEYS), update: (pr.update || []).map((u) => ({ id: u.id, set: parseSet(u.set) })) };
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
    const prompt = `${rules(settings.style)}\n\nCAPABILITY REGISTRY:\n${registry}\n\nDIRECTOR'S STRUCTURED BRIEF:\n${settingsText(settings)}${details ? `\nSPECIAL CREATIVE DETAILS: "${details}"` : ''}${variation}\n\nStep 1 of 2: return the stage layout and architecture as JSON (bounds, ground, zones, floors, walls with doors/windows, roofs, stairs, buildings, architectural elements, spawn). Design rooms large enough for the furniture the brief implies. ${CAPS.shell} ${COMPACT}\n\n${rowRule(SHELL_KEYS)}`;
    const r0 = await llm.InvokeLLM({ prompt, response_json_schema: SHELL, model });
    const raw = { ...r0, terrain: { hills: parseHills(r0.hills) }, ...parseSections(r0, SHELL_KEYS), ...empty(DRESS_KEYS) };
    if (settings.name && action === 'create') raw.name = short(settings.name, 80);
    raw.category = settings.category || raw.category;
    const { spec, report } = validateSpec(raw, { style: settings.style, target: settings.target, environment: settings.environment });
    report.ai = { model, seconds: Math.round((Date.now() - started) / 1000) };
    report.substitutions = (raw.substitutions || []).slice(0, 20);
    const extra = action === 'variation' ? lineage('variation') : { version: 1, creation_mode: body.mode === 'quick' ? 'quick' : 'structured', settings, prompt: details, tags: [settings.category, settings.style].filter(Boolean) };
    // Saved as a hidden draft; the client immediately runs step 2 ("dress") on it.
    const rec = await save(spec, report, { ...extra, status: 'draft', prompt_summary: short(spec.summary, 300) });
    return Response.json({ draft: rec.id, seconds: report.ai.seconds });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}