import { useRef, useState } from 'react';

// Pointer scrubbing on the ruler: press to jump, drag to scrub. Playback pauses for the drag and
// resumes on release only if it was already running.
export default function useScrub(D, zoom) {
  const [on, setOn] = useState(false), g = useRef(null);
  const at = (e) => (e.clientX - e.currentTarget.getBoundingClientRect().left) / zoom;
  const down = (e) => {
    if (e.button > 0) return;
    e.preventDefault(); e.currentTarget.setPointerCapture?.(e.pointerId);
    g.current = { was: D.beginScrub() }; setOn(true); D.scrubTo(at(e));
  };
  const move = (e) => { if (g.current) D.scrubTo(at(e)); };
  const up = () => { if (!g.current) return; const { was } = g.current; g.current = null; setOn(false); D.endScrub(was); };
  return { on, bind: { onPointerDown: down, onPointerMove: move, onPointerUp: up, onPointerCancel: up } };
}