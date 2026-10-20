import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { STYLES } from '../../shared/stageCapabilities.ts';
import { validateSpec } from '../../shared/stageValidate.ts';
import { MODELS, short } from '../../shared/stagePrompt.ts';
import { initialOps, planRest, buildPrompt, schemaFor, applyOp, opResult, splitOp, pickBatch } from '../../shared/stagePipeline.ts';
import { finalChecks } from '../../shared/stageNav.ts';
import { repairSpec } from '../../shared/stageRepair.ts';
import { CATALOG_SET } from '../../shared/stageCapabilities.ts';

// Resumable progressive stage construction. "start" saves the brief as a job (no AI call); every "step" runs one
// small operation, or up to three independent ones side by side (each its own AI call, < 120 s), validates the
// result, saves the stage once, and records each operation. A failed operation is retried alone; completed
// operations are never re-run.
const LEASE_MS = 170e3, MAX_JOBS_PER_HOUR = 6;
const now = () => new Date().toISOString();

function summary(job) {
  const ops = job.ops.map((o) => ({ key: o.key, phase: o.phase, label: o.label, status: o.status, requested: o.requested, constructed: o.constructed }));
  const live = ops.filter((o) => o.status !== 'split');
  return { status: job.status, done: live.filter((o) => o.status === 'done').length, total: live.length, ops: live };
}
const mineRe = (key) => new RegExp(`(^|[^a-z0-9])${key}\\.`);

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
      const { spec, report } = validateSpec({ name: short(settings.name, 80) || 'Untitled Stage', category: settings.category }, { style: settings.style, target: settings.target, environment: settings.environment, category: settings.category, brief: prompt });
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
    // Restore: furnishings an earlier operation could not build (e.g. a catalog piece listed under vegetation)
    // are re-requested by small new operations for the same rooms, then the stage is re-validated. Nothing
    // that was already built is regenerated.
    if (body.action === 'restore') {
      if (job.status === 'running') return Response.json({ error: 'Construction is still running' }, { status: 409 });
      const re = /^unsupported nature "([a-z_]+)" \(([^)]+)\)/, add = [];
      for (const x of job.ops) {
        if (x.status !== 'done' || !x.zones || x.restored) continue;
        const types = (x.not_built || []).map((n) => n.match(re)).filter((mt) => mt && CATALOG_SET.has(mt[1])).map((mt) => mt[1]);
        if (!types.length) continue;
        const list = Object.entries(types.reduce((a, t) => ({ ...a, [t]: (a[t] || 0) + 1 }), {})).map(([t, n]) => `${n} x ${t}`).join(', ');
        x.restored = `${x.key}r`;
        add.push({ key: `${x.key}r`, phase: x.phase, label: `Restore · ${x.label.split('·')[1]?.trim() || x.label} · ${list}`, kind: 'rows', sections: ['furnishings'], caps: { furnishings: types.length }, zones: x.zones, status: 'pending', attempts: 0, independent: true, restore_of: x.key,
          theme: `ONLY these pieces, which an earlier pass could not build: ${list}. They are catalog furnishings (not vegetation): place them in open corners or beside the seating, clear of walking lanes, doors and existing pieces` });
      }
      const n = job.ops.filter((x) => x.kind === 'validate').length;
      add.push({ key: `e${n + 2}`, phase: 'final', label: 'Final validation (after repairs)', kind: 'validate', sections: [], caps: {}, status: 'pending', attempts: 0 });
      const saved = await Jobs.update(job.id, { ops: [...job.ops, ...add], status: 'running', error: '' });
      return Response.json({ job: saved, added: add.map((x) => x.key) });
    }
    if (body.action !== 'step') return Response.json({ error: 'Unknown action' }, { status: 400 });
    if (job.status === 'completed') return Response.json({ job });

    const ops = job.ops;
    const batch = pickBatch(ops), o = batch[0];
    if (!o) return Response.json({ job });
    if (o.status === 'running' && Date.now() - Date.parse(o.started_at) < LEASE_MS) return Response.json({ job, busy: true });
    if (o.status === 'failed' && !body.retry) return Response.json({ job, needs_retry: true });
    for (const x of batch) Object.assign(x, { status: 'running', started_at: now(), attempts: (x.attempts || 0) + 1, error: '' });
    await Jobs.update(job.id, { ops, status: 'running', current: batch.map((x) => x.key).join(','), error: '' });
    job.status = 'running'; job.error = '';

    let stage = await Stages.get(job.stage_id);
    const opts = { style: stage.spec.style, target: job.settings?.target, environment: stage.spec.environment, category: stage.category || job.settings?.category, brief: job.prompt };
    const m = job.metrics || { ai_calls: 0, ai_seconds: 0, in_chars: 0, out_chars: 0 }, t0 = Date.now();
    const fail = (x, err, sec) => {
      Object.assign(x, { status: 'failed', finished_at: now(), seconds: Math.round(sec * 10) / 10, error: short(String(err?.message || err), 300) });
      // A timed-out batch is split once into two smaller batches (new keys); nothing already built is touched.
      if ((x.kind === 'rows' || x.kind === 'surfaces') && x.key.length <= 4 && x.seconds >= 100) {
        const parts = splitOp(x, 2, `timed out after ${x.seconds} s`);
        ops.splice(ops.indexOf(x), 1, { ...x, status: 'split', replaced_by: parts.map((p) => p.key), requested: 0, constructed: 0 }, ...parts);
      } else { job.status = 'failed'; job.error = `${x.label}: ${x.error}`; }
    };

    if (o.kind === 'validate') {
      try {
        const { spec, report } = validateSpec(stage.spec, opts);
        const fix = repairSpec(spec);
        report.repairs = fix.notes; report.dropped = [...report.dropped, ...fix.dropped];
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
      } catch (err) { fail(o, err, (Date.now() - t0) / 1000); }
    } else {
      // Every operation's prompt sees the stage as it is now; operations in one batch touch different rooms/targets.
      const calls = await Promise.allSettled(batch.map(async (x) => {
        const prompt = buildPrompt(stage.spec, job, x), t = Date.now();
        try { return { x, prompt, raw: await base44.asServiceRole.integrations.Core.InvokeLLM({ prompt, response_json_schema: schemaFor(x), model: job.model }), sec: (Date.now() - t) / 1000 }; }
        catch (err) { throw { x, prompt, err, sec: (Date.now() - t) / 1000 }; }
      }));
      let next = stage.spec; const ok = [];
      for (const c of calls) {
        const r = c.status === 'fulfilled' ? c.value : c.reason;
        Object.assign(m, { ai_calls: m.ai_calls + 1, ai_seconds: m.ai_seconds + r.sec, in_chars: m.in_chars + r.prompt.length });
        if (c.status === 'rejected') { fail(r.x, r.err, r.sec); continue; }
        try { const a = applyOp(next, job, r.x, r.raw); next = a.next; ok.push({ ...r, a }); } catch (err) { fail(r.x, err, r.sec); }
      }
      if (ok.length) {
        const tv = Date.now(), { spec, report } = validateSpec(next, opts);
        for (const { x, a, raw, sec, prompt } of ok) {
          const out = JSON.stringify(raw).length; m.out_chars += out;
          if (x.kind === 'layout') { job.program = a.program; ops.push(...planRest(spec, a.program, job.settings?.target)); }
          const res = opResult(spec, report, x, a, raw);
          // Rows that all failed validation built nothing: retried instead of being counted as done.
          if (x.kind === 'rows' && res.requested && !res.constructed) { fail(x, `Nothing usable was built (${res.not_built.slice(0, 3).join('; ')}); it will be retried`, sec); continue; }
          Object.assign(x, { status: 'done', finished_at: now(), seconds: Math.round(sec * 10) / 10, in_chars: prompt.length, out_chars: out, chars_per_s: Math.round(out / sec), validate_ms: Date.now() - tv, parallel: batch.length, ...res });
        }
        // Anything the validator removes later (e.g. a stricter rule) is attributed to the operation that built it.
        for (const x of ops) if (x.status === 'done') { const add = report.dropped.filter((d) => mineRe(x.key).test(d) && !(x.not_built || []).includes(d)); if (add.length) x.not_built = [...(x.not_built || []), ...add].slice(0, 30); }
        report.substitutions = ops.flatMap((x) => x.substitutions || []).slice(0, 40);
        report.ai = { model: job.model, seconds: Math.round(m.ai_seconds), calls: m.ai_calls };
        report.construction = summary(job);
        stage = await Stages.update(stage.id, { spec, report, name: spec.name, description: spec.summary, prompt_summary: short(spec.summary, 300) });
      }
    }
    m.wall_seconds = (m.wall_seconds || 0) + (Date.now() - t0) / 1000;
    const saved = await Jobs.update(job.id, { ops, status: job.status, program: job.program, metrics: m, current: batch.map((x) => x.key).join(','), error: job.status === 'failed' ? job.error : '' });
    return Response.json({ job: saved, stage, op: o.key, ops: batch.map((x) => x.key) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}