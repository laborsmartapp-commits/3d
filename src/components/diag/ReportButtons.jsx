import React, { useState } from 'react';
import { Copy, Download, Save, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { buildReport, reportText, BUILD } from '@/game/diag/report';

const KEEP = 50;

export default function ReportButtons({ engine }) {
  const [done, setDone] = useState(''), [saving, setSaving] = useState(false);
  const flash = (k) => { setDone(k); setTimeout(() => setDone(''), 2000); };
  const copy = async () => { await navigator.clipboard.writeText(reportText(buildReport(engine))); flash('copy'); };
  const download = () => {
    const r = buildReport(engine), a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(r, null, 2)], { type: 'application/json' }));
    a.download = `krush-diagnostics-${r.generated_at.replace(/[:.]/g, '-')}.json`; a.click(); URL.revokeObjectURL(a.href);
  };
  const save = async () => {
    setSaving(true);
    const r = buildReport(engine), DS = base44.entities.DiagnosticSession;
    await DS.create({ admin_email: engine.adminEmail, build: BUILD, started_at: r.generated_at, summary: Object.fromEntries(Object.entries(r.tests).map(([k, t]) => [k, t.status])), report: r });
    const extra = (await DS.filter({}, { sort: '-created_date', limit: 100, fields: ['id'] })).items.slice(KEEP);
    for (const x of extra) await DS.delete(x.id); // retention: keep the newest 50 sessions
    setSaving(false); flash('save');
  };
  const btn = 'flex-1 rounded-md py-1.5 font-semibold flex items-center justify-center gap-1';
  return (
    <div className="flex gap-1.5">
      <button onClick={copy} className={`${btn} bg-primary text-primary-foreground`}>{done === 'copy' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}Copy Diagnostic Report</button>
      <button onClick={download} title="Download Diagnostic Report (JSON)" className={`${btn} bg-white/10 hover:bg-white/20 flex-none px-2.5`}><Download className="w-3.5 h-3.5" /></button>
      <button onClick={save} disabled={saving} title="Save session to history" className={`${btn} bg-white/10 hover:bg-white/20 flex-none px-2.5`}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : done === 'save' ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}</button>
    </div>
  );
}