import React from 'react';
import SceneSaveControls from './SceneSaveControls';
import { SkipBack, Play, Pause, Circle, Square, Undo2, Redo2, ChevronDown, ChevronUp } from 'lucide-react';

export const tc = (t, fps = 30) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t % 1) * fps)).padStart(2, '0')}`;
const B = 'h-8 w-8 rounded-full flex items-center justify-center transition disabled:opacity-30 hover:bg-white/15';

export default function DirectorTransport({ engine, st, d, open, setOpen }) {
  const D = engine.studio.dir, capturing = st.status === 'capturing', armed = d.actors.find((a) => a.armed);
  const free = st.status === 'idle';
  return (
    <div className="flex flex-wrap md:flex-nowrap items-center gap-1 px-2 md:px-3 py-1.5 border-b border-white/10">
      <button className={B} onClick={() => D.seek(0)} disabled={capturing} title="Rewind"><SkipBack className="w-4 h-4" /></button>
      {d.state === 'playing'
        ? <button className={B} onClick={() => D.pause()} title="Pause"><Pause className="w-4 h-4" /></button>
        : <button className={B} onClick={() => D.play()} disabled={!free} title="Play"><Play className="w-4 h-4" /></button>}
      {capturing
        ? <button onClick={() => engine.studio.stop()} className="h-8 px-3 rounded-full bg-white text-background text-xs font-semibold flex items-center gap-1.5"><Square className="w-3 h-3 fill-current" />Stop</button>
        : <button onClick={() => D.record()} disabled={!free || !armed || !st.scene} className="h-8 px-3 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"><Circle className="w-3 h-3 fill-current" />Record {armed?.name || ''}</button>}
      <span className="font-mono text-xs tabular-nums px-2">{tc(d.t, d.fps)}<span className="text-muted-foreground"> / {tc(d.duration, d.fps)}</span></span>
      {capturing && <span className="text-xs text-destructive flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />Recording {d.actors.find((a) => a.id === d.recording)?.name}</span>}
      <SceneSaveControls engine={engine} st={st} />
      <div className="ml-auto flex items-center gap-0.5">
        <button className={B} onClick={() => D.undo()} disabled={!d.canUndo || !free} title="Undo"><Undo2 className="w-4 h-4" /></button>
        <button className={B} onClick={() => D.redo()} disabled={!d.canRedo || !free} title="Redo"><Redo2 className="w-4 h-4" /></button>
        <button className={B} onClick={() => setOpen(!open)} title={open ? 'Collapse' : 'Expand'}>{open ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}</button>
      </div>
    </div>
  );
}