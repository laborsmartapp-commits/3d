import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { STAGES } from '@/game/stages/registry';

export default function AdminStages() {
  const [c, setC] = useState({});
  useEffect(() => {
    const E = base44.entities;
    Promise.all(Object.keys(STAGES).map(async (id) => [id, await Promise.all([E.StudioScene.count({ world: id }), E.SceneTake.count({ world: id }), E.Production.count({ stage_id: id })])]))
      .then((r) => setC(Object.fromEntries(r)));
  }, []);
  return (
    <div className="space-y-3">
      {Object.values(STAGES).map((s) => {
        const [scenes, takes, prods] = c[s.id] || [];
        return (
          <div key={s.id} className="glass rounded-2xl p-4 flex flex-wrap gap-4 items-center">
            <div className="flex-1"><p className="font-semibold">{s.name}</p><p className="font-mono text-xs text-quiet">id {s.id} · route {s.path}</p></div>
            <span className="text-xs text-muted-foreground">{scenes ?? '…'} scenes · {takes ?? '…'} takes · {prods ?? '…'} productions</span>
            {takes > 0 && <span className="text-xs text-ember">Recordings depend on this stage — do not unregister it</span>}
            <Link to={s.path} className="text-xs text-primary">Open</Link>
            <Link to={`${s.path}?sceneDiag=1`} className="text-xs text-primary">Diagnostics</Link>
          </div>
        );
      })}
      <p className="text-xs text-quiet">Stages are registered in code (stage registry) so the engine is never duplicated. Display names, thumbnails and availability toggles stored in the database are not built yet.</p>
    </div>
  );
}