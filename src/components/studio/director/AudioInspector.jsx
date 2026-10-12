import React from 'react';
import { Trash2, Copy, Scissors, Repeat, Headphones, VolumeX, Volume2 } from 'lucide-react';
import { AUDIO_DEFAULTS } from '@/game/studio/AudioEngine';

const F = ({ label, value, onChange, step = 0.1 }) => (
  <label className="flex items-center gap-1 text-[11px] text-muted-foreground">{label}
    <input type="number" step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-14 bg-white/5 rounded px-1 py-0.5 text-foreground" />
  </label>
);
const T = ({ on, onClick, icon: I, children }) => <button onClick={onClick} className={`flex items-center gap-1 ${on ? 'text-primary' : 'hover:text-primary'}`}><I className="w-3.5 h-3.5" />{children}</button>;

// Non-destructive edits on one audio clip: the uploaded file is never touched.
export default function AudioInspector({ engine, c: raw, actors }) {
  const D = engine.studio.dir, c = { ...AUDIO_DEFAULTS, ...raw }, set = (p) => D.setClip(c.id, p), cl = (v, a, b) => Math.max(a, Math.min(b, v));
  return (
    <div className="flex flex-wrap items-center gap-2.5 px-3 py-1.5 border-t border-white/10 text-xs">
      <span className="font-semibold">Audio · {c.label}</span>
      <F label="Start" value={c.start} onChange={(v) => set({ start: Math.max(0, v), end: Math.max(0, v) + (c.end - c.start) })} />
      <F label="End" value={c.end} onChange={(v) => set({ end: Math.max(c.start + 0.1, v) })} />
      <F label="Trim in" value={c.in} onChange={(v) => set({ in: cl(v, 0, c.len - 0.1) })} />
      <F label="Volume" value={c.gain} onChange={(v) => set({ gain: cl(v, 0, 2) })} />
      <F label="Pan" value={c.pan} onChange={(v) => set({ pan: cl(v, -1, 1) })} />
      <F label="Fade in" value={c.fadeIn} onChange={(v) => set({ fadeIn: Math.max(0, v) })} />
      <F label="Fade out" value={c.fadeOut} onChange={(v) => set({ fadeOut: Math.max(0, v) })} />
      <F label="Speed" value={c.speed} onChange={(v) => set({ speed: cl(v, 0.25, 4) })} />
      {c.track === 'dialogue' && (
        <select value={c.speaker || ''} onChange={(e) => set({ speaker: e.target.value || null })} className="bg-white/5 rounded px-1 py-0.5 text-[11px]">
          <option value="">No character</option>{actors.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}
      <T on={c.loop} onClick={() => set({ loop: !c.loop })} icon={Repeat}>Loop</T>
      <T on={c.solo} onClick={() => set({ solo: !c.solo })} icon={Headphones}>Solo</T>
      <T on={c.muted} onClick={() => set({ muted: !c.muted })} icon={c.muted ? VolumeX : Volume2}>{c.muted ? 'Muted' : 'Mute'}</T>
      <T onClick={() => D.splitClip(c.id)} icon={Scissors}>Split at playhead</T>
      <T onClick={() => D.duplicateClip(c.id)} icon={Copy}>Duplicate</T>
      <button onClick={() => D.deleteClip(c.id)} className="flex items-center gap-1 text-destructive"><Trash2 className="w-3.5 h-3.5" />Delete</button>
    </div>
  );
}