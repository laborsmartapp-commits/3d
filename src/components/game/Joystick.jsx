import React, { useRef, useState } from 'react';

export default function Joystick({ engine }) {
  const base = useRef(null);
  const pid = useRef(null);
  const [k, setK] = useState({ x: 0, y: 0 });
  const move = (e) => {
    const r = base.current.getBoundingClientRect();
    let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    const m = Math.hypot(dx, dy);
    if (m > 1) { dx /= m; dy /= m; }
    setK({ x: dx, y: dy });
    engine.input.joy = { x: dx, y: -dy };
  };
  const end = () => { pid.current = null; setK({ x: 0, y: 0 }); engine.input.joy = { x: 0, y: 0 }; };
  return (
    <div ref={base}
      onPointerDown={(e) => { pid.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
      onPointerMove={(e) => pid.current === e.pointerId && move(e)}
      onPointerUp={end} onPointerCancel={end}
      className="absolute left-6 bottom-8 w-32 h-32 rounded-full bg-card/40 border border-white/10 backdrop-blur-md touch-none z-20">
      <div className="absolute w-14 h-14 rounded-full bg-primary/70 shadow-[0_0_20px_hsl(var(--primary)/0.5)]"
        style={{ left: `calc(50% + ${k.x * 38}px - 28px)`, top: `calc(50% + ${k.y * 38}px - 28px)` }} />
    </div>
  );
}