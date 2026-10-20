import React, { useEffect } from 'react';
import { Hammer, RefreshCw, Play } from 'lucide-react';
import { construction, useConstruction } from './construction';

// On a stage that is still being constructed: live progress, and a one-click rebuild with the newest saved batches.
export default function ConstructionBanner({ rec, onRefresh }) {
  const s = useConstruction(), mine = s.job?.stage_id === rec.id;
  useEffect(() => { if (rec.status === 'building' && rec.job_id) construction.load(rec.job_id); }, [rec.id]);
  if (!mine && rec.status !== 'building') return null;
  const shown = rec.report?.construction, latest = mine && s.stage?.id === rec.id ? s.stage : null;
  const lc = latest?.report?.construction, newer = latest && latest.updated_date !== rec.updated_date && (lc?.done !== shown?.done || latest.status !== rec.status);
  const finished = mine && s.job?.status === 'completed', failed = mine && s.job?.status === 'failed';
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass rounded-full pl-3 pr-1.5 py-1 text-xs flex items-center gap-2" data-testid="construction-banner">
      <Hammer className="w-3.5 h-3.5 text-ember" />
      <span>{finished ? 'Construction complete' : `Under construction · ${lc?.done ?? shown?.done ?? 0}/${lc?.total ?? shown?.total ?? 0}`}{s.running && mine ? ' · building' : ''}</span>
      <span className="text-quiet">showing {shown?.done ?? 0}/{shown?.total ?? 0}</span>
      {newer && <button onClick={() => onRefresh(latest)} className="rounded-full bg-primary text-primary-foreground px-2.5 py-1 font-semibold flex items-center gap-1"><RefreshCw className="w-3 h-3" />Show latest</button>}
      {mine && !s.running && !finished && <button onClick={() => construction.resume(failed)} className="rounded-full bg-white/10 px-2.5 py-1 font-semibold flex items-center gap-1"><Play className="w-3 h-3" />{failed ? 'Retry' : 'Resume'}</button>}
    </div>
  );
}