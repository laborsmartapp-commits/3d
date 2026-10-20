import React, { useState } from 'react';
import { CheckCircle2, Loader2, XCircle, Circle, ChevronDown } from 'lucide-react';

const ICON = { done: [CheckCircle2, 'text-primary'], running: [Loader2, 'text-primary animate-spin'], failed: [XCircle, 'text-destructive'], pending: [Circle, 'text-quiet'] };
const List = ({ title, items, tone = 'text-muted-foreground' }) => (items?.length ? <div className="mt-1"><p className="font-semibold text-[10px] uppercase tracking-wide text-quiet">{title}</p>{items.map((t, i) => <p key={i} className={tone}>• {t}</p>)}</div> : null);

// One construction operation: status, timing, what was requested vs actually built, and why anything was not.
export default function OpRow({ op, live }) {
  const [open, setOpen] = useState(false);
  const status = live && op.status === 'pending' ? 'running' : op.status, [Icon, cls] = ICON[status] || ICON.pending;
  const issues = (op.not_built?.length || 0) + (op.substitutions?.length || 0);
  const has = issues || op.adjusted?.length || op.error || op.checks?.length || op.seconds;
  return (
    <div className="rounded-md bg-white/5 px-2 py-1 text-[11px]" data-testid={`op-${op.key}`} data-status={status}>
      <button onClick={() => has && setOpen(!open)} className="w-full flex items-center gap-1.5 text-left">
        <Icon className={`w-3.5 h-3.5 shrink-0 ${cls}`} />
        <span className="flex-1 truncate">{op.label}</span>
        {op.status === 'done' && op.kind !== 'validate' && <span className="text-quiet font-mono">{op.constructed}/{op.requested}</span>}
        {op.seconds != null && <span className="text-quiet font-mono">{Math.round(op.seconds)}s</span>}
        {issues > 0 && <span className="rounded bg-ember/20 text-ember px-1 text-[10px]">{issues}</span>}
        {has && <ChevronDown className={`w-3 h-3 text-quiet transition ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && (
        <div className="pl-5 pb-1">
          {op.error && <p className="text-destructive mt-1">{op.error} (attempt {op.attempts})</p>}
          {op.seconds != null && op.kind !== 'validate' && <p className="text-quiet mt-1">AI {op.seconds}s · prompt {op.in_chars?.toLocaleString()} chars · answer {op.out_chars?.toLocaleString()} chars · validated in {op.validate_ms} ms</p>}
          {op.split_reason && <p className="text-quiet">Split from a larger batch: {op.split_reason}</p>}
          <List title="Not built" items={op.not_built} tone="text-ember" />
          <List title="Substitutions" items={op.substitutions} />
          <List title="Adjusted" items={op.adjusted} />
          <List title="Checks" items={op.checks?.map((c) => `${c.status.toUpperCase()} · ${c.label}: ${c.detail}`)} />
        </div>
      )}
    </div>
  );
}