import React from 'react';
import { Magnet, Plus, X, ZoomIn, ZoomOut } from 'lucide-react';

const n = 'w-16 bg-white/5 rounded px-1.5 py-1 text-foreground';
const Row = ({ label, children }) => <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{label}</span><div className="flex items-center gap-1">{children}</div></div>;
const B = 'h-7 px-2 rounded-md bg-white/10 hover:bg-white/20 flex items-center gap-1 disabled:opacity-30';

// Occasionally-used timeline configuration: music grid, snapping, zoom and the recording stop point.
export default function SettingsPop({ engine, st, d, ui, set }) {
  const D = engine.studio.dir, free = st.status === 'idle';
  return (
    <div className="space-y-2.5 text-xs">
      <Row label="BPM"><input type="number" min="0" value={d.bpm || ''} placeholder="—" disabled={!free} onChange={(e) => D.setTl({ bpm: Math.max(0, +e.target.value) })} className={n} /></Row>
      <Row label="First beat"><input type="number" step="0.01" value={d.beat_offset} disabled={!free} onChange={(e) => D.setTl({ beat_offset: +e.target.value })} className={n} />s</Row>
      <Row label="Snapping"><button disabled={!free} onClick={() => D.setTl({ snap: !d.snap })} aria-pressed={d.snap} className={`${B} ${d.snap ? 'text-primary ring-1 ring-primary/50' : ''}`}><Magnet className="w-3 h-3" />{d.snap ? 'On' : 'Off'}</button></Row>
      <Row label={`Beat markers (${d.markers.length})`}>
        <button disabled={!free} onClick={() => D.setTl({ markers: [...d.markers, +d.t.toFixed(3)].sort((a, b) => a - b) })} className={B}><Plus className="w-3 h-3" />At playhead</button>
        {d.markers.length > 0 && <button disabled={!free} onClick={() => D.setTl({ markers: [] })} className={`${B} hover:text-destructive`} title="Clear markers"><X className="w-3 h-3" /></button>}
      </Row>
      <Row label="Zoom">
        <button className={B} onClick={() => set({ zoom: Math.max(8, ui.zoom / 1.5) })} aria-label="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
        <span className="w-14 text-center tabular-nums">{Math.round(ui.zoom)} px/s</span>
        <button className={B} onClick={() => set({ zoom: Math.min(240, ui.zoom * 1.5) })} aria-label="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
      </Row>
      <Row label="Stop recording at"><input type="number" step="0.1" min="0" value={d.stopAt ?? ''} placeholder="—" onChange={(e) => { D.stopAt = e.target.value === '' ? null : +e.target.value; engine.studio.emit(); }} className={n} />s</Row>
      {Math.abs(d.drift) > 0.05 && <p className="text-ember">Sync drift {(d.drift * 1000).toFixed(0)} ms</p>}
    </div>
  );
}