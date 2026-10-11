import React, { useRef, useState } from 'react';

const len = (c) => (c.kind === 'perf' ? c.out - c.in : c.end - c.start);

// Drag horizontally to move the clip on the master timeline (non-destructive: only its start changes).
export default function TimelineClip({ c, zoom, selected, onSelect, onMove, locked }) {
  const [dx, setDx] = useState(0), drag = useRef(null);
  const down = (e) => { e.stopPropagation(); onSelect(); if (locked) return; drag.current = e.clientX; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => { if (drag.current != null) setDx(e.clientX - drag.current); };
  const up = () => { if (drag.current == null) return; drag.current = null; if (Math.abs(dx) > 2) onMove(Math.max(0, +(c.start + dx / zoom).toFixed(2))); setDx(0); };
  const perf = c.kind === 'perf';
  return (
    <div onPointerDown={down} onPointerMove={move} onPointerUp={up}
      style={{ left: c.start * zoom + dx, width: Math.max(6, len(c) * zoom) }}
      className={`absolute top-1 bottom-1 rounded-md px-1.5 text-[10px] leading-5 truncate cursor-grab select-none border ${perf ? 'bg-primary/30 border-primary/60' : 'bg-accent/30 border-accent/60'} ${c.muted ? 'opacity-35' : ''} ${selected ? 'ring-2 ring-foreground' : ''}`}>
      {perf ? (c.name?.split('—')[1] || 'Performance') : c.anim}
    </div>
  );
}