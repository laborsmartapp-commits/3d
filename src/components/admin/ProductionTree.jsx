import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/shell/StatusBadge';

// Production → Scenes → Shots → Takes → Render jobs (+ referenced assets).
export default function ProductionTree({ production: p }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    const ids = p.scene_ids || [], E = base44.entities;
    Promise.all([
      ids.length ? E.StudioScene.filter({ id: { $in: ids } }, { limit: 100, fields: ['name', 'world'] }) : { items: [] },
      E.Shot.filter({ production_id: p.id }, { sort: 'order', limit: 500 }),
      ids.length ? E.SceneTake.filter({ scene_id: { $in: ids } }, { limit: 200, fields: ['name', 'scene_id', 'status'] }) : { items: [] },
      p.asset_ids?.length ? E.Asset.filter({ id: { $in: p.asset_ids } }, { limit: 100, fields: ['name', 'category'] }) : { items: [] },
    ]).then(async ([s, sh, t, a]) => {
      const jobs = t.items.length ? (await E.RenderJob.filter({ take_id: { $in: t.items.map((x) => x.id) } }, { limit: 300, fields: ['take_id', 'status', 'resolution'] })).items : [];
      setD({ scenes: s.items, shots: sh.items, takes: t.items, assets: a.items, jobs });
    });
  }, [p]);
  if (!d) return <Loader2 className="w-4 h-4 animate-spin mt-3" />;
  return (
    <div className="mt-3 ml-7 text-xs space-y-2">
      {!d.scenes.length && <p className="text-quiet">No scenes.</p>}
      {d.scenes.map((s) => (
        <div key={s.id}>
          <p className="font-semibold">Scene · {s.name} <span className="text-quiet font-normal">({s.world})</span></p>
          <div className="ml-4 space-y-0.5">
            {d.shots.filter((x) => x.scene_id === s.id).map((x) => <p key={x.id}>Shot · {x.name}</p>)}
            {d.takes.filter((t) => t.scene_id === s.id).map((t) => (
              <div key={t.id} className="flex flex-wrap gap-2 items-center">
                <Link to={`/recordings?take=${t.id}`} className="text-primary">Take · {t.name}</Link>
                {d.jobs.filter((j) => j.take_id === t.id).map((j) => <Link key={j.id} to={`/renders?job=${j.id}`}><StatusBadge status={j.status} /></Link>)}
              </div>
            ))}
          </div>
        </div>
      ))}
      {!!d.assets.length && <p>Assets: {d.assets.map((a) => <Link key={a.id} to={`/assets?cat=${a.category}&id=${a.id}`} className="text-primary mr-2">{a.name}</Link>)}</p>}
    </div>
  );
}