import React, { useEffect, useState } from 'react';

// Numeric input that commits on Enter or blur (one undo step per edit).
export default function NumField({ label, value, onCommit, step = 0.05, disabled }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  const commit = () => { const n = parseFloat(v); if (Number.isFinite(n) && n !== value) onCommit(n); else setV(String(value)); };
  return (
    <label className="flex items-center gap-1 rounded-md bg-white/5 border border-white/10 px-1.5 py-1 text-xs">
      <span className="text-quiet w-3">{label}</span>
      <input type="number" step={step} disabled={disabled} value={v} onChange={(e) => setV(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className="w-full bg-transparent outline-none tabular-nums" />
    </label>
  );
}