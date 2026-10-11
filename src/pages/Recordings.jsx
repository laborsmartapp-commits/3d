import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Search, Play } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STAGES, stageInfo } from '@/game/stages/registry';
import PageHeader from '@/components/shell/PageHeader';
import StatusBadge from '@/components/shell/StatusBadge';

export default function Recordings() {
  const [stage, setStage] = useState('all'), [q, setQ] = useState(''), [data, setData] = useState(null);
  useEffect(() => {
    const query = { ...(stage !== 'all' && { world: stage }), ...(q && { $or: [{ name: { $regex: q, $options: 'i' } }, { scene_name: { $regex: q, $options: 'i' } }] }) };
    const t = setTimeout(async () => {
      const takes = (await base44.entities.SceneTake.filter(query, { sort: '-created_date', limit: 50 })).items;
      const jobs = takes.length ? (await base44.entities.RenderJob.filter({ take_id: { $in: takes.map((x) => x.id) } }, { sort: '-created_date', limit: 200, fields: ['take_id', 'status'] })).items : [];
      setData({ takes, jobs });
    }, 250);
    return () => clearTimeout(t);
  }, [stage, q]);
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Performance Library" title="Recorded Scenes" />
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-quiet" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search takes or scenes" className="bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-sm" /></div>
        {[['all', 'All Stages'], ...Object.values(STAGES).map((s) => [s.id, s.name])].map(([k, l]) => (
          <button key={k} onClick={() => setStage(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${stage === k ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>
      {!data && <Loader2 className="w-5 h-5 animate-spin" />}
      {data && !data.takes.length && <p className="text-sm text-muted-foreground">No recordings match.</p>}
      <div className="space-y-3">
        {data?.takes.map((t) => {
          const job = data.jobs.find((j) => j.take_id === t.id), s = stageInfo(t.world);
          return (
            <div key={t.id} className="glass rounded-2xl p-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{t.name || `Take ${String(t.take_number).padStart(2, '0')}`}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.scene_name || 'Untitled Scene'} · {s.name} · {(t.duration || 0).toFixed(1)}s · {(t.actors || []).length} actor(s) · {t.camera_name || 'Camera'} · {format(new Date(t.created_date), 'MMM d, yyyy')}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={t.status} />
                {t.preview_status === 'ready' && <span className="text-[11px] text-primary">Preview ready</span>}
                {job && <StatusBadge status={job.status} />}
                <Link to={s.path} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs bg-primary text-primary-foreground"><Play className="w-3 h-3" />Open in Stage</Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}