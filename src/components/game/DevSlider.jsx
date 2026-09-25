import React, { useState } from 'react';

export default function DevSlider({ label, min, max, step = 0.01, get, set, fmt = (v) => Number(v).toFixed(2) }) {
  const [v, setV] = useState(get());
  return (
    <label className="block py-1.5">
      <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">{label}</span><span className="tabular-nums">{fmt(v)}</span></div>
      <input type="range" className="game-range" min={min} max={max} step={step} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); set(n); }} />
    </label>
  );
}