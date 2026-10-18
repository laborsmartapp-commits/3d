import React from 'react';
import { Footprints, Move, Clapperboard, Library, ListTree, Sun, Layers, Gauge } from 'lucide-react';

const MODES = [['explore', Footprints, 'Explore'], ['edit', Move, 'Set Edit'], ['production', Clapperboard, 'Production']];
const PANELS = [['library', Library, 'Set Dressing Library'], ['hierarchy', ListTree, 'Objects by Room'], ['environment', Sun, 'Realm Environment'], ['versions', Layers, 'Set Versions'], ['perf', Gauge, 'Performance']];

export default function ModeRail({ mode, setMode, panel, setPanel }) {
  const B = (on) => `w-full rounded-xl px-2 py-2 flex flex-col items-center gap-1 text-[10px] font-semibold transition ${on ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10 text-foreground/80'}`;
  return (
    <div className="absolute left-4 top-20 z-30 w-[76px] glass rounded-2xl p-1.5 flex flex-col gap-1">
      {MODES.map(([k, I, l]) => <button key={k} onClick={() => setMode(k)} className={B(mode === k)}><I className="w-4 h-4" />{l}</button>)}
      <div className="h-px bg-white/10 my-1" />
      {PANELS.map(([k, I, l]) => <button key={k} title={l} onClick={() => setPanel(panel === k ? null : k)} className={B(panel === k)}><I className="w-4 h-4" />{l.split(' ')[0]}</button>)}
    </div>
  );
}