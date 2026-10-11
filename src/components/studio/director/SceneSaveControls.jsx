import React from 'react';
import { Save, Clapperboard, Loader2 } from 'lucide-react';

const STATE = { saving: ['Saving…', 'text-muted-foreground'], saved: ['Saved', 'text-primary'], unsaved: ['Unsaved changes', 'text-ember'], error: ['Save failed, retrying', 'text-destructive'] };
const B = 'h-8 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition disabled:opacity-40';

// Save Scene keeps the editable timeline; Finalize Take bakes every actor track into one new take.
export default function SceneSaveControls({ engine, st }) {
  const S = engine.studio, [label, cls] = STATE[st.saveState] || STATE.saved, finalizing = st.status === 'finalizing';
  const hasPerf = st.director.clips.some((c) => c.kind === 'perf');
  return (
    <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-white/10">
      <span className={`text-[11px] hidden lg:inline ${cls}`}>{label}</span>
      <button onClick={() => S.saveScene()} disabled={st.status === 'capturing' || st.saveState === 'saving'} className={`${B} bg-white/10 hover:bg-white/20`}><Save className="w-3.5 h-3.5" />Save Scene</button>
      <button onClick={() => S.finalizeTake()} disabled={st.status !== 'idle' || !hasPerf} title={hasPerf ? 'Create one take with every actor' : 'Record a performance first'} className={`${B} bg-primary text-primary-foreground`}>
        {finalizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}{finalizing ? 'Finalizing…' : 'Finalize Take'}
      </button>
    </div>
  );
}