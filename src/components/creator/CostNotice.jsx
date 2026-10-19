import React from 'react';
import { Info } from 'lucide-react';

// Credit information we can state truthfully: which model, that it costs more than the default, which actions are free.
export default function CostNotice() {
  return (
    <div className="rounded-lg bg-white/5 p-2.5 text-[11px] text-muted-foreground flex gap-2">
      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary" />
      <p>Generate, Variation and Refine each make one AI call with the chosen model. Both models use more integration credits than the default AI; the exact amount depends on the length of the brief and the blueprint and is not known in advance. Duplicate, Save as Version and material swaps use no AI credits.</p>
    </div>
  );
}