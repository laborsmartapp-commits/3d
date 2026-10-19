import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Undo2 } from 'lucide-react';
import ReportView from './ReportView';

// While a refinement is previewed in 3D: commit it as a new version, or discard and go back unchanged.
export default function PreviewCommit({ rec, api }) {
  const nav = useNavigate(), pv = rec.preview;
  const commit = async () => {
    const d = await api.run('Committing refinement', { action: 'commit', parent_id: rec.id, spec: pv.spec, report: pv.report, summary: pv.summary, instruction: pv.instruction });
    if (d?.stage) { sessionStorage.removeItem(`stagePreview:${rec.id}`); nav(`/stage/${d.stage.id}`); }
  };
  const discard = () => { sessionStorage.removeItem(`stagePreview:${rec.id}`); nav(`/stage/${rec.id}`); };
  return (
    <div className="space-y-3">
      <p className="text-xs rounded-lg bg-ember/15 border border-ember/30 p-2">Previewing: “{pv.instruction}”. Nothing is saved until you commit.</p>
      <p className="text-xs">{pv.summary}</p>
      <ReportView report={pv.report} spec={pv.spec} />
      <div className="grid grid-cols-2 gap-2">
        <button onClick={commit} disabled={api.busy} className="rounded-lg bg-primary text-primary-foreground py-2 text-xs font-semibold flex items-center justify-center gap-1.5"><Check className="w-3.5 h-3.5" />Commit version</button>
        <button onClick={discard} className="rounded-lg border border-white/10 py-2 text-xs flex items-center justify-center gap-1.5"><Undo2 className="w-3.5 h-3.5" />Discard</button>
      </div>
    </div>
  );
}