import React from 'react';
import { Trash2, VolumeX, Volume2 } from 'lucide-react';
import { ANIMATIONS } from '@/game/studio/characters';

const F = ({ label, value, onChange, step = 0.1 }) => (
  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">{label}
    <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-16 bg-white/5 rounded px-1 py-0.5 text-foreground" />
  </label>
);

export default function ClipInspector({ engine, c }) {
  const D = engine.studio.dir, set = (p) => D.setClip(c.id, p);
  return (
    <div className="flex flex-wrap items-center gap-3 px-3 py-1.5 border-t border-white/10 text-xs">
      <span className="font-semibold">{c.kind === 'perf' ? 'Performance' : 'Animation'}</span>
      <F label="Start" value={c.start} onChange={(v) => set({ start: Math.max(0, v) })} />
      {c.kind === 'perf' ? (<>
        <F label="Trim in" value={c.in} onChange={(v) => set({ in: Math.max(0, Math.min(v, c.out - 0.1)) })} />
        <F label="Trim out" value={c.out} onChange={(v) => set({ out: Math.max(c.in + 0.1, v) })} />
      </>) : (<>
        <F label="End" value={c.end} onChange={(v) => set({ end: Math.max(c.start + 0.1, v) })} />
        <select value={c.anim} onChange={(e) => set({ anim: e.target.value })} className="bg-white/5 rounded px-1 py-0.5">
          {ANIMATIONS.map(([k, l]) => <option key={k} value={k} className="bg-card">{l}</option>)}
        </select>
      </>)}
      <button onClick={() => set({ muted: !c.muted })} className="flex items-center gap-1 hover:text-primary">{c.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}{c.muted ? 'Disabled' : 'Enabled'}</button>
      <button onClick={() => D.deleteClip(c.id)} className="flex items-center gap-1 text-destructive"><Trash2 className="w-3.5 h-3.5" />Delete clip</button>
    </div>
  );
}