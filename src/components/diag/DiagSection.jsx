import React from 'react';

export default function DiagSection({ title, data, open = false }) {
  return (
    <details open={open} className="border-b border-white/10 py-1.5">
      <summary className="cursor-pointer font-semibold select-none">{title}</summary>
      <dl className="mt-1 grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5">
        {Object.entries(data || {}).map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-mono text-right break-all">{typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)}</dd>
          </React.Fragment>
        ))}
      </dl>
    </details>
  );
}