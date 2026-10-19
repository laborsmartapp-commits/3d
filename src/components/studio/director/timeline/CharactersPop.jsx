import React from 'react';
import { ChevronDown, ChevronRight, Circle } from 'lucide-react';
import AddLibraryActor from '../AddLibraryActor';
import { ACTOR_ROWS } from './timelineUI';

// Cast + their tracks. Selecting a character takes control of it (same as the Director); arming/locking stays in Director.
export default function CharactersPop({ engine, st, d, ui, set }) {
  const D = engine.studio.dir, busy = st.status === 'capturing';
  const toggle = (id) => set({ collapsed: { ...ui.collapsed, [id]: !ui.collapsed[id] } });
  return (
    <div className="space-y-1.5">
      {!d.actors.length && <p className="text-xs text-muted-foreground">No characters in this scene yet.</p>}
      {d.actors.map((a) => (
        <div key={a.id} className="rounded-lg bg-white/5 overflow-hidden">
          <div className="flex items-center gap-1 px-1.5 py-1">
            <button onClick={() => toggle(a.id)} aria-label={ui.collapsed[a.id] ? 'Expand tracks' : 'Collapse tracks'} className="p-0.5 rounded hover:bg-white/10">{ui.collapsed[a.id] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</button>
            <button disabled={busy} onClick={() => { D.control(a.id); if (!a.armed) D.setActor(a.id, { armed: true }); set({ selTrack: `${a.id}:perf` }); }}
              className={`flex-1 text-left text-sm font-semibold truncate ${a.id === d.controlled ? 'text-primary' : 'hover:text-primary'}`}>{a.name}</button>
            {a.armed && <Circle className="w-3 h-3 fill-destructive text-destructive" />}
          </div>
          {!ui.collapsed[a.id] && ACTOR_ROWS.map(([k, l]) => {
            const n = d.clips.filter((c) => c.actor === a.id && c.kind === k).length, id = `${a.id}:${k}`;
            return <button key={k} onClick={() => set({ selTrack: id })} className={`w-full flex justify-between pl-8 pr-2 py-1 text-[11px] ${ui.selTrack === id ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:bg-white/5'}`}><span>{l}</span><span>{n} clip{n === 1 ? '' : 's'}</span></button>;
          })}
        </div>
      ))}
      <div className="rounded-lg bg-white/5 overflow-hidden"><AddLibraryActor engine={engine} disabled={st.status !== 'idle' || !st.scene} /></div>
      <p className="text-[10px] text-muted-foreground">Arm, lock and schedule animations from the Director bubble.</p>
    </div>
  );
}