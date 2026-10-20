import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { STYLES } from '../../shared/stageCapabilities.ts';
import { validateSpec } from '../../shared/stageValidate.ts';
import { MODELS, short } from '../../shared/stagePrompt.ts';
import { initialOps, planRest, buildPrompt, schemaFor, applyOp, opResult, splitOp, oversized, piecesSplit, measuredRate } from '../../shared/stagePipeline.ts';
import { finalChecks } from '../../shared/stageNav.ts';

// Resumable progressive stage construction. "start" saves the brief as a job (no AI call); every "step" runs
// exactly ONE small operation (one AI call, < 120 s), validates it, saves the stage, and records the result.
// A failed operation is retried alone; completed operations are never re-run.
const LEASE_MS = 170e3, MAX_JOBS_PER_HOUR = 6;
const now = () => new Date().toISOString();

function summary(job) {
  const ops = job.ops.map((o) => ({ key: o.key, phase: o.phase, label: o.label, status: o.status, requested: o.requested, constructed: o.constructed }));
  const live = ops.filter((o) => o.status !== 'split');
  return { status: job.status, done: live.filter((o) => o.status === 'done').length, total: live.length, ops: live };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const Jobs = base44.entities.StageGenJob, Stages = base44.entities.GeneratedStage;

    if (body.action === 'start') {
      const parent = body.parent_id ? await Stages.get(body.parent_id) : null;
      if (body.parent_id && !parent) return Response.json({ error: 'Stage not found' }, { status: 404 });
      const settings = parent ? parent.settings : body.settings;
      if (!settings?.style || !STYLES[settings.style]) return Response.json({ error: 'Choose a texture / rendering style' }, { status: 400 });
      const recent = await Jobs.count({ created_by_id: user.id, created_date: { $gte: new Date(Date.now() - 3600e3).toISOString() } });
      if (recent >= MAX_JOBS_PER_HOUR) return Response.json({ error: `Construction limit reached (${MAX_JOBS_PER_HOUR} new stages per hour). Try again later.` }, { status: 429 });
      const quality = body.quality === 'maximum' ? 'maximum' : 'standard', prompt = short(parent ? parent.prompt : body.prompt, 600);
      const { spec, report } = validateSpec({ name: short(settings.name, 80) || 'Untitled Stage', category: settings.category }, { style: settings.style, target: settings.target, environment: settings.environment });
      const lineage = parent
        ? { version: (parent.version || 1) + 1, root_id: parent.root_id || parent.id, parent_id: parent.id, creation_mode: 'variation', tags: parent.tags }
        : { version: 1, creation_mode: body.mode === 'quick' ? 'quick' : 'structured', tags: [settings.category, settings.style].filter(Boolean) };
      let stage = await Stages.create({ name: spec.name, category: settings.category, texture_style: spec.style, status: 'building', spec, report, settings, prompt, ...lineage });
      const job = await Jobs.create({ stage_id: stage.id, status: 'running', model: MODELS[quality], quality, settings, prompt, variation_of: parent ? short(parent.spec?.summary, 300) : '', ops: initialOps(), program: [], metrics: { ai_calls: 0, ai_seconds: 0, in_chars: 0, out_chars: 0 } });
      stage = await Stages.update(stage.id, { job_id: job.id, ...(lineage.root_id ? {} : { root_id: stage.id }) });
      return Response.json({ job, stage });
    }

    const job = body.job_id ? await Jobs.get(body.job_id) : null;
    if (!job || job.created_by_id !== user.id) return Response.json({ error: 'Construction job not found' }, { status: 404 });
    if (body.action === 'get') return Response.json({ job, stage: await Stages.get(job.stage_id) });
    if (body.action !== 'step') return Response.json({ error: 'Unknown action' }, { status: 400 });
    if (job.status === 'completed') return Response.json({ job });

    const ops = job.ops;
    let o = ops.find((x) => x.status !== 'done' && x.status !== 'split');
    if (!o) return Response.json({ job });
    const rate = measuredRate(ops, o);
    if (o.status === 'pending' && oversized(o, rate)) { const parts = piecesSplit(o, rate); ops.splice(ops.indexOf(o), 1, ...parts); o = parts[0]; }
    if (o.status === 'running' && Date.now() - Date.parse(o.started_at) < LEASE_MS) return Response.json({ job, busy: true });
    if (o.status === 'failed' && !body.retry) return Response.json({ job, needs_retry: true });
    Object.assign(o, { status: 'running', started_at: now(), attempts: (o.attempts || 0) + 1, error: '' });
    await Jobs.update(job.id, { ops, status: 'running', current: o.key, error: '' });

    let stage = await Stages.get(job.stage_id);
    const opts = { style: stage.spec.style, target: job.settings?.target, environment: stage.spec.environment };
    const m = job.metrics || { ai_calls: 0, ai_seconds: 0, in_chars: 0, out_chars: 0 }, t0 = Date.now();
    try {
      if (o.kind === 'validate') {
        const { spec, report } = validateSpec(stage.spec, opts);
        const final = finalChecks(spec);
        report.substitutions = ops.flatMap((x) => x.substitutions || []).slice(0, 40);
        report.ai = { model: job.model, seconds: Math.round(m.ai_seconds), calls: m.ai_calls };
        report.construction = { ...summary(job), status: 'completed' };
        await Stages.update(stage.id, { spec, report: { ...report, final }, status: 'active', prompt_summary: short(spec.summary, 300) });
        const back = await Stages.get(stage.id), same = JSON.stringify(back.spec) === JSON.stringify(spec);
        final.checks.push({ id: 'persistence', label: 'Stage saved and re-read', status: same ? 'pass' : 'fail', detail: same ? 'Re-read from the database unchanged' : 'The saved copy differs from the validated blueprint' });
        stage = await Stages.update(stage.id, { report: { ...back.report, final } });
        Object.assign(o, { status: 'done', finished_at: now(), seconds: (Date.now() - t0) / 1000, checks: final.checks.map((c) => ({ label: c.label, status: c.status, detail: c.detail })) });
        job.status = 'completed';
      } else {
        const prompt = buildPrompt(stage.spec, job, o);
        const raw = await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: schemaFor(o), model: job.model });
        const aiSec = (Date.now() - t0) / 1000, tv = Date.now(), out = JSON.stringify(raw).length;
        const a = applyOp(stage.spec, job, o, raw);
        const { spec, report } = validateSpec(a.next, opts);
        const res = opResult(spec, report, o, a, raw);
        if (o.kind === 'layout') { job.program = a.program; ops.push(...planRest(spec, a.program, job.settings?.target)); }
        Object.assign(o, { status: 'done', finished_at: now(), seconds: Math.round(aiSec * 10) / 10, in_chars: prompt.length, out_chars: out, chars_per_s: Math.round(out / aiSec), validate_ms: Date.now() - tv, ...res });
        Object.assign(m, { ai_calls: m.ai_calls + 1, ai_seconds: m.ai_seconds + aiSec, in_chars: m.in_chars + prompt.length, out_chars: m.out_chars + out });
        report.substitutions = ops.flatMap((x) => x.substitutions || []).slice(0, 40);
        report.ai = { model: job.model, seconds: Math.round(m.ai_seconds), calls: m.ai_calls };
        report.construction = summary(job);
        stage = await Stages.update(stage.id, { spec, report, name: spec.name, description: spec.summary, prompt_summary: short(spec.summary, 300) });
      }
    } catch (err) {
      Object.assign(o, { status: 'failed', finished_at: now(), seconds: Math.round((Date.now() - t0) / 100) / 10, error: short(String(err?.message || err), 300) });
      if (o.kind !== 'validate') Object.assign(m, { ai_calls: m.ai_calls + 1, ai_seconds: m.ai_seconds + o.seconds });
      // A timed-out batch is split once into two smaller batches (new keys); nothing already built is touched.
      if ((o.kind === 'rows' || o.kind === 'surfaces') && o.key.length <= 4 && o.seconds >= 100) {
        const parts = splitOp(o, 2, `timed out after ${o.seconds} s`);
        ops.splice(ops.indexOf(o), 1, { ...o, status: 'split', replaced_by: parts.map((p) => p.key), requested: 0, constructed: 0 }, ...parts);
      } else { job.status = 'failed'; job.error = `${o.label}: ${o.error}`; }
    }
    const saved = await Jobs.update(job.id, { ops, status: job.status, program: job.program, metrics: m, current: o.key, error: job.status === 'failed' ? job.error : '' });
    return Response.json({ job: saved, stage, op: o.key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}