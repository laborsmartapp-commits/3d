import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { capabilityDoc, MATERIALS } from '../../shared/stageCapabilities.ts';
import { validateSpec, applyPatch } from '../../shared/stageValidate.ts';
import { PATCH, rowRule, PATCH_RULE, parseSections, parseSet } from '../../shared/stageSchemas.ts';
import { MODELS, rules, short } from '../../shared/stagePrompt.ts';

// Stage versions and refinements. New stages and variations are built by stageConstruction (progressive, resumable).
const ALL_KEYS = ['zones', 'floors', 'walls', 'roofs', 'stairs', 'buildings', 'elements', 'furnishings', 'nature', 'vfx', 'lights', 'cameras', 'marks'];
const MAX_PER_HOUR = 12;

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
    if (!parent) return Response.json({ error: 'Stage not found' }, { status: 404 });
    if (parent.status === 'building') return Response.json({ error: 'This stage is still under construction' }, { status: 409 });
    const save = async (spec, report, extra) => {
      const rec = await Stages.create({ name: spec.name, description: spec.summary, category: spec.category, texture_style: spec.style, status: 'active', report, spec, ...extra });
      return extra.root_id ? rec : Stages.update(rec.id, { root_id: rec.id });
    };
    const lineage = (mode) => ({ version: (parent.version || 1) + 1, root_id: parent.root_id || parent.id, parent_id: parent.id, creation_mode: mode, settings: parent.settings, prompt: parent.prompt, tags: parent.tags, template_origin: parent.template_origin });
    const target = parent.settings?.target;

    // Non-AI operations: duplicate, save the current Set Edit arrangement as a version, swap surface materials.
    if (action === 'duplicate') {
      const { spec, report } = validateSpec({ ...parent.spec, name: short(body.name, 80) || `${parent.name} (copy)` }, { style: parent.spec.style, target, environment: parent.spec.environment });
      const rec = await save(spec, report, { version: 1, creation_mode: 'duplicate', parent_id: parent.id, settings: parent.settings, prompt: parent.prompt, tags: parent.tags, template_origin: parent.root_id || parent.id });
      return Response.json({ stage: rec });
    }
    if (action === 'edit') {
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
    if (action === 'commit' && body.spec) {
      const { spec, report } = validateSpec(body.spec, { style: parent.spec.style, target, environment: parent.spec.environment });
      report.ai = body.report?.ai; report.substitutions = Array.isArray(body.report?.substitutions) ? body.report.substitutions.slice(0, 20) : [];
      const summary = short(body.summary, 300), instruction = short(body.instruction, 500);
      const rec = await save(spec, report, { ...lineage('refine'), prompt_summary: summary, refine_history: [...(parent.refine_history || []), { instruction, summary, at: new Date().toISOString() }] });
      return Response.json({ stage: rec });
    }

    if (action !== 'refine') return Response.json({ error: 'Unknown action' }, { status: 400 });
    const since = new Date(Date.now() - 3600e3).toISOString();
    const recent = await Stages.count({ created_by_id: user.id, created_date: { $gte: since }, creation_mode: 'refine' });
    if (recent >= MAX_PER_HOUR) return Response.json({ error: `Refinement limit reached (${MAX_PER_HOUR} per hour). Try again later.` }, { status: 429 });
    const model = MODELS[body.quality] || MODELS.standard, started = Date.now();
    const instruction = short(body.instruction, 500).trim();
    if (!instruction) return Response.json({ error: 'Describe the change' }, { status: 400 });
    const base = JSON.parse(JSON.stringify(parent.spec));
    if (Array.isArray(body.current_objects)) base.furnishings = toFurnishings(body.current_objects); // keep the director's Set Edit arrangement
    const prompt = `${rules(base.style)}\n\nCAPABILITY REGISTRY:\n${JSON.stringify(capabilityDoc())}\n\nCURRENT STAGE BLUEPRINT (every object has an id):\n${JSON.stringify(base)}\n\nREFINEMENT REQUEST: "${instruction}"\n\nReturn a PATCH, not a new stage: "add" new objects per section, "update" existing objects by id with only the changed fields in "set", "remove" ids only when the request clearly asks to delete something. Leave every unrelated object exactly as it is. Place new objects clear of existing walls, buildings and furniture. "summary" = one sentence describing the change.\n\n${rowRule(ALL_KEYS)}\n${PATCH_RULE} Use empty lists for sections with nothing to add.`;
    const pr = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: PATCH, model });
    const patch = { ...pr, add: parseSections(pr.add, ALL_KEYS), update: (pr.update || []).map((u) => ({ id: u.id, set: parseSet(u.set) })) };
    const { spec, report } = validateSpec(applyPatch(base, patch), { style: base.style, target, environment: base.environment });
    const changes = { added: Object.values(patch.add || {}).reduce((n, a) => n + (Array.isArray(a) ? a.length : 0), 0), updated: patch.update?.length || 0, removed: patch.remove?.length || 0 };
    report.ai = { model, seconds: Math.round((Date.now() - started) / 1000), changes };
    report.substitutions = (patch.substitutions || []).slice(0, 20);
    // Preview only: the client shows the result and commits it with action "commit" (or discards it).
    return Response.json({ preview: { spec, report, summary: short(patch.summary, 300), instruction } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}