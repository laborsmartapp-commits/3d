import React, { useState } from 'react';
import { DISCOVERIES } from '@/game/world/layout';
import { CATALOG, CATEGORIES } from '@/game/build/catalog';

export default function DevWorld({ engine, s }) {
  const [viz, setViz] = useState(false);
  const [coll, setColl] = useState(engine.colliders.enabled);
  const [cat, setCat] = useState('decor');
  const spawn = (id) => {
    if (engine.readOnly) return engine.notify('Spawning is disabled while visiting');
    if (engine.mode !== 'build') engine.setMode('build');
    engine.build.selectCatalog(id, { dev: true });
  };
  const toggle = (label, v, fn) => (
    <label className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
      {label}<input type="checkbox" className="accent-primary w-4 h-4" checked={v} onChange={(e) => fn(e.target.checked)} />
    </label>
  );
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <button onClick={() => engine.setMode('free')} className="w-full rounded-lg bg-accent/80 hover:bg-accent text-accent-foreground py-2 text-sm font-medium">{s.mode === 'free' ? 'Exit free camera' : 'Fly free camera'}</button>
        {toggle('Collision visualization', viz, (v) => { setViz(v); engine.toggleCollisionViz(v); })}
        {toggle('Player collisions', coll, (v) => { setColl(v); engine.colliders.enabled = v; })}
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Teleport</p>
        <div className="grid grid-cols-2 gap-1.5">
          {DISCOVERIES.map((d) => <button key={d.id} onClick={() => engine.teleport(d.x + 3, d.z + 3)} className="rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1.5 text-[11px] text-left truncate">{d.name}</button>)}
        </div>
      </div>
      <div>
        <p className="text-xs text-muted-foreground mb-1.5">Spawn asset (free, unrestricted)</p>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full rounded-lg bg-secondary px-2 py-1.5 text-sm mb-2">
          {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <div className="grid grid-cols-2 gap-1.5">
          {CATALOG.filter((d) => d.cat === cat).map((d) => <button key={d.id} onClick={() => spawn(d.id)} className="rounded-lg bg-white/5 hover:bg-primary/20 px-2 py-1.5 text-[11px] text-left truncate">{d.name}</button>)}
        </div>
        <p className="text-[11px] text-quiet mt-2">Spawned objects can be moved, rotated, scaled, duplicated and deleted in Build Mode.</p>
      </div>
    </div>
  );
}