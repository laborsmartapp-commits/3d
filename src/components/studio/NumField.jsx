import React from 'react';

export default function NumField({ label, value, step = 0.5, min, max, suffix, onChange }) {
  const set = (v) => { let n = Number(v); if (Number.isNaN(n)) return; if (min !== undefined) n = Math.max(min, n); if (max !== undefined) n = Math.min(max, n); onChange(n); };
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <div className="flex items-center rounded-lg bg-white/5 border border-white/10">
        <button type="button" onClick={() => set(+(value - step).toFixed(3))} className="px-2 py-1.5 text-sm hover:bg-white/10 rounded-l-lg">−</button>
        <input type="number" step={step} value={+Number(value).toFixed(2)} onChange={(e) => set(e.target.value)} className="w-full min-w-0 bg-transparent text-center text-sm py-1.5 outline-none" />
        {suffix && <span className="text-[10px] text-muted-foreground pr-1">{suffix}</span>}
        <button type="button" onClick={() => set(+(value + step).toFixed(3))} className="px-2 py-1.5 text-sm hover:bg-white/10 rounded-r-lg">+</button>
      </div>
    </label>
  );
}