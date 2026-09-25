import React from 'react';
import { Gem, MapPin, Compass } from 'lucide-react';
import SidePanel from './SidePanel';
import { PLOTS, DISCOVERIES } from '@/game/world/layout';

export default function IslandPanel({ engine, s, onClose }) {
  const owned = PLOTS.filter((p) => (s.owned || []).includes(p.id));
  const disc = s.discovered || [];
  return (
    <SidePanel title={s.islandName} subtitle={s.readOnly ? `Owned by ${s.owner}` : 'Your personal floating island'} onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-white/5 p-3 text-center"><Gem className="w-4 h-4 mx-auto text-ember" /><p className="text-lg font-semibold mt-1">{s.shards}</p><p className="text-[10px] text-quiet">Moonshards</p></div>
        <div className="rounded-xl bg-white/5 p-3 text-center"><MapPin className="w-4 h-4 mx-auto text-primary" /><p className="text-lg font-semibold mt-1">{owned.length}</p><p className="text-[10px] text-quiet">Plots</p></div>
        <div className="rounded-xl bg-white/5 p-3 text-center"><Compass className="w-4 h-4 mx-auto text-accent" /><p className="text-lg font-semibold mt-1">{disc.length}/{DISCOVERIES.length}</p><p className="text-[10px] text-quiet">Discovered</p></div>
      </div>
      <p className="text-xs uppercase tracking-wider text-quiet mt-5 mb-2">Owned land</p>
      <div className="space-y-1.5">
        {owned.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm">
            <span>{p.name}</span><button onClick={() => { engine.teleport(p.x, p.z + p.r + 2); onClose(); }} className="text-xs text-primary">Travel</button>
          </div>
        ))}
      </div>
      <p className="text-xs uppercase tracking-wider text-quiet mt-5 mb-2">Discoveries</p>
      <div className="grid grid-cols-2 gap-1.5">
        {DISCOVERIES.map((d) => {
          const found = disc.includes(d.id);
          return <div key={d.id} className={`rounded-lg px-2.5 py-1.5 text-[11px] ${found ? 'bg-primary/15 text-foreground' : 'bg-white/5 text-quiet'}`}>{found ? d.name : d.secret ? '??? Secret' : 'Undiscovered'}</div>;
        })}
      </div>
    </SidePanel>
  );
}