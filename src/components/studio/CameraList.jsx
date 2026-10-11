import React from 'react';
import { Plus, Video } from 'lucide-react';
import CameraEditor from './CameraEditor';

export default function CameraList({ engine, st }) {
  const S = engine.studio;
  if (!st.scene) return <p className="text-sm text-muted-foreground">Create or open a scene first.</p>;
  const sel = st.cameras.find((c) => c.id === st.selId);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {st.cameras.map((c) => (
          <button key={c.id} onClick={() => S.selectCamera(c.id)} className={`rounded-full px-3 py-1.5 text-xs flex items-center gap-1.5 ${c.id === st.selId ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>
            <Video className="w-3.5 h-3.5" />{c.name}{c.id === st.recCamId && <span className="w-1.5 h-1.5 rounded-full bg-destructive" />}
          </button>
        ))}
        <button onClick={() => S.addCamera()} className="rounded-full px-3 py-1.5 text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20"><Plus className="w-3.5 h-3.5" />Add Camera</button>
      </div>
      {sel ? <CameraEditor key={sel.id} engine={engine} c={sel} locked={sel.id === st.recCamId} /> : <p className="text-sm text-muted-foreground">Add a camera to begin.</p>}
    </div>
  );
}