import React from 'react';
import NumField from './NumField';

const r2 = (v) => Math.round(v * 100) / 100, deg = (v) => Math.round((v * 180) / Math.PI);

export default function TransformFields({ o, ed }) {
  const L = o.locked, set = (f) => (v) => ed.setField(f, v), setDeg = (f) => (v) => ed.setField(f, (v * Math.PI) / 180);
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-quiet">Position (m)</p>
      <div className="grid grid-cols-3 gap-1.5">{['x', 'y', 'z'].map((f) => <NumField key={f} label={f.toUpperCase()} value={r2(o[f])} onCommit={set(f)} disabled={L} />)}</div>
      <p className="text-[11px] uppercase tracking-wider text-quiet">Rotation (°)</p>
      <div className="grid grid-cols-3 gap-1.5">{['rx', 'ry', 'rz'].map((f) => <NumField key={f} label={f[1].toUpperCase()} step={5} value={deg(o[f] || 0)} onCommit={setDeg(f)} disabled={L} />)}</div>
      <p className="text-[11px] uppercase tracking-wider text-quiet">Scale</p>
      <div className="grid grid-cols-3 gap-1.5">{['sx', 'sy', 'sz'].map((f) => <NumField key={f} label={f[1].toUpperCase()} step={0.05} value={r2(o[f] ?? 1)} onCommit={set(f)} disabled={L} />)}</div>
    </div>
  );
}