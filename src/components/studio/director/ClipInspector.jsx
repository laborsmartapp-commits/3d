import React from 'react';
import { Trash2, VolumeX, Volume2, Copy } from 'lucide-react';
import { ANIMATIONS } from '@/game/studio/characters';
import { animClip } from '@/game/studio/Timeline';

const F = ({ label, value, onChange, step = 0.1 }) => (
  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">{label}
    <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-14 bg-white/5 rounded px-1 py-0.5 text-foreground" />
  </label>
);

export default function ClipInspector({ engine, c: raw }) {
  const D = engine.studio.dir, set = (p) => D.setClip(raw.id, p), perf = raw.kind === 'perf';
  const c = perf ? raw : animClip(raw), cl = (v, a, b) => Math.max(a, Math.min(b, v));
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-3 py-1.5 border-t border-white/10 text-xs">
      <span className="font-semibold">{perf ? 'Movement take' : 'Body animation'}</span>
      <F label="Start" value={c.start} onChange={(v) => set({ start: Math.max(0, v) })} />
      {perf ? (<>
        <F label="Trim in" value={c.in} onChange={(v) => set({ in: cl(v, 0, c.out - 0.1) })} />
        <F label="Trim out" value={c.out} onChange={(v) => set({ out: Math.max(c.in + 0.1, v) })} />
      </>) : (<>
        <F label="End" value={c.end} onChange={(v) => set({ end: Math.max(c.start + 0.1, v) })} />
        <select value={c.anim} onChange={(e) => set({ anim: e.target.value })} className="bg-white/5 rounded px-1 py-0.5">
          {ANIMATIONS.map(([k, l]) => <option key={k} value={k} className="bg-card">{l}</option>)}
        </select>
        <F label="Speed" value={c.speed} onChange={(v) => set({ speed: cl(v, 0.1, 4) })} />
        <F label="Trim in" value={c.in} onChange={(v) => set({ in: Math.max(0, v) })} />
        <F label="Loops (0=∞)" value={c.loops} step={1} onChange={(v) => set({ loops: Math.max(0, Math.round(v)) })} />
        <F label="Weight" value={c.weight} onChange={(v) => set({ weight: cl(v, 0, 1) })} />
        <F label="Blend in" value={c.blendIn} onChange={(v) => set({ blendIn: Math.max(0, v) })} />
        <F label="Blend out" value={c.blendOut} onChange={(v) => set({ blendOut: Math.max(0, v) })} />
      </>)}
      <F label="Priority" value={c.priority || 0} step={1} onChange={(v) => set({ priority: Math.round(v) })} />
      <button onClick={() => set({ muted: !c.muted })} className="flex items-center gap-1 hover:text-primary">{c.muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}{c.muted ? 'Disabled' : 'Active'}</button>
      <button onClick={() => D.duplicateClip(c.id)} className="flex items-center gap-1 hover:text-primary"><Copy className="w-3.5 h-3.5" />Duplicate</button>
      <button onClick={() => D.deleteClip(c.id)} className="flex items-center gap-1 text-destructive"><Trash2 className="w-3.5 h-3.5" />Delete</button>
    </div>
  );
}