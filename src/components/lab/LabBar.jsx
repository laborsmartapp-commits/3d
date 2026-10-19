import React, { useState } from 'react';
import { FlaskConical, Plus, Trash2, Loader2 } from 'lucide-react';
import { createLabScene, deleteLabScene } from '@/game/lab/labScene';

// Top-left lab controls: create or remove the throwaway test scene.
export default function LabBar({ engine, st }) {
  const [busy, setBusy] = useState(false), S = engine.studio;
  const run = (fn) => async () => { setBusy(true); try { await fn(S); } catch (err) { engine.notify(err.message); } setBusy(false); };
  const B = 'h-8 px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40';
  return (
    <div className="absolute top-4 left-4 z-20 glass rounded-full pl-3 pr-1.5 py-1.5 flex items-center gap-2 text-xs">
      <FlaskConical className="w-3.5 h-3.5 text-primary" /><span className="font-heading tracking-wide">Timeline Lab</span>
      <span className="text-muted-foreground hidden sm:inline">{st.scene ? st.scene.name : 'No scene'}</span>
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {st.scene
        ? <button data-lab-delete onClick={run(deleteLabScene)} disabled={busy || st.status !== 'idle'} className={`${B} bg-white/10 hover:bg-white/20`}><Trash2 className="w-3.5 h-3.5" />Delete lab scene</button>
        : <button data-lab-create onClick={run(createLabScene)} disabled={busy} className={`${B} bg-primary text-primary-foreground`}><Plus className="w-3.5 h-3.5" />Create lab scene</button>}
    </div>
  );
}