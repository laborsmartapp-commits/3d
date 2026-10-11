import React, { useEffect, useState } from 'react';
import { Plus, Link2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { STAGES } from '@/game/stages/registry';

const field = 'bg-background border border-border rounded-xl px-3 py-2 text-sm';

// Create a new scene in any stage, or attach an existing Director Mode scene (keeps its takes and timeline).
export default function AddSceneBar({ production, onCreate, onLink }) {
  const [name, setName] = useState(''), [world, setWorld] = useState(production.stage_id || 'celestia-grotto');
  const [existing, setExisting] = useState([]), [pick, setPick] = useState('');
  useEffect(() => {
    base44.entities.StudioScene.filter({ id: { $nin: production.scene_ids || [] } }, { sort: '-updated_date', limit: 50, fields: ['name', 'world'] }).then((r) => setExisting(r.items));
  }, [production.scene_ids]);
  return (
    <div className="glass rounded-2xl p-4 flex flex-wrap gap-2 items-center">
      <form className="flex flex-wrap gap-2 flex-1" onSubmit={(e) => { e.preventDefault(); if (name.trim()) { onCreate(name.trim(), world); setName(''); } }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New scene name" className={`${field} flex-1 min-w-40`} />
        <select value={world} onChange={(e) => setWorld(e.target.value)} className={field}>{Object.values(STAGES).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
        <button className="inline-flex items-center gap-1 rounded-xl bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold"><Plus className="w-4 h-4" />Add Scene</button>
      </form>
      {!!existing.length && (
        <div className="flex gap-2">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className={field}>
            <option value="">Attach existing scene…</option>
            {existing.map((s) => <option key={s.id} value={s.id}>{s.name} · {STAGES[s.world]?.name || s.world}</option>)}
          </select>
          <button disabled={!pick} onClick={() => { onLink(pick); setPick(''); }} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm disabled:opacity-40"><Link2 className="w-4 h-4" />Attach</button>
        </div>
      )}
    </div>
  );
}