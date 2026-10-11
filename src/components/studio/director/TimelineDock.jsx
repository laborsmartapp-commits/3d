import React, { useState } from 'react';
import DirectorTransport from './DirectorTransport';
import TimelineClip from './TimelineClip';
import ClipInspector from './ClipInspector';
import AddLibraryActor from './AddLibraryActor';

const ROWS = [['perf', 'Movement'], ['anim', 'Body Anim']];

// Bottom multilayer timeline: one master clock, a Movement and Body Animation lane per actor.
export default function TimelineDock({ engine, st, open, setOpen }) {
  const d = st.director, D = engine.studio.dir;
  const [zoom, setZoom] = useState(40), [sel, setSel] = useState(null);
  const W = d.duration * zoom, clip = d.clips.find((c) => c.id === sel);
  const seek = (e) => { const r = e.currentTarget.getBoundingClientRect(); D.seek((e.clientX - r.left) / zoom); };
  return (
    <div className={`absolute bottom-0 inset-x-0 z-20 glass rounded-t-2xl ${st.active ? 'md:mr-[520px]' : ''}`}>
      <DirectorTransport engine={engine} st={st} d={d} zoom={zoom} setZoom={setZoom} open={open} setOpen={setOpen} />
      {open && (
        <div className="flex max-h-56 overflow-y-auto">
          <div className="w-28 shrink-0 text-[11px]">
            <div className="h-5" />
            {d.actors.map((a) => ROWS.map(([k, l]) => (
              <div key={a.id + k} className={`h-7 px-2 flex items-center truncate border-t border-white/5 ${a.id === d.controlled ? 'text-primary' : ''}`}>{k === 'perf' ? <button onClick={() => { D.control(a.id); if (!a.armed) D.setActor(a.id, { armed: true }); }} disabled={st.status === 'capturing'} title="Control this character" className="truncate font-bold hover:text-primary text-left">{a.name}</button> : <span className="text-muted-foreground">{l}</span>}</div>
            )))}
            <AddLibraryActor engine={engine} disabled={st.status !== 'idle' || !st.scene} />
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="relative" style={{ width: W + 40 }}>
              <div onPointerDown={seek} className="h-5 relative cursor-pointer text-[9px] text-muted-foreground">
                {Array.from({ length: Math.floor(d.duration) + 1 }, (_, i) => i).filter((i) => zoom >= 20 || i % 5 === 0).map((i) => <span key={i} className="absolute top-0.5 border-l border-white/20 pl-0.5" style={{ left: i * zoom }}>{i}s</span>)}
              </div>
              {d.actors.map((a) => ROWS.map(([k]) => (
                <div key={a.id + k} onPointerDown={seek} className={`h-7 relative border-t border-white/5 ${a.muted ? 'opacity-40' : ''}`}>
                  {d.clips.filter((c) => c.actor === a.id && c.kind === k).map((c) => (
                    <TimelineClip key={c.id} c={c} zoom={zoom} selected={sel === c.id} locked={a.locked} onSelect={() => setSel(c.id)} onMove={(start) => D.setClip(c.id, { start })} />
                  ))}
                </div>
              )))}
              <div className="absolute top-0 bottom-0 w-px bg-destructive pointer-events-none" style={{ left: d.t * zoom }} />
              {d.stopAt != null && <div className="absolute top-0 bottom-0 w-px bg-ember/70 pointer-events-none" style={{ left: d.stopAt * zoom }} />}
            </div>
          </div>
        </div>
      )}
      {open && clip && <ClipInspector engine={engine} c={clip} />}
    </div>
  );
}