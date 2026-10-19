import React from 'react';

const Seg = ({ value, opts, onChange }) => <div className="flex gap-1">{opts.map(([v, l]) => <button key={String(v)} onClick={() => onChange(v)} className={`flex-1 rounded-md py-1 text-xs ${value === v ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{l}</button>)}</div>;

// Filming visibility: walls/ceilings between any camera and its subject hide for that camera only.
export default function ViewControls({ R, view }) {
  const set = (p) => R.cutaway.set(p);
  return (
    <div className="space-y-2 rounded-xl bg-white/5 p-3">
      <p className="text-xs font-semibold">Camera visibility</p>
      <div><p className="text-[11px] text-quiet mb-1">Auto-hide walls & ceilings blocking the shot</p><Seg value={view.mode} opts={[['auto', 'Auto'], ['off', 'Off']]} onChange={(mode) => set({ mode })} /></div>
      <div><p className="text-[11px] text-quiet mb-1">Roof</p><Seg value={view.roof} opts={[['auto', 'Auto'], ['show', 'Show'], ['hide', 'Hide']]} onChange={(roof) => set({ roof })} /></div>
      <div><p className="text-[11px] text-quiet mb-1">Upper floor (for overhead ground-floor shots)</p><Seg value={view.upper} opts={[[true, 'Show'], [false, 'Hide']]} onChange={(upper) => set({ upper })} /></div>
    </div>
  );
}