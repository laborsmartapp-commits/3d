import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STAGES } from '@/game/stages/registry';
import TakeRow from './TakeRow';

const FILTERS = [['all', 'All Stages'], ...Object.values(STAGES).map((s) => [s.id, s.name])];

export default function RecordedSceneLibrary({ engine, st }) {
  const [data, setData] = useState(null), [stage, setStage] = useState('all');
  const load = useCallback(async () => {
    const takes = (await base44.entities.SceneTake.filter(stage === 'all' ? {} : { world: stage }, { sort: '-created_date', limit: 50 })).items;
    const jobs = takes.length ? (await base44.entities.RenderJob.filter({ take_id: { $in: takes.map((t) => t.id) } }, { sort: '-created_date', limit: 200 })).items : [];
    setData({ takes, jobs });
  }, [stage]);
  useEffect(() => { load(); }, [load, st.libVersion]);
  useEffect(() => base44.entities.RenderJob.subscribe(() => load()), [load]);

  const groups = (data?.takes || []).reduce((m, t) => { (m[t.scene_id] ||= { name: t.scene_name, takes: [] }).takes.push(t); return m; }, {});
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1">
        {FILTERS.map(([k, l]) => <button key={k} onClick={() => setStage(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${stage === k ? 'bg-primary text-primary-foreground' : 'bg-white/10 hover:bg-white/20'}`}>{l}</button>)}
      </div>
      {!data && <Loader2 className="w-5 h-5 animate-spin" />}
      {data && !data.takes.length && <p className="text-sm text-muted-foreground">No recorded takes here yet. Place a camera, press Record, perform, then Stop and Save Take.</p>}
      {Object.entries(groups).map(([id, g]) => (
        <section key={id} className="space-y-2">
          <h3 className="font-display text-sm font-semibold">{g.name || 'Untitled Scene'}</h3>
          {g.takes.sort((a, b) => a.take_number - b.take_number).map((t) => (
            <TakeRow key={t.id} engine={engine} st={st} take={t} jobs={data.jobs.filter((j) => j.take_id === t.id)} reload={load} />
          ))}
        </section>
      ))}
    </div>
  );
}