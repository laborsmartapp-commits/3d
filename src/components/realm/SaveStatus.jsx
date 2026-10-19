import React from 'react';
import { Save, Loader2, Undo2, Redo2 } from 'lucide-react';

export default function SaveStatus({ R, r }) {
  const state = r.saving ? 'Saving…' : r.dirty ? 'Unsaved changes' : r.version ? 'Saved' : 'Not saved yet';
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 glass rounded-full pl-4 pr-1.5 py-1.5 flex items-center gap-2 text-sm">
      <span className="font-semibold truncate max-w-[160px]">{r.version?.name || 'Everyday House'}</span>
      <span className={`text-xs ${r.dirty ? 'text-ember' : 'text-muted-foreground'}`}>{state}</span>
      {r.sandbox && <span className="text-[10px] rounded-full bg-ember/20 text-ember px-2 py-0.5" title="Saves stay in this browser only, not the database">Test sandbox</span>}
      {r.mode === 'edit' && <>
        <button disabled={!r.canUndo} onClick={() => R.editor.undo()} title="Undo (Ctrl+Z)" className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30"><Undo2 className="w-4 h-4" /></button>
        <button disabled={!r.canRedo} onClick={() => R.editor.redo()} title="Redo (Ctrl+Y)" className="p-1.5 rounded-full hover:bg-white/10 disabled:opacity-30"><Redo2 className="w-4 h-4" /></button>
      </>}
      <button onClick={() => R.store.save()} disabled={r.saving} className="rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
        {r.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
      </button>
      {r.error && <span className="text-xs text-destructive max-w-[220px] truncate" title={r.error}>{r.error}</span>}
    </div>
  );
}