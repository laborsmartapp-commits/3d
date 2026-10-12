import React, { useEffect, useRef, useState } from 'react';

// Audio clip on the master timeline: drag to move, drag the edges to trim. The waveform is drawn from
// stored peak data, mapped through trim/speed/loop so it lines up with the time ruler.
export default function AudioClip({ c, zoom, wz, selected, onSelect, onChange, snap }) {
  const [d, setD] = useState(null), drag = useRef(null), cv = useRef(null);
  const v = d ? { ...c, ...d } : c, w = Math.max(6, (v.end - v.start) * zoom);
  useEffect(() => {
    const el = cv.current; if (!el || !c.peaks?.length) return;
    el.width = Math.min(4000, w); el.height = 24; const g = el.getContext('2d'), P = c.peaks, sp = v.speed || 1, cyc = c.len - (v.in || 0);
    g.clearRect(0, 0, el.width, 24); g.fillStyle = 'rgba(56,189,248,0.85)';
    for (let x = 0; x < el.width; x++) {
      let s = (x / el.width) * (v.end - v.start) * sp; if (v.loop && cyc > 0) s %= cyc;
      const src = (v.in || 0) + s; if (src > c.len) break;
      const h = Math.min(1, P[Math.floor((src / c.len) * (P.length - 1))] * wz) * 11;
      g.fillRect(x, 12 - h, 1, Math.max(0.5, h * 2));
    }
  }, [c, v.start, v.end, v.in, v.loop, v.speed, w, wz]);
  const down = (mode) => (e) => { e.stopPropagation(); onSelect(); drag.current = { mode, x: e.clientX }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = (e) => {
    const g = drag.current; if (!g) return; const dt = (e.clientX - g.x) / zoom, sp = c.speed || 1;
    if (g.mode === 'move') { const s = snap(Math.max(0, c.start + dt), c.id); setD({ start: s, end: s + (c.end - c.start) }); }
    else if (g.mode === 'l') { const s = snap(Math.max(c.start - (c.in || 0) / sp, Math.min(c.end - 0.1, c.start + dt)), c.id); setD({ start: s, in: (c.in || 0) + (s - c.start) * sp }); }
    else { const max = c.loop ? Infinity : c.start + (c.len - (c.in || 0)) / sp; setD({ end: snap(Math.min(max, Math.max(c.start + 0.1, c.end + dt)), c.id) }); }
  };
  const up = () => { if (!drag.current) return; drag.current = null; if (d) onChange(Object.fromEntries(Object.entries(d).map(([k, x]) => [k, +x.toFixed(3)]))); setD(null); };
  return (
    <div onPointerDown={down('move')} onPointerMove={move} onPointerUp={up} style={{ left: v.start * zoom, width: w }}
      className={`absolute top-0.5 bottom-0.5 rounded-md overflow-hidden cursor-grab select-none border bg-sky-500/15 border-sky-400/60 ${c.muted ? 'opacity-35' : ''} ${selected ? 'ring-2 ring-foreground' : ''}`}>
      <canvas ref={cv} className="absolute inset-0 w-full h-full pointer-events-none" />
      <span className="relative px-1.5 text-[9px] leading-4 truncate block">{c.solo ? 'S · ' : ''}{c.label}{c.loop ? ' ⟳' : ''}</span>
      <div onPointerDown={down('l')} className="absolute left-0 inset-y-0 w-1.5 cursor-ew-resize bg-sky-300/40 hover:bg-sky-300" />
      <div onPointerDown={down('r')} className="absolute right-0 inset-y-0 w-1.5 cursor-ew-resize bg-sky-300/40 hover:bg-sky-300" />
    </div>
  );
}