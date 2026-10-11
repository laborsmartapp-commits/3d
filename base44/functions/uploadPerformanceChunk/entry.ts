import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Secure, idempotent chunk upload. Chunks can only be written through here (entity create/update is
// admin-only), so a user can never inject samples into a take they do not own.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { take_id, index, start_t, end_t, samples, events } = await req.json();
    if (typeof take_id !== 'string' || !/^[a-zA-Z0-9]{8,40}$/.test(take_id)) return Response.json({ error: 'Invalid take id' }, { status: 400 });
    if (!Number.isInteger(index) || index < 0 || index > 100000) return Response.json({ error: 'Invalid chunk index' }, { status: 400 });
    if (!Array.isArray(samples) || !samples.length || samples.length > 400) return Response.json({ error: 'Invalid samples' }, { status: 400 });
    if (!(start_t >= 0 && end_t >= start_t && end_t < 7200)) return Response.json({ error: 'Invalid timestamps' }, { status: 400 });
    for (let i = 0; i < samples.length; i++) {
      const t = samples[i]?.t;
      if (typeof t !== 'number' || t < start_t - 1e-3 || t > end_t + 1e-3 || (i && t < samples[i - 1].t)) return Response.json({ error: 'Sample timestamps out of order' }, { status: 400 });
    }
    const svc = base44.asServiceRole.entities;
    const take = (await svc.SceneTake.filter({ id: take_id }))[0];
    if (!take) return Response.json({ error: 'Take not found' }, { status: 404 });
    console.log('owner check', JSON.stringify({ keys: Object.keys(take), cb: take.created_by_id, u: user.id }));
    if (take.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (take.source_take_id) return Response.json({ error: 'Duplicated takes share their source performance' }, { status: 409 });
    const scene = (await svc.StudioScene.filter({ id: take.scene_id }))[0];
    if (!scene || scene.created_by_id !== user.id) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const chunk_key = `${take_id}:${index}`;
    // chunk_key embeds the (already ownership-checked) take id, so an overwrite can only hit this take.
    const data = { take_id, owner_id: user.id, index, chunk_key, start_t, end_t, samples, events: Array.isArray(events) ? events.slice(0, 2000) : [] };
    const res = await svc.PerformanceChunk.upsert([data], { key: 'chunk_key' });
    return Response.json({ ok: true, created: res.created, updated: res.updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}