import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const field = 'bg-card border border-border rounded-xl px-3 py-2 text-sm';

export default function AdminLogs() {
  const [f, setF] = useState({ user: '', action: '', type: '', from: '' }), [items, setItems] = useState(null), [open, setOpen] = useState(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const q = { ...(f.user && { actor_email: { $regex: f.user, $options: 'i' } }), ...(f.action && { action: { $regex: f.action, $options: 'i' } }), ...(f.type && { target_type: f.type }), ...(f.from && { created_date: { $gte: f.from } }) };
      setItems((await base44.entities.ActivityLog.filter(q, { sort: '-created_date', limit: 100 })).items);
    }, 250);
    return () => clearTimeout(t);
  }, [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input placeholder="User email" value={f.user} onChange={set('user')} className={field} /><input placeholder="Action" value={f.action} onChange={set('action')} className={field} />
        <select value={f.type} onChange={set('type')} className={field}><option value="">All entities</option>{['User', 'Production', 'Asset', 'RenderJob', 'SceneTake', 'Storage', 'AppSettings'].map((x) => <option key={x}>{x}</option>)}</select>
        <input type="date" value={f.from} onChange={set('from')} className={field} aria-label="From date" />
      </div>
      {!items ? <Loader2 className="w-5 h-5 animate-spin" /> : !items.length ? <p className="text-sm text-muted-foreground">No activity recorded yet.</p> : (
        <table className="w-full text-sm"><thead className="text-xs text-quiet text-left"><tr><th className="py-2">Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Result</th></tr></thead>
          <tbody>{items.map((l) => (
            <React.Fragment key={l.id}>
              <tr className="border-t border-border cursor-pointer hover:bg-white/5" onClick={() => setOpen(open === l.id ? null : l.id)}>
                <td className="py-2">{format(new Date(l.created_date), 'MMM d HH:mm:ss')}</td><td>{l.actor_email}</td><td className="font-mono text-xs">{l.action}</td><td className="text-xs">{l.target_type} {l.target_id}</td><td className={l.result === 'ok' ? 'text-primary' : 'text-destructive'}>{l.result}</td>
              </tr>
              {open === l.id && <tr><td colSpan={5}><pre className="text-xs bg-black/30 rounded-lg p-2 whitespace-pre-wrap">{JSON.stringify(l.meta, null, 2)}</pre></td></tr>}
            </React.Fragment>
          ))}</tbody></table>
      )}
    </div>
  );
}