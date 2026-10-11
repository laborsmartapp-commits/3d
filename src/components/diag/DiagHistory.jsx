import React, { useEffect, useState } from 'react';
import { Trash2, Copy, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { reportText } from '@/game/diag/report';
import { STATUS_CLS } from './TestRow';

const DS = () => base44.entities.DiagnosticSession;
const IDS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

// Saved sessions side by side, so results can be compared across builds.
export default function DiagHistory() {
  const [rows, setRows] = useState(null), [open, setOpen] = useState(null);
  const load = () => DS().filter({}, { sort: '-created_date', limit: 50, fields: ['id', 'build', 'admin_email', 'started_at', 'summary'] }).then((p) => setRows(p.items));
  useEffect(() => { load(); }, []);
  const del = async (id) => { await DS().delete(id); load(); };
  const purgeOld = async () => {
    const cutoff = new Date(Date.now() - 30 * 864e5).toISOString();
    const old = (await DS().filter({ created_date: { $lt: cutoff } }, { limit: 100, fields: ['id'] })).items;
    for (const x of old) await DS().delete(x.id);
    load();
  };
  const copy = async (id) => { const s = await DS().get(id); await navigator.clipboard.writeText(reportText(s.report)); setOpen(id); };
  if (!rows) return <Loader2 className="w-4 h-4 animate-spin mx-auto my-6" />;
  return (
    <div className="space-y-2">
      <p className="text-muted-foreground">Saved sessions (newest 50 kept). Only diagnostic reports are deleted here, never scenes.</p>
      {!rows.length && <p className="text-center py-6 text-muted-foreground">No saved sessions yet. Use the save button in Tests.</p>}
      {rows.map((s) => (
        <div key={s.id} className="rounded-lg bg-white/5 p-2 space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="flex-1">{new Date(s.started_at).toLocaleString()}<span className="block text-muted-foreground text-[10px]">{s.build} · {s.admin_email}</span></span>
            <button onClick={() => copy(s.id)} title="Copy report" className="rounded p-1 bg-white/10 hover:bg-white/20"><Copy className="w-3 h-3" /></button>
            <button onClick={() => del(s.id)} title="Delete report" className="rounded p-1 bg-destructive/20 text-destructive"><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="flex flex-wrap gap-0.5">{IDS.map((k) => <span key={k} title={s.summary?.[k]} className={`rounded px-1 text-[10px] font-bold ${STATUS_CLS[s.summary?.[k] || 'NOT TESTED']}`}>{k}</span>)}</div>
          {open === s.id && <p className="text-primary text-[10px]">Report copied to clipboard.</p>}
        </div>
      ))}
      {!!rows.length && <button onClick={purgeOld} className="w-full rounded-md py-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground">Delete reports older than 30 days</button>}
    </div>
  );
}