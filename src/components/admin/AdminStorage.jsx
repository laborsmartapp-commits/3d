import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import useAdminApi, { adminCall } from '@/hooks/useAdminApi';
import { fmtSize } from '@/lib/assets';

export default function AdminStorage() {
  const { data, error, load } = useAdminApi('storage');
  const [sel, setSel] = useState([]), [msg, setMsg] = useState(''), [verify, setVerify] = useState({});
  if (error) return <p className="text-destructive text-sm">{error}</p>;
  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (!data.bucket) return <p className="text-sm text-muted-foreground">No cloud masters stored yet.</p>;
  const total = data.objects.reduce((s, o) => s + o.size, 0), orphans = data.objects.filter((o) => o.orphan);
  const cleanup = async () => {
    if (!window.confirm(`Permanently delete these ${sel.length} files from ${data.bucket}?\n\n${sel.join('\n')}`)) return;
    const r = await adminCall('cleanup', { keys: sel }); setMsg(`Deleted ${r.deleted.length} file(s)`); setSel([]); load();
  };
  const check = async (o) => { const r = await adminCall('verify', { job_id: o.job.id }); setVerify({ ...verify, [o.key]: r.exists ? `OK · ${fmtSize(r.size)}${r.expected && r.expected !== r.size ? ' (size mismatch!)' : ''}` : 'MISSING' }); };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Private bucket <span className="font-mono">{data.bucket}</span> · {data.objects.length} files · {fmtSize(total)} · {orphans.length} orphaned. Downloads use signed links that expire after 1 hour.</p>
      {!!data.missing.length && <p className="text-xs text-destructive">Render jobs pointing to missing files: {data.missing.join(', ')}</p>}
      {msg && <p className="text-xs text-primary">{msg}</p>}
      <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-xs text-quiet text-left"><tr><th /><th className="py-2">File</th><th>Kind</th><th>Size</th><th>Uploaded</th><th>Render job</th><th /></tr></thead>
        <tbody>{data.objects.map((o) => (
          <tr key={o.key} className="border-t border-border">
            <td>{o.orphan && <input type="checkbox" checked={sel.includes(o.key)} onChange={(e) => setSel(e.target.checked ? [...sel, o.key] : sel.filter((k) => k !== o.key))} aria-label="Select orphan" />}</td>
            <td className="py-2 font-mono text-xs break-all">{o.key}</td><td className="text-xs">{o.job ? 'Cloud master' : o.key.includes('/smoke/') ? 'Smoke test' : 'Orphaned'}</td>
            <td>{fmtSize(o.size)}</td><td>{format(new Date(o.modified), 'MMM d HH:mm')}</td>
            <td>{o.job ? <Link to={`/renders?job=${o.job.id}`} className="text-primary text-xs">{o.job.id}</Link> : '—'}</td>
            <td className="text-xs">{o.job && (verify[o.key] || <button className="text-primary" onClick={() => check(o)}>Verify</button>)}</td>
          </tr>
        ))}</tbody>
      </table></div>
      <button disabled={!sel.length} onClick={cleanup} className="rounded-xl bg-destructive px-4 py-2 text-sm disabled:opacity-40">Delete {sel.length} selected orphan(s)</button>
      <p className="text-xs text-quiet">Only files no render job references can be selected. The server checks this again before deleting anything. Preview videos and library assets are kept in the app's private file storage, not this bucket.</p>
    </div>
  );
}