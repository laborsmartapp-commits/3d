import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STAGES } from '@/game/stages/registry';

const tone = (s) => (s === 'pass' ? 'text-primary' : s === 'fail' ? 'text-destructive' : 'text-ember');

export default function AdminDiagnostics() {
  const [items, setItems] = useState(null), [open, setOpen] = useState(null), [failed, setFailed] = useState(null);
  useEffect(() => {
    base44.entities.DiagnosticSession.filter({}, { sort: '-created_date', limit: 50 }).then((r) => setItems(r.items));
    Promise.all([base44.entities.RenderJob.filter({ status: 'failed' }, { sort: '-created_date', limit: 10, fields: ['error', 'created_date'] }), base44.entities.Asset.filter({ import_status: 'failed' }, { limit: 10, fields: ['name', 'import_error', 'category'] })])
      .then(([j, a]) => setFailed({ jobs: j.items, assets: a.items }));
  }, []);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">{Object.values(STAGES).map((s) => <Link key={s.id} to={`${s.path}?sceneDiag=1`} className="rounded-xl bg-primary/15 text-primary px-3 py-2 text-xs font-semibold">Launch diagnostics in {s.name}</Link>)}</div>
      {failed && <div className="text-xs space-y-1">
        <p className="text-quiet">Recent render failures</p>{failed.jobs.map((j) => <Link key={j.id} to={`/renders?job=${j.id}`} className="block text-destructive truncate">{format(new Date(j.created_date), 'MMM d HH:mm')} · {j.error}</Link>)}
        <p className="text-quiet pt-2">Failed asset imports</p>{failed.assets.length ? failed.assets.map((a) => <Link key={a.id} to={`/assets?cat=${a.category}&id=${a.id}`} className="block text-destructive">{a.name}: {a.import_error}</Link>) : <p>None</p>}
      </div>}
      <h3 className="font-heading">Diagnostic sessions</h3>
      {!items ? <Loader2 className="w-5 h-5 animate-spin" /> : !items.length ? <p className="text-sm text-muted-foreground">No diagnostic sessions saved yet.</p> : items.map((d) => {
        const sum = Object.entries(d.summary || {}), fails = sum.filter(([, v]) => v === 'fail').length;
        return (
          <div key={d.id} className="glass rounded-2xl p-4">
            <button onClick={() => setOpen(open === d.id ? null : d.id)} className="w-full text-left flex flex-wrap justify-between gap-2 text-sm">
              <span>{format(new Date(d.created_date), 'MMM d, yyyy HH:mm')} · build {d.build} · {d.admin_email}</span><span className={fails ? 'text-destructive' : 'text-primary'}>{sum.length} tests · {fails} failed</span>
            </button>
            {open === d.id && <div className="mt-3 text-xs space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1">{sum.map(([k, v]) => <span key={k}><span className={tone(v)}>{v}</span> · {k}</span>)}</div>
              <details><summary className="cursor-pointer text-quiet">Full report</summary><pre className="whitespace-pre-wrap bg-black/30 rounded-lg p-2 max-h-80 overflow-auto">{JSON.stringify(d.report, null, 2)}</pre></details>
            </div>}
          </div>
        );
      })}
    </div>
  );
}