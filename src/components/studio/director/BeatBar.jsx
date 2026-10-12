import React from 'react';
import { Magnet, Plus, X } from 'lucide-react';

// Music sync controls: master volume, BPM grid, manual beat markers and snapping.
export default function BeatBar({ engine, d, wz, setWz, free }) {
  const D = engine.studio.dir, n = 'w-12 bg-white/5 rounded px-1 py-0.5 text-foreground';
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-1 border-b border-white/10 text-[11px] text-muted-foreground">
      <label className="flex items-center gap-1">Master
        <input type="range" min="0" max="1.5" step="0.05" value={d.master_gain} disabled={!free} onChange={(e) => D.setTl({ master_gain: +e.target.value })} className="w-20 accent-primary" />
      </label>
      <label className="flex items-center gap-1">BPM<input type="number" min="0" value={d.bpm || ''} placeholder="—" disabled={!free} onChange={(e) => D.setTl({ bpm: Math.max(0, +e.target.value) })} className={n} /></label>
      <label className="flex items-center gap-1">First beat<input type="number" step="0.01" value={d.beat_offset} disabled={!free} onChange={(e) => D.setTl({ beat_offset: +e.target.value })} className={n} />s</label>
      <button disabled={!free} onClick={() => D.setTl({ snap: !d.snap })} className={`flex items-center gap-1 ${d.snap ? 'text-primary' : 'hover:text-foreground'}`}><Magnet className="w-3 h-3" />Snap</button>
      <button disabled={!free} onClick={() => D.setTl({ markers: [...d.markers, +d.t.toFixed(3)].sort((a, b) => a - b) })} className="flex items-center gap-1 hover:text-foreground"><Plus className="w-3 h-3" />Beat marker</button>
      {d.markers.length > 0 && <button disabled={!free} onClick={() => D.setTl({ markers: [] })} className="flex items-center gap-1 hover:text-destructive"><X className="w-3 h-3" />Clear markers</button>}
      <label className="flex items-center gap-1">Wave<input type="range" min="0.5" max="6" step="0.5" value={wz} onChange={(e) => setWz(+e.target.value)} className="w-16 accent-primary" /></label>
      {Math.abs(d.drift) > 0.05 && <span className="text-ember">Sync drift {(d.drift * 1000).toFixed(0)} ms</span>}
    </div>
  );
}