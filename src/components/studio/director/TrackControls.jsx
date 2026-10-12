import React from 'react';

// Per-track mute, solo and gain for an audio track (applies in studio playback and cloud renders).
export default function TrackControls({ engine, track, t = {}, disabled }) {
  const set = (p) => engine.studio.dir.setTrack(track, p);
  const btn = (on, cls) => `w-4 h-4 rounded text-[9px] font-bold leading-none ${on ? cls : 'bg-white/10 text-muted-foreground'} disabled:opacity-30`;
  return (
    <span className="flex items-center gap-0.5 shrink-0">
      <button disabled={disabled} onClick={() => set({ muted: !t.muted })} title="Mute track" className={btn(t.muted, 'bg-destructive text-white')}>M</button>
      <button disabled={disabled} onClick={() => set({ solo: !t.solo })} title="Solo track" className={btn(t.solo, 'bg-ember text-black')}>S</button>
      <input type="range" min="0" max="2" step="0.05" disabled={disabled} value={t.gain ?? 1} title={`Track gain ${Math.round((t.gain ?? 1) * 100)}%`}
        onChange={(e) => set({ gain: +e.target.value })} className="w-8 h-1 accent-primary" />
    </span>
  );
}