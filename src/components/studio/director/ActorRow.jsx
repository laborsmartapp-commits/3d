import React from 'react';
import { Gamepad2, Circle, Lock, Unlock, Eye, EyeOff, MapPin, Trash2 } from 'lucide-react';

const I = 'h-7 w-7 rounded-md flex items-center justify-center hover:bg-white/10 disabled:opacity-30';

export default function ActorRow({ engine, a, controlled, busy }) {
  const D = engine.studio.dir;
  return (
    <div className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${controlled ? 'bg-primary/15 ring-1 ring-primary/40' : 'bg-white/5'}`}>
      <span className="flex-1 text-sm font-medium truncate">{a.name}</span>
      <button onClick={() => D.control(a.id)} disabled={controlled || busy} className={`h-7 px-2 rounded-md text-[11px] font-semibold flex items-center gap-1 ${controlled ? 'text-primary' : 'bg-white/10 hover:bg-white/20'}`}>
        <Gamepad2 className="w-3.5 h-3.5" />{controlled ? 'In control' : 'Take control'}
      </button>
      <button title="Record arm" onClick={() => D.setActor(a.id, { armed: !a.armed })} disabled={busy} className={I}><Circle className={`w-3.5 h-3.5 ${a.armed ? 'fill-destructive text-destructive' : ''}`} /></button>
      <button title={a.locked ? 'Unlock track' : 'Lock track'} onClick={() => D.setActor(a.id, { locked: !a.locked })} disabled={busy} className={I}>{a.locked ? <Lock className="w-3.5 h-3.5 text-ember" /> : <Unlock className="w-3.5 h-3.5" />}</button>
      <button title={a.muted ? 'Enable playback' : 'Mute (freeze) track'} onClick={() => D.setActor(a.id, { muted: !a.muted })} disabled={busy} className={I}>{a.muted ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}</button>
      <button title="Save current position as start placement" onClick={() => D.placeHere(a.id)} disabled={busy || a.id === 'krush'} className={I}><MapPin className="w-3.5 h-3.5" /></button>
      <button title="Remove from scene" onClick={() => D.removeActor(a.id)} disabled={busy || a.id === 'krush' || controlled} className={I}><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}