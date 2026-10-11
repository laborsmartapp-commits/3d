import React from 'react';
import { Clapperboard, Circle, Square, PanelBottom, PanelRight } from 'lucide-react';

const B = 'glass rounded-full px-3 py-2 text-sm flex items-center gap-2 hover:bg-card/80';

// Top-right studio controls: open the studio, show/hide its panel and timeline, record/stop.
export default function StudioTopBar({ engine, st, open, setOpen, panel, setPanel, timeline, setTimeline }) {
  const capturing = st?.status === 'capturing', armed = st?.director?.actors.find((a) => a.armed);
  const canRecord = st?.status === 'idle' && st?.scene && armed;
  return (
    <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
      {open && st?.scene && (capturing
        ? <button onClick={() => engine.studio.stop()} className={`${B} bg-white text-background`}><Square className="w-4 h-4 fill-current" />Stop</button>
        : <button onClick={() => engine.studio.dir.record()} disabled={!canRecord} title={armed ? `Record ${armed.name}` : 'Add a character first'} className={`${B} text-destructive disabled:opacity-40`}><Circle className="w-4 h-4 fill-current" />Record</button>)}
      {open && st?.scene && <button onClick={() => setTimeline(!timeline)} className={`${B} ${timeline ? 'ring-1 ring-primary' : ''}`}><PanelBottom className="w-4 h-4 text-primary" />Timeline</button>}
      {open && <button onClick={() => setPanel(!panel)} className={`${B} ${panel ? 'ring-1 ring-primary' : ''}`}><PanelRight className="w-4 h-4 text-primary" />Panel</button>}
      <button onClick={() => setOpen(!open)} className={`${B} ${open ? 'ring-1 ring-primary' : ''}`}><Clapperboard className="w-4 h-4 text-primary" />{open ? 'Close Studio' : 'Scene Manager'}</button>
    </div>
  );
}