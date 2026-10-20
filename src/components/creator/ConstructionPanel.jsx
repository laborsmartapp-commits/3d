import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hammer, Play, RotateCcw, Pause, ArrowRight } from 'lucide-react';
import OpRow from './OpRow';
import { construction, useConstruction, findOpenJob } from './construction';

const PHASES = [['architecture', 'Architecture'], ['furniture', 'Major furniture'], ['materials', 'Materials & textures'], ['decor', 'Decorative detailing'], ['final', 'Final validation']];

// Live progressive-construction status for the current (or most recent unfinished) generation job.
export default function ConstructionPanel({ jobId, here }) {
  const s = useConstruction(), nav = useNavigate(), j = s.job;
  useEffect(() => { (async () => { const id = jobId || (!construction.get().job && (await findOpenJob())); if (id) await construction.load(id); })(); }, [jobId]);
  if (!j) return null;
  const ops = j.ops.filter((o) => o.status !== 'split'), done = ops.filter((o) => o.status === 'done').length;
  const next = ops.find((o) => o.status !== 'done'), archDone = ops.filter((o) => o.phase === 'architecture').every((o) => o.status === 'done');
  const failed = j.status === 'failed', complete = j.status === 'completed', m = j.metrics || {};
  const Btn = ({ icon: Icon, children, primary, ...p }) => <button {...p} className={`flex-1 rounded-lg py-1.5 text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40 ${primary ? 'bg-primary text-primary-foreground' : 'bg-white/10 hover:bg-white/15'}`}><Icon className="w-3.5 h-3.5" />{children}</button>;
  return (
    <div className="mb-3 rounded-xl border border-primary/30 bg-primary/5 p-3 text-xs" data-testid="construction">
      <p className="font-semibold flex items-center gap-1.5"><Hammer className="w-3.5 h-3.5 text-primary" />{s.stage?.spec?.name || 'New stage'} · {complete ? 'construction complete' : `${done}/${ops.length} operations`}</p>
      <p className="text-quiet mt-0.5">{complete ? 'Every operation finished and the final checks ran.' : failed ? `Stopped: ${j.error}` : s.running ? `Working on: ${next?.label}` : 'Paused. Completed work is saved; resume to continue.'}</p>
      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${(done / ops.length) * 100}%` }} /></div>
      <div className="mt-2 space-y-2 max-h-[38vh] overflow-y-auto pr-1">
        {PHASES.map(([k, label]) => { const list = ops.filter((o) => o.phase === k); if (!list.length) return null; const n = list.filter((o) => o.status === 'done').length; return (
          <div key={k}><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">{label} · {n === list.length ? 'complete' : list.some((o) => o.status === 'failed') ? 'failed' : n ? 'in progress' : 'pending'} ({n}/{list.length})</p>
            <div className="space-y-1">{list.map((o) => <OpRow key={o.key} op={o} live={s.running && o === next} />)}</div></div>
        ); })}
      </div>
      <p className="text-quiet mt-2">{j.model} · {m.ai_calls || 0} AI calls · {Math.round(m.ai_seconds || 0)}s AI time. The AI service does not report token or credit usage per call.</p>
      {s.error && <p className="text-destructive mt-1">{s.error}</p>}
      <div className="flex gap-1.5 mt-2">
        {archDone && !here && <Btn icon={ArrowRight} primary onClick={() => nav(`/stage/${j.stage_id}`)}>Open stage</Btn>}
        {failed && !s.running && <Btn icon={RotateCcw} onClick={() => construction.resume(true)}>Retry failed operation</Btn>}
        {!failed && !complete && !s.running && <Btn icon={Play} onClick={() => construction.resume()}>Resume</Btn>}
        {s.running && <Btn icon={Pause} onClick={construction.pause}>Pause after this step</Btn>}
      </div>
    </div>
  );
}