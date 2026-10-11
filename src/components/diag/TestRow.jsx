import React, { useState } from 'react';
import { Play, Loader2, ChevronDown } from 'lucide-react';

export const STATUS_CLS = { 'NOT TESTED': 'bg-white/10 text-muted-foreground', RUNNING: 'bg-chart-4/20 text-chart-4', PASS: 'bg-primary/20 text-primary', FAIL: 'bg-destructive/20 text-destructive', INCONCLUSIVE: 'bg-ember/20 text-ember' };

export default function TestRow({ engine, test, children }) {
  const D = engine.diag, r = D.results[test.id] || { status: 'NOT TESTED' }, [open, setOpen] = useState(false);
  const running = D.running === test.id;
  return (
    <div className="rounded-lg bg-white/5 p-2">
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold w-4">{test.id}</span>
        <button onClick={() => setOpen(!open)} className="flex-1 text-left font-semibold flex items-center gap-1">{test.title}<ChevronDown className={`w-3 h-3 transition ${open ? 'rotate-180' : ''}`} /></button>
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${STATUS_CLS[running ? 'RUNNING' : r.status]}`}>{running ? 'RUNNING' : r.status}</span>
        {test.run && <button onClick={() => D.run(test.id)} disabled={!!D.running} className="rounded-full p-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-40">{running ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}</button>}
      </div>
      {open && (
        <div className="mt-1.5 space-y-1 text-muted-foreground">
          <p>{test.desc}</p>
          {r.note && <p className="text-foreground">{r.note}</p>}
          {r.m && <pre className="font-mono text-[10px] whitespace-pre-wrap break-all bg-black/30 rounded p-1.5">{JSON.stringify(r.m, null, 1)}</pre>}
          {r.at && <p>Last run {new Date(r.at).toLocaleString()}</p>}
          {children}
        </div>
      )}
    </div>
  );
}