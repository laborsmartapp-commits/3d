import React, { useState } from 'react';
import { Play, Download, Pencil, Copy, RefreshCw, Trash2, Info, LifeBuoy, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { queueRender, retryRender, videoUrl } from '@/game/studio/RecordingJobManager';
import { cloudLabel } from '@/game/studio/quality';

const T = () => base44.entities.SceneTake;

export default function TakeActions({ engine, st, take, jobs, interrupted, reload, onDetails }) {
  const S = engine.studio, [busy, setBusy] = useState(null);
  const done = jobs.find((j) => j.status === 'completed' && j.video_uri), failed = jobs[0]?.status === 'failed' ? jobs[0] : null;
  const run = (k, fn) => async () => { setBusy(k); await fn(); setBusy(null); reload(); };
  const actions = [
    ['play', Play, 'Play in world', !interrupted && st.status === 'idle', () => S.playTake(take)],
    ['watch', Download, 'Download video', !!done, async () => window.open(await videoUrl(done), '_blank')],
    ['rename', Pencil, 'Rename', true, async () => { const n = window.prompt('Take name', take.name); if (n) await T().update(take.id, { name: n }); }],
    ['dup', Copy, 'Duplicate', !interrupted, async () => {
      const { id, created_date, updated_date, created_by_id, ...rest } = take;
      await T().create({ ...rest, name: `${take.name} (copy)`, source_take_id: take.source_take_id || take.id });
    }],
    ['rerender', RefreshCw, `Re-render ${cloudLabel(st.cloud)}`, !interrupted, () => queueRender(take, st.cloud)],
    ['retry', RefreshCw, 'Retry render', !!failed, () => retryRender(failed)],
    ['recover', LifeBuoy, 'Recover performance', interrupted, async () => {
      const ch = (await base44.entities.PerformanceChunk.filter({ take_id: take.id }, { sort: '-index', limit: 1, fields: ['end_t', 'index'] })).items[0];
      await T().update(take.id, { status: 'captured', duration: ch?.end_t || 0, chunk_count: ch ? ch.index + 1 : 0 });
    }],
    ['delete', Trash2, 'Delete', st.take?.id !== take.id, async () => {
      if (!window.confirm(`Delete "${take.name}"?`)) return;
      const shared = take.source_take_id || (await T().count({ source_take_id: take.id }));
      if (!shared) await base44.entities.PerformanceChunk.deleteMany({ take_id: take.id });
      await base44.entities.RenderJob.deleteMany({ take_id: take.id });
      await T().delete(take.id);
    }],
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.filter((a) => a[3]).map(([k, Icon, label, , fn]) => (
        <button key={k} disabled={!!busy} onClick={k === 'play' ? fn : run(k, fn)} className={`rounded-full px-2.5 py-1 text-[11px] flex items-center gap-1 ${k === 'delete' ? 'bg-destructive/20 text-destructive' : 'bg-white/10 hover:bg-white/20'}`}>
          {busy === k ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}{label}
        </button>
      ))}
      <button onClick={onDetails} className="rounded-full px-2.5 py-1 text-[11px] flex items-center gap-1 bg-white/10 hover:bg-white/20"><Info className="w-3 h-3" />Details</button>
    </div>
  );
}