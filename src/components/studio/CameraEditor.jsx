import React from 'react';
import { RotateCcw, Trash2 } from 'lucide-react';
import StaticEditor from './StaticEditor';
import FollowEditor from './FollowEditor';

const MODES = [['static', 'Walk Up to Camera', 'Stationary'], ['follow', 'Follow from Distance', 'Tracks Krush']];

export default function CameraEditor({ engine, c, locked }) {
  const S = engine.studio;
  const edit = (fn) => S.editCamera(c.id, fn);
  return (
    <div className={`space-y-3 rounded-xl bg-white/5 p-3 ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
      <input value={c.name} onChange={(e) => edit((k) => { k.name = e.target.value; })} className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm font-semibold" />
      <div className="grid grid-cols-2 gap-1.5">
        {MODES.map(([m, l, sub]) => (
          <button key={m} onClick={() => edit((k) => { k.mode = m; })} className={`rounded-lg p-2 text-left ${c.mode === m ? 'bg-primary/20 border border-primary/50' : 'bg-white/5 hover:bg-white/10 border border-transparent'}`}>
            <p className="text-xs font-semibold">{l}</p><p className="text-[11px] text-muted-foreground">{sub}</p>
          </button>
        ))}
      </div>
      {c.mode === 'static' ? <StaticEditor engine={engine} c={c} edit={edit} /> : <FollowEditor c={c} edit={edit} />}
      <div className="flex gap-2 pt-1">
        <button onClick={() => edit((k, m) => { m.resetPose(k); if (k.mode === 'follow') m.lockFollow(k); })} className="flex-1 rounded-lg bg-white/5 hover:bg-white/10 py-2 text-xs flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Reset position</button>
        <button onClick={() => S.deleteCamera(c.id)} className="flex-1 rounded-lg bg-destructive/20 hover:bg-destructive/30 text-destructive py-2 text-xs flex items-center justify-center gap-1"><Trash2 className="w-3.5 h-3.5" />Delete camera</button>
      </div>
    </div>
  );
}