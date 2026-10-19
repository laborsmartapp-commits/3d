import React, { useRef, useState } from 'react';

const len = (c) => (c.kind === 'perf' ? c.out - c.in : c.end - c.start);

// Drag the clip body to reposition it on its own track (non-destructive: only its start changes).
// While dragging, a dashed ghost marks the original spot and the clip shows its snapped start time.
export default function TimelineClip({ c, zoom, selected, onSelect, onGrab, onMove, place, overlapAt, locked }) {
  const [s, setS] = useState(null), drag = useRef(null);
  const down = (e) => { e.stopPropagation(); onSelect(); if (locked || e.button > 0) return; drag.current = e.clientX; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move = (e) => {
    if (drag.current == null) return; const dx = e.clientX - drag.current;
    if (s == null && Math.abs(dx) <= 2) return;
    if (s == null) onGrab?.();
    setS(place(Math.max(0, c.start + dx / zoom)));
  };
  const up = () => { if (drag.current == null) return; drag.current = null; if (s != null && Math.abs(s - c.start) > 1e-4) onMove(s); setS(null); };
  const cancel = () => { drag.current = null; setS(null); };
  const perf = c.kind === 'perf', w = Math.max(6, len(c) * zoom), hit = s != null && overlapAt(s);
  const name = perf ? (c.name?.split('—')[1] || 'Performance') : (c.label || c.anim);
  return (<>
    {s != null && <div data-clip-ghost className="absolute top-1 bottom-1 rounded-md border border-dashed border-white/40 pointer-events-none" style={{ left: c.start * zoom, width: w }} />}
    <div data-clip-id={c.id} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}
      style={{ left: (s ?? c.start) * zoom, width: w }}
      className={`absolute top-1 bottom-1 rounded-md px-1.5 text-[10px] leading-5 truncate select-none touch-none border ${locked ? 'cursor-not-allowed' : s != null ? 'cursor-grabbing z-10 shadow-lg shadow-black/50' : 'cursor-grab'} ${perf ? 'bg-primary/30 border-primary/60' : 'bg-accent/30 border-accent/60'} ${c.muted ? 'opacity-35' : ''} ${hit ? 'ring-2 ring-ember' : selected ? 'ring-2 ring-foreground' : ''}`}>
      {s != null ? <span className="font-mono">{s.toFixed(2)}s{hit ? ' · overlaps' : ''}</span> : name}
    </div>
  </>);
}