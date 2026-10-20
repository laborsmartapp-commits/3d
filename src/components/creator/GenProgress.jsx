import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle, X } from 'lucide-react';

// Live status of a stage request: real elapsed time (no fake percentage), or the error it returned.
export default function GenProgress({ job, onDismiss }) {
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(i); }, []);
  if (job.error) return (
    <div className="mb-3 rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs flex gap-2">
      <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
      <div className="flex-1"><p className="font-semibold">{job.label} failed</p><p className="text-muted-foreground mt-0.5">{job.error}</p>
</div>
      <button onClick={onDismiss} aria-label="Dismiss"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
  const s = Math.round((Date.now() - job.started) / 1000);
  const phase = !job.model ? 'Working' : s < 4 ? `Sending brief to ${job.model}` : 'AI is designing the blueprint; the server then validates it against the capability registry';
  return (
    <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs" data-testid="gen-progress">
      <p className="font-semibold flex items-center gap-2"><Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />{job.label} · {s}s</p>
      <p className="text-muted-foreground mt-1">{phase}.</p>
      <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden"><div className="h-full w-1/3 bg-primary animate-pulse" /></div>
      {job.model && <p className="text-quiet mt-2">A refinement usually takes 30–100 seconds.</p>}
    </div>
  );
}