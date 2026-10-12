import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkAudioFile } from '../../shared/audioCheck.ts';
import { loadSettings } from '../../shared/roles.ts';

// Registers an uploaded private audio file in the library after verifying it on the server:
// signed-in uploader role, real audio bytes, real stored size against the studio upload limit.
const CREATORS = ['admin', 'director', 'animator', 'editor'];
const clean = (v, n = 120) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401 });
    if (!CREATORS.includes(user.role)) return Response.json({ error: 'Your role cannot add audio to the library' }, { status: 403 });
    const { file_uri, file_name, name, subcategory, folder } = await req.json();
    if (typeof file_uri !== 'string' || /^https?:/.test(file_uri) || file_uri.length > 500) return Response.json({ error: 'A private file upload is required' }, { status: 400 });
    const settings = await loadSettings(base44.asServiceRole.entities);
    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 120 });
    let info;
    try { info = await checkAudioFile(signed_url, (settings.max_upload_mb || 250) * 1048576); }
    catch (e) { return Response.json({ error: e.message }, { status: 422 }); }
    const fname = clean(file_name, 200) || `audio.${info.kind}`;
    // Created as the user (RLS applies; the uploader becomes the owner).
    const a = await base44.entities.Asset.create({
      name: clean(name) || fname.replace(/\.[^.]+$/, ''), category: 'audio', subcategory: clean(subcategory, 40), folder: clean(folder, 80),
      file_uri, file_name: fname, format: info.kind, size: info.size, version: 1, status: 'active', import_status: 'ok', tags: ['server-validated'],
    });
    await base44.entities.Asset.update(a.id, { root_id: a.id });
    return Response.json({ ...a, root_id: a.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}