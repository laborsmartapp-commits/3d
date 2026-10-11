import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { runpod } from '../../shared/render.ts';
import { listObjects, headObject, deleteObject, parseUri } from '../../shared/storage.ts';

const SAFE_META = (m) => JSON.parse(JSON.stringify(m || {}, (k, v) => (/token|key|secret|password/i.test(k) ? undefined : v)));

// Admin-only operations. Every action re-checks role server-side; secrets never leave this function.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const me = await base44.auth.me();
    if (!me) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (me.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const svc = base44.asServiceRole.entities;
    const body = await req.json();
    const log = (action, target_type, target_id, meta, result = 'ok') =>
      svc.ActivityLog.create({ actor_email: me.email, action, target_type, target_id: target_id || '', result, meta: SAFE_META(meta) });

    const knownVideos = async () => {
      const jobs = await svc.RenderJob.filter({ video_uri: { $exists: true } }, { limit: 1000, fields: ['video_uri', 'take_id', 'scene_id', 'created_by_id'] });
      return (jobs.items || jobs).filter((j) => j.video_uri);
    };
    const bucketOf = (jobs) => parseUri(jobs.find((j) => parseUri(j.video_uri))?.video_uri)?.bucket;

    switch (body.action) {
      case 'overview': {
        const [users, prods, prodsActive, scenes, assets, takes, renders] = await Promise.all([
          svc.User.list(), svc.Production.count({}), svc.Production.count({ status: 'in_production' }), svc.StudioScene.count({}),
          svc.Asset.count({}), svc.SceneTake.count({}), svc.RenderJob.aggregate({ groupBy: 'status', sum: ['file_size'] }),
        ]);
        const byStatus = Object.fromEntries(renders.rows.map((r) => [r.status, r]));
        const since = Date.now() - 30 * 864e5;
        return Response.json({
          users: users.length, active_users: users.filter((u) => new Date(u.updated_date || u.created_date).getTime() > since).length,
          productions: prods, productions_active: prodsActive, scenes, assets, takes,
          renders: Object.fromEntries(renders.rows.map((r) => [r.status, r.count])),
          render_bytes: renders.rows.reduce((s, r) => s + (r.sum_file_size || 0), 0), rendering: (byStatus.rendering?.count || 0) + (byStatus.encoding?.count || 0),
        });
      }
      case 'users': {
        const [users, per] = await Promise.all([svc.User.list(), svc.Production.aggregate({ groupBy: 'created_by_id' })]);
        const counts = Object.fromEntries(per.rows.map((r) => [r.created_by_id, r.count]));
        return Response.json({ me: me.id, users: users.map((u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_date: u.created_date, updated_date: u.updated_date, productions: counts[u.id] || 0 })) });
      }
      case 'setRole': {
        if (!['admin', 'user'].includes(body.role)) return Response.json({ error: 'Unknown role' }, { status: 400 });
        if (body.user_id === me.id) return Response.json({ error: 'You cannot change your own role' }, { status: 400 });
        await svc.User.update(body.user_id, { role: body.role });
        await log('user.role_changed', 'User', body.user_id, { role: body.role });
        return Response.json({ ok: true });
      }
      case 'runpod': {
        const ep = secrets.get('RUNPOD_ENDPOINT_ID') || '';
        let health = null, error = null;
        try { health = await runpod('/health'); } catch (e) { error = e.message; }
        return Response.json({ configured: !!(ep && secrets.get('RUNPOD_API_KEY')), endpoint: ep ? `${ep.slice(0, 4)}…${ep.slice(-4)}` : null, health, error });
      }
      case 'storage': {
        const jobs = await knownVideos(), bucket = bucketOf(jobs);
        if (!bucket) return Response.json({ bucket: null, objects: [] });
        const known = new Map(jobs.map((j) => [parseUri(j.video_uri)?.key, j]));
        const objects = (await listObjects(bucket)).map((o) => ({ ...o, job: known.get(o.key) || null, orphan: !known.has(o.key) && !o.key.startsWith('renders/smoke/') }));
        return Response.json({ bucket, objects, missing: jobs.filter((j) => !objects.some((o) => o.key === parseUri(j.video_uri)?.key)).map((j) => j.video_uri) });
      }
      case 'verify': {
        const job = (await svc.RenderJob.filter({ id: body.job_id }))[0], p = parseUri(job?.video_uri);
        if (!p) return Response.json({ error: 'Job has no stored master' }, { status: 404 });
        const h = await headObject(p.bucket, p.key);
        return Response.json({ ...h, expected: job.file_size || null });
      }
      case 'cleanup': {
        const jobs = await knownVideos(), bucket = bucketOf(jobs);
        const known = new Set(jobs.map((j) => parseUri(j.video_uri)?.key));
        const keys = (body.keys || []).filter((k) => typeof k === 'string' && !known.has(k)).slice(0, 100);
        for (const k of keys) await deleteObject(bucket, k);
        await log('storage.cleanup', 'Storage', bucket, { deleted: keys, refused: (body.keys || []).length - keys.length });
        return Response.json({ deleted: keys });
      }
      case 'costs': {
        const settings = (await svc.AppSettings.filter({ key: 'studio' }))[0];
        const rate = settings?.gpu_cost_per_hour ?? 0.69;
        const jobs = await svc.RenderJob.filter({ claimed_at: { $exists: true } }, { limit: 1000, fields: ['claimed_at', 'updated_date', 'status', 'created_by_id', 'scene_id'] });
        const list = (jobs.items || jobs).filter((j) => j.claimed_at).map((j) => ({ ...j, seconds: Math.max(0, (new Date(j.updated_date) - new Date(j.claimed_at)) / 1000) }));
        const sum = (key) => Object.values(list.reduce((m, j) => { const k = j[key] || 'unknown'; (m[k] ||= { id: k, jobs: 0, seconds: 0 }); m[k].jobs++; m[k].seconds += j.seconds; return m; }, {}));
        const seconds = list.reduce((s, j) => s + j.seconds, 0);
        return Response.json({ rate, estimated: true, seconds, cost: (seconds / 3600) * rate, jobs: list.length, byUser: sum('created_by_id'), byScene: sum('scene_id') });
      }
      case 'log': {
        await log(String(body.log_action || 'admin.action').slice(0, 60), body.target_type, body.target_id, body.meta);
        return Response.json({ ok: true });
      }
      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}