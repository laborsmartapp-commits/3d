import React from 'react';
import useScrub from './useScrub';
import { tc } from '../DirectorTransport';

// Seconds ruler with the draggable playhead head. Press anywhere to jump; drag to scrub.
// Frame ticks appear once zoomed in far enough to place the playhead on single frames.
export default function TimeRuler({ D, d, zoom }) {
  const scrub = useScrub(D, zoom);
  const secs = Array.from({ length: Math.floor(d.duration) + 1 }, (_, i) => i).filter((i) => zoom >= 20 || i % 5 === 0);
  const fw = zoom / d.fps, frames = fw >= 6 ? { backgroundImage: `repeating-linear-gradient(to right, rgba(255,255,255,0.15) 0 1px, transparent 1px ${fw}px)` } : null;
  return (
    <div {...scrub.bind} data-tl-ruler className="h-5 relative cursor-pointer text-[9px] text-muted-foreground select-none touch-none">
      {frames && <div data-tl-frames className="absolute bottom-0 inset-x-0 h-1 pointer-events-none" style={frames} />}
      {secs.map((i) => <span key={i} className="absolute top-0.5 border-l border-white/20 pl-0.5 pointer-events-none" style={{ left: i * zoom }}>{i}s</span>)}
      <div data-tl-playhead className="absolute top-0 h-5 w-3 -ml-1.5 flex justify-center cursor-ew-resize" style={{ left: d.t * zoom }}>
        <span className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-destructive" />
        {scrub.on && <span data-tl-scrub-time className="absolute top-0 left-full ml-0.5 rounded bg-destructive px-1 leading-4 font-mono text-[9px] text-destructive-foreground whitespace-nowrap pointer-events-none">{tc(d.t, d.fps)} · f{Math.round(d.t * d.fps)}</span>}
      </div>
    </div>
  );
}