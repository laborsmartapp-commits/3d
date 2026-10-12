import React, { useState } from 'react';
import { UserPlus, Sparkles } from 'lucide-react';
import { CHARACTERS, ANIMATIONS } from '@/game/studio/characters';
import ActorRow from './ActorRow';
import AnimSelect from './AnimSelect';

export default function DirectorTab({ engine, st }) {
  const d = st.director, D = engine.studio.dir, busy = st.status !== 'idle';
  const [anim, setAnim] = useState({ anim: 'dance' }), [len, setLen] = useState(4), [who, setWho] = useState('');
  if (!st.scene) return <p className="text-sm text-muted-foreground">Open or create a scene first. Its actors and timeline are saved with the scene.</p>;
  const target = d.actors.find((a) => a.id === who) ? who : d.controlled;
  return (
    <div className="space-y-5">
      <section>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Character Library</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(CHARACTERS).filter(([k]) => k !== 'krush').map(([k, c]) => (
            <button key={k} onClick={() => D.addActor(k)} disabled={busy} className="flex items-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-2 py-2 text-sm disabled:opacity-40">
              <span className="w-6 h-6 rounded-full border border-white/20" style={{ background: `linear-gradient(135deg, ${c.colors.shirt}, ${c.colors.accent})` }} />
              {c.name}<UserPlus className="w-3.5 h-3.5 ml-auto text-muted-foreground" />
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5">New actors appear beside the character you control. Walk them somewhere and press the pin to save their start spot.</p>
      </section>
      <section>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Actors in Scene</h4>
        <div className="space-y-1.5">{d.actors.map((a) => <ActorRow key={a.id} engine={engine} a={a} controlled={a.id === d.controlled} busy={busy} />)}</div>
        <p className="text-[11px] text-muted-foreground mt-1.5">Arm one actor, set the playhead, then Record. Every other actor replays its own track at the same time.</p>
      </section>
      <section>
        <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Schedule Animation at Playhead</h4>
        <div className="flex flex-wrap gap-2 items-center text-sm">
          <select value={target} onChange={(e) => setWho(e.target.value)} className="bg-white/5 rounded-md px-2 py-1.5">{d.actors.map((a) => <option key={a.id} value={a.id} className="bg-card">{a.name}</option>)}</select>
          <AnimSelect c={anim} set={(p) => setAnim({ ...anim, ...p })} />
          <input type="number" min="0.5" step="0.5" value={len} onChange={(e) => setLen(+e.target.value)} className="w-16 bg-white/5 rounded-md px-2 py-1.5" />s
          <button onClick={() => D.addAnim(target, anim, len)} disabled={busy} className="rounded-md bg-accent text-accent-foreground px-3 py-1.5 text-xs font-semibold flex items-center gap-1 disabled:opacity-40"><Sparkles className="w-3.5 h-3.5" />Add at {d.t.toFixed(1)}s</button>
        </div>
      </section>
    </div>
  );
}