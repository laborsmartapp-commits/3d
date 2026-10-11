import { secrets } from 'base44:runtime';
import { AwsClient } from 'npm:aws4fetch@1.0.20';

// Private S3-compatible (Cloudflare R2) access. Server-side only; credentials never leave the function.
function client() {
  const endpoint = secrets.get('STORAGE_ENDPOINT'), id = secrets.get('STORAGE_ACCESS_KEY_ID'), key = secrets.get('STORAGE_SECRET_ACCESS_KEY');
  if (!endpoint || !id || !key) throw new Error('Render storage secrets are not set');
  return { base: endpoint.replace(/\/$/, ''), aws: new AwsClient({ accessKeyId: id, secretAccessKey: key, service: 's3', region: secrets.get('STORAGE_REGION') || 'auto' }) };
}
const enc = (k) => k.split('/').map(encodeURIComponent).join('/');

export async function listObjects(bucket, prefix = '', max = 1000) {
  const { base, aws } = client(), out = [];
  let token = '';
  do {
    const u = new URL(`${base}/${bucket}`);
    u.searchParams.set('list-type', '2'); u.searchParams.set('prefix', prefix); u.searchParams.set('max-keys', '1000');
    if (token) u.searchParams.set('continuation-token', token);
    const r = await aws.fetch(u.toString(), { signal: AbortSignal.timeout(15000) });
    const xml = await r.text();
    if (!r.ok) throw new Error(`Storage list failed (${r.status})`);
    for (const m of xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)) {
      const g = (t) => (new RegExp(`<${t}>([^<]*)</${t}>`).exec(m[1]) || [])[1];
      out.push({ key: g('Key'), size: Number(g('Size')), modified: g('LastModified') });
    }
    token = (/<NextContinuationToken>([^<]*)</.exec(xml) || [])[1] || '';
  } while (token && out.length < max);
  return out;
}

export async function headObject(bucket, key) {
  const { base, aws } = client();
  const r = await aws.fetch(`${base}/${bucket}/${enc(key)}`, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
  return { exists: r.ok, size: Number(r.headers.get('content-length') || 0) };
}

export async function deleteObject(bucket, key) {
  const { base, aws } = client();
  const r = await aws.fetch(`${base}/${bucket}/${enc(key)}`, { method: 'DELETE', signal: AbortSignal.timeout(10000) });
  if (!r.ok && r.status !== 204) throw new Error(`Delete failed (${r.status})`);
}

export const parseUri = (uri) => { const m = /^s3:\/\/([^/]+)\/(.+)$/.exec(uri || ''); return m ? { bucket: m[1], key: m[2] } : null; };