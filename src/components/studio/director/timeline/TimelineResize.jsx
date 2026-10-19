import React from 'react';
import { TL_MIN, tlMax } from './timelineUI';

// Top-centre grab handle. Dragging writes the height straight to the DOM (no React work per frame);
// the final height is committed once on release. Double-click toggles compact / expanded.
export default function TimelineResize({ box, h, onCommit }) {
  const clamp = (v) => Math.round(Math.max(TL_MIN, Math.min(tlMax(), v)));
  const down = (e) => {
    e.preventDefault();
    const y0 = e.clientY, h0 = box.current.offsetHeight;
    const move = (ev) => { box.current.style.height = clamp(h0 + y0 - ev.clientY) + 'px'; };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); onCommit(clamp(box.current.offsetHeight)); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  };
  const mid = (TL_MIN + tlMax()) / 2;
  return (
    <div onPointerDown={down} onDoubleClick={() => onCommit(h < mid ? tlMax() : TL_MIN)} data-tl-handle title="Drag to resize · double-click to expand/compact"
      className="absolute left-1/2 -translate-x-1/2 -top-3 z-30 h-6 w-28 grid place-items-center cursor-ns-resize touch-none group">
      <span className="h-1.5 w-12 rounded-full bg-white/35 ring-1 ring-black/30 shadow transition group-hover:bg-primary group-hover:w-16" />
    </div>
  );
}