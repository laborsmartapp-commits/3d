import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STAGES, stageInfo } from '@/game/stages/registry';
import PageHeader from '@/components/shell/PageHeader';
import StatusBadge from '@/components/shell/StatusBadge';
import RecordingActions from '@/components/recordings/RecordingActions';
import VideoDialog from '@/components/recordings/VideoDialog';

const chip = (on) => `rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`;

export default function Recordings() {
  const only = new URLSearchParams(window.location.search).get('take');
  const [stage, setStage] = useState('all'), [q, setQ] = useState(''), [actor, setActor] = useState(''), [from, setFrom] = useState('');
  const [data, setData] = useState(null), [video, setVideo] = useState(null);
  const load = useCallback(async () => {
    const rx = (v) => ({ $regex: v, $options: 'i' });
    const query = only ? { id: only } : { ...(stage !== 'all' && { world: stage }), ...(actor && { actors: actor }), ...(from && { created_date: { $gte: from } }), ...(q && { $or: [{ name: rx(q) }, { scene_name: rx(q) }] }) };
    const takes = (await base44.entities.SceneTake.filter(query, { sort: '-created_date', limit: 50 })).items;
    const jobs = takes.length ? (await base44.entities.RenderJob.filter({ take_id: { $in: takes.map((x) => x.id) } }, { sort: '-created_date', limit: 200 })).items : [];
    setData({ takes, jobs });
  }, [stage, q, actor, from, only]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Performance Library" title="Recorded Scenes" />
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-quiet" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search takes or scenes" className="bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-sm" /></div>
        <input value={actor} onChange={(e) => setActor(e.target.value.trim().toLowerCase())} placeholder="Actor id (e.g. krush)" className="bg-card border border-border rounded-xl px-3 py-2 text-sm w-40" />
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm" aria-label="Recorded since" />
        {[['all', 'All Stages'], ...Object.values(STAGES).map((s) => [s.id, s.name])].map(([k, l]) => <button key={k} onClick={() => setStage(k)} className={chip(stage === k)}>{l}</button>)}
      </div>
      {!data && <Loader2 className="w-5 h-5 animate-spin" />}
      {data && !data.takes.length && <p className="text-sm text-muted-foreground">No recordings match.</p>}
      <div className="space-y-3">
        {data?.takes.map((t) => {
          const jobs = data.jobs.filter((j) => j.take_id === t.id), latest = jobs[0], master = jobs.find((j) => j.status === 'completed' && j.video_uri);
          return (
            <div key={t.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{t.name || `Take ${String(t.take_number).padStart(2, '0')}`}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.scene_name || 'Untitled Scene'} · {stageInfo(t.world).name} · take {t.take_number} · {(t.duration || 0).toFixed(1)}s · {(t.actors || []).join(', ') || 'no actors'} · {t.camera_name || 'Camera'} · {format(new Date(t.created_date), 'MMM d, yyyy HH:mm')}</p>
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[11px] text-quiet">Performance</span><StatusBadge status={t.status} />
                  <span className="text-[11px] text-quiet ml-2">Preview</span><StatusBadge status={t.preview_uri ? 'completed' : 'draft'} />
                  <span className="text-[11px] text-quiet ml-2">Cloud</span>{latest ? <StatusBadge status={latest.status} /> : <StatusBadge status="draft" />}
                </div>
              </div>
              <RecordingActions take={t} master={master} onWatch={setVideo} reload={load} />
            </div>
          );
        })}
      </div>
      <VideoDialog video={video} onClose={() => setVideo(null)} />
    </div>
  );
}