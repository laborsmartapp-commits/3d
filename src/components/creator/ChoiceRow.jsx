import React from 'react';

// A labelled row of pill choices (single or multi select).
export default function ChoiceRow({ label, options, value, onChange, multi }) {
  const opts = options.map((o) => (Array.isArray(o) ? o : [o, o]));
  const on = (k) => (multi ? (value || []).includes(k) : value === k);
  const tap = (k) => onChange(multi ? (on(k) ? value.filter((x) => x !== k) : [...(value || []), k]) : k);
  return (
    <div className="mb-3">
      <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {opts.map(([k, l]) => (
          <button key={k} type="button" onClick={() => tap(k)} aria-pressed={on(k)}
            className={`rounded-full px-2.5 py-1 text-[11px] border transition ${on(k) ? 'bg-primary text-primary-foreground border-primary' : 'border-white/10 hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}