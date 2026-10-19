import React from 'react';
import { Users, Music, SlidersHorizontal, ListTree } from 'lucide-react';

export const RAIL = [
  { id: 'characters', label: 'Characters', icon: Users },
  { id: 'audio', label: 'Audio', icon: Music },
  { id: 'settings', label: 'Timeline Settings', icon: SlidersHorizontal },
  { id: 'tracks', label: 'Tracks', icon: ListTree },
];

// Vertical bubble rail on the timeline's left edge; it lives inside the dock so it moves with every resize.
export default function TimelineRail({ view, pop, pick }) {
  return (
    <div className="w-11 shrink-0 flex flex-col items-center gap-1.5 py-2.5 border-r border-white/10">
      {RAIL.map((b) => { const on = view === b.id, opened = on && pop; return (
        <div key={b.id} className="relative group">
          <button onClick={() => pick(b.id)} aria-label={b.label} aria-pressed={opened} data-tl-bubble={b.id}
            className={`w-8 h-8 rounded-full grid place-items-center ring-1 shadow-md shadow-black/40 transition active:scale-95 ${opened ? 'bg-primary text-primary-foreground ring-primary' : on ? 'bg-card/90 text-primary ring-primary/60' : 'bg-card/80 text-foreground/90 ring-white/10 hover:ring-white/30'}`}>
            <b.icon className="w-4 h-4" />
          </button>
          <span className="pointer-events-none absolute left-full ml-2 top-1/2 -translate-y-1/2 z-40 whitespace-nowrap rounded-full bg-card/95 ring-1 ring-white/10 px-2.5 py-1 text-[11px] font-semibold opacity-0 -translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0">{b.label}</span>
        </div>
      ); })}
    </div>
  );
}