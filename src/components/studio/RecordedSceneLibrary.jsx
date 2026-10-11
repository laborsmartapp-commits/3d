import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import TakeRow from './TakeRow';

export default function RecordedSceneLibrary({ engine, st }) {
  const [data, setData] = useState(null);
  const load = useCallback(async () => {
    const takes = (await base44.entities.SceneTake.filter({}, { sort: '-created_date', limit: 50 })).items;
    const jobs = takes.length ? (await base44.entities.RenderJob.filter({ take_id: { $in: takes.map((t) => t.id) } }, { sort: '-created_date', limit: 200 })).items : [];
    setData({ takes, jobs });
  }, []);
  useEffect(() => { load(); }, [load, st.libVersion]);
  useEffect(() => base44.entities.RenderJob.subscribe(() => load()), [load]);

  if (!data) return <Loader2 className="w-5 h-5 animate-spin" />;
  if (!data.takes.length) return <p className="text-sm text-muted-foreground">No recorded takes yet. Place a camera, press Record, perform, then Stop and Save Take.</p>;
  const groups = data.takes.reduce((m, t) => { (m[t.scene_id] ||= { name: t.scene_name, takes: [] }).takes.push(t); return m; }, {});
  return (
    <div className="space-y-5">
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