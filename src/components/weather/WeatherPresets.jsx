import React, { useEffect, useState } from 'react';
import { Trash2, Loader2, Save } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { describe } from '@/game/weather/state';

// Named weather snapshots. Saved on their own, so every preset works on every stage.
export default function WeatherPresets({ weather, stageId, disabled }) {
  const [list, setList] = useState(null), [name, setName] = useState(''), [busy, setBusy] = useState(false);
  const refresh = () => base44.entities.WeatherPreset.filter({}, { sort: '-created_date', limit: 50 }).then((p) => setList(p.items));
  useEffect(() => { refresh(); }, []);
  const save = async () => {
    setBusy(true);
    const state = weather.save();
    await base44.entities.WeatherPreset.create({ name: name.trim() || describe(state), state, summary: describe(state), stage_id: stageId });
    setName(''); await refresh(); setBusy(false);
  };
  const remove = async (id) => { await base44.entities.WeatherPreset.delete(id); refresh(); };
  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Preset name" className="flex-1 min-w-0 rounded-md bg-white/5 border border-white/10 px-2 py-1 text-xs" />
        <button onClick={save} disabled={busy} className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-xs flex items-center gap-1 disabled:opacity-50">{busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}Save</button>
      </div>
      {!list ? <p className="text-[11px] text-quiet">Loading presets…</p> : !list.length ? <p className="text-[11px] text-quiet">No presets yet. Save the current weather to reuse it on any stage.</p> : (
        <div className="space-y-1">
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-1 rounded-md bg-white/5 px-2 py-1">
              <button disabled={disabled} onClick={() => weather.load(p.state)} className="flex-1 min-w-0 text-left disabled:opacity-50">
                <p className="text-xs truncate">{p.name}</p><p className="text-[10px] text-quiet truncate">{p.summary}</p>
              </button>
              <button onClick={() => remove(p.id)} aria-label="Delete preset" className="p-1 rounded hover:bg-white/10 text-quiet"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}