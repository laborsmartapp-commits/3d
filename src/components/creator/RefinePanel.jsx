import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Eye, Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import ChoiceRow from './ChoiceRow';
import ReportView from './ReportView';
import { QUALITY, MODEL_LABEL } from './options';

function gone(a, b) {
  const keep = new Set(); for (const k of Object.keys(b)) if (Array.isArray(b[k])) b[k].forEach((o) => o?.id && keep.add(o.id));
  const out = []; for (const k of Object.keys(a)) if (Array.isArray(a[k])) a[k].forEach((o) => o?.id && !keep.has(o.id) && out.push(`${o.type || k} (${o.id})`));
  return out;
}

// AI refinement as a targeted patch, previewed (in 3D if wanted) before it becomes a new version.
export default function RefinePanel({ rec, api, objects, commit }) {
  const [text, setText] = useState(''), [quality, setQuality] = useState('standard'), [pv, setPv] = useState(null), nav = useNavigate();
  const ask = async () => {
    const d = await api.run('Refining stage', { action: 'refine', parent_id: rec.id, instruction: text, quality, current_objects: objects() }, MODEL_LABEL[quality]);
    if (d?.preview) setPv(d.preview);
  };
  const removed = pv ? gone(rec.spec, pv.spec) : [];
  const view3d = () => { sessionStorage.setItem(`stagePreview:${rec.id}`, JSON.stringify(pv)); nav(`/stage/${rec.id}?preview=1`); };
  const ch = pv?.report?.ai?.changes || {};
  return (
    <div className="space-y-2">
      <Textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 500))} rows={2} placeholder="e.g. Add a grand piano beside the window" className="text-xs" />
      <ChoiceRow label="AI model" options={QUALITY} value={quality} onChange={setQuality} />
      <button onClick={ask} disabled={api.busy || !text.trim()} className="w-full rounded-lg bg-primary text-primary-foreground py-2 text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"><Sparkles className="w-3.5 h-3.5" />Preview Refinement</button>
      {pv && (
        <div className="rounded-xl border border-primary/30 p-2 space-y-2">
          <p className="text-xs"><span className="font-semibold">Proposed:</span> {pv.summary}</p>
          <p className="text-[11px] text-quiet">{ch.added || 0} added · {ch.updated || 0} changed · {ch.removed || 0} removed. Everything else stays as it is.</p>
          {removed.length > 0 && <p className="text-[11px] text-destructive">Destructive: removes {removed.join(', ')}</p>}
          <ReportView report={pv.report} spec={pv.spec} />
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={view3d} className="rounded-md bg-white/10 py-1.5 text-[11px] flex items-center justify-center gap-1"><Eye className="w-3 h-3" />3D preview</button>
            <button onClick={() => commit(pv)} disabled={api.busy} className="rounded-md bg-primary text-primary-foreground py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1"><Check className="w-3 h-3" />Commit</button>
            <button onClick={() => setPv(null)} className="rounded-md border border-white/10 py-1.5 text-[11px] flex items-center justify-center gap-1"><X className="w-3 h-3" />Discard</button>
          </div>
        </div>
      )}
    </div>
  );
}