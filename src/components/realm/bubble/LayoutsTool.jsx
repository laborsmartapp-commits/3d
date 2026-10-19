import React from 'react';
import { Save, Loader2 } from 'lucide-react';
import ToolPanel from './ToolPanel';
import SetVersions from '../SetVersions';

export default function LayoutsTool({ R, r, onClose }) {
  const state = r.saving ? 'Saving…' : r.dirty ? 'Unsaved changes' : r.version ? 'Saved' : 'Not saved yet';
  return (
    <ToolPanel title="Layouts" subtitle="Named set configurations" error={r.error} onClose={onClose}>
      <div className="rounded-xl bg-white/5 p-3 mb-4 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{r.version?.name || 'Everyday House'}</p>
          <p className={`text-[11px] ${r.dirty ? 'text-ember' : 'text-muted-foreground'}`}>{state}{r.sandbox && ' · Test sandbox (this browser only)'}</p>
        </div>
        <button onClick={() => R.store.save()} disabled={r.saving} className="rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-60">
          {r.saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}Save
        </button>
      </div>
      <SetVersions R={R} r={r} />
    </ToolPanel>
  );
}