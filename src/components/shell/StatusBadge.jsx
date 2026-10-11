import React from 'react';

const TONES = {
  completed: 'bg-primary/15 text-primary', failed: 'bg-destructive/15 text-destructive',
  rendering: 'bg-accent/15 text-accent', encoding: 'bg-accent/15 text-accent', queued: 'bg-ember/15 text-ember',
  draft: 'bg-white/10 text-muted-foreground', in_production: 'bg-accent/15 text-accent', review: 'bg-ember/15 text-ember',
  archived: 'bg-white/5 text-quiet', captured: 'bg-primary/15 text-primary', capturing: 'bg-ember/15 text-ember', uploading: 'bg-ember/15 text-ember',
};

export default function StatusBadge({ status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${TONES[status] || 'bg-white/10'}`}>{(status || 'unknown').replace('_', ' ')}</span>;
}