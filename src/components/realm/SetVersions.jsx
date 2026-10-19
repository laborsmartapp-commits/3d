import React, { useState } from 'react';
import { Check, Trash2, Plus, RotateCcw, Loader2 } from 'lucide-react';
import { TEMPLATES } from '@/game/realm/templates';
import RealmPanel from './RealmPanel';

// Named set configurations (Everyday House, Christmas Interior, Backyard Party...). Switching restores
// the saved furniture, lights and view without rebuilding the house.
export default function SetVersions({ R, r, onClose }) {
  const [name, setName] = useState('');
  const S = R.store, guard = (fn) => () => { if (r.dirty && !window.confirm('Discard unsaved changes to the current set?')) return; fn(); };
  return (
    <RealmPanel title="Set Versions" onClose={onClose}>
      {r.saving && <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2"><Loader2 className="w-3 h-3 animate-spin" />Working…</p>}
      <div className="space-y-1.5 mb-4">
        {!r.versions.length && <p className="text-xs text-muted-foreground">No saved versions yet. Press Save to store the current layout as “Everyday House”.</p>}
        {r.versions.map((v) => (
          <div key={v.id} className={`rounded-lg px-2.5 py-2 flex items-center gap-2 text-sm ${v.active ? 'bg-primary/15 border border-primary/40' : 'bg-white/5'}`}>
            <div className="flex-1 min-w-0"><p className="truncate font-semibold">{v.name}</p><p className="text-[11px] text-quiet">{v.count ?? '—'} objects</p></div>
            {v.active ? <Check className="w-4 h-4 text-primary" /> : <button onClick={guard(() => S.activate(v.id))} className="rounded-md bg-white/10 hover:bg-white/20 px-2 py-1 text-xs">Switch</button>}
            {!v.active && <button onClick={() => window.confirm(`Delete “${v.name}”?`) && S.remove(v.id)} className="p-1 text-quiet hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
          </div>
        ))}
      </div>
      <p className="text-xs text-quiet mb-1">Save current layout as a new version</p>
      <div className="flex gap-1.5 mb-4"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Family Dinner" className="flex-1 rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-sm outline-none focus:border-primary" /><button disabled={!name.trim()} onClick={() => { S.saveAs(name.trim()); setName(''); }} className="rounded-lg bg-primary text-primary-foreground px-2.5 disabled:opacity-40"><Plus className="w-4 h-4" /></button></div>
      <p className="text-xs text-quiet mb-1">Start a version from a template</p>
      <div className="grid gap-1.5 mb-4">{Object.entries(TEMPLATES).map(([k, t]) => <button key={k} onClick={guard(() => S.fromTemplate(k))} className="rounded-lg bg-white/5 hover:bg-white/10 px-2.5 py-2 text-sm text-left">{t.name}</button>)}</div>
      <button disabled={!r.dirty} onClick={() => S.revert()} className="w-full rounded-lg bg-white/5 hover:bg-white/10 py-2 text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"><RotateCcw className="w-3.5 h-3.5" />Discard unsaved changes</button>
    </RealmPanel>
  );
}