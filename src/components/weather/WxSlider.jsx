import React from 'react';

// One labelled range control for a weather value.
export default function WxSlider({ label, value, min = 0, max = 1, step = 0.01, onChange, show, disabled }) {
  return (
    <label className={`block text-xs ${disabled ? 'opacity-50' : ''}`}>
      <span className="flex justify-between text-quiet"><span>{label}</span><span className="tabular-nums text-foreground">{show ? show(value) : `${Math.round(value * 100)}%`}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled} onChange={(e) => onChange(+e.target.value)} className="game-range" />
    </label>
  );
}