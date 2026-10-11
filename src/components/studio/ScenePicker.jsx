import React, { useEffect, useState } from 'react';
import { Plus, Clapperboard, Loader2 } from 'lucide-react';

export default function ScenePicker({ engine, st }) {
  const S = engine.studio;
  const [scenes, setScenes] = useState(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { S.listScenes().then(setScenes); }, [st.scene?.id, S]);
  const create = async () => { setBusy(true); await S.newScene(name.trim()); setName(''); setBusy(false); };

  return (
    <div className="space-y-4">
      {st.scene && (
        <div className="rounded-xl bg-white/5 p-3 space-y-2">
          <p className="text-[11px] text-muted-foreground">Scene name</p>
          <input value={st.scene.name} onChange={(e) => S.renameScene(e.target.value)} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
          <p className="text-xs text-muted-foreground">World: Celestia Grotto · Location: {st.scene.location}</p>
        </div>
      )}
      <div className="flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Scene 014 — Krush Walking Home" className="flex-1 rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm" />
        <button disabled={busy || st.status !== 'idle'} onClick={create} className="rounded-lg bg-primary text-primary-foreground px-3 text-sm font-semibold flex items-center gap-1 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}New Scene
        </button>
      </div>
      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">Your scenes</p>
        {!scenes && <Loader2 className="w-4 h-4 animate-spin" />}
        {scenes?.length === 0 && <p className="text-sm text-muted-foreground">No scenes yet. Create one to start placing cameras.</p>}
        {scenes?.map((s) => (
          <button key={s.id} disabled={st.status !== 'idle'} onClick={() => S.openScene(s)} className={`w-full text-left rounded-lg px-3 py-2 flex items-center gap-2 text-sm ${st.scene?.id === s.id ? 'bg-primary/20 border border-primary/40' : 'bg-white/5 hover:bg-white/10'}`}>
            <Clapperboard className="w-4 h-4 text-primary" /><span className="flex-1 truncate">{s.name}</span>
            <span className="text-[11px] text-muted-foreground">{(s.cameras || []).length} cams · {s.take_count || 0} takes</span>
          </button>
        ))}
      </div>
    </div>
  );
}