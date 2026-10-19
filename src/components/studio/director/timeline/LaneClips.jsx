import React from 'react';
import TimelineClip from '../TimelineClip';
import AudioClip from '../AudioClip';
import { overlaps } from '@/game/studio/Timeline';

// Clip lane for one timeline row (collapsed actors show every non-audio clip in one summary lane).
export default function LaneClips({ engine, d, row, ui, set, seek }) {
  const D = engine.studio.dir, zoom = ui.zoom, pick = (id) => set({ sel: id });
  if (row.type === 'audioHead') return <div className="h-5 border-t border-white/10" />;
  if (row.type === 'empty') return <div className="h-7 border-t border-white/5" />;
  const hl = row.track && ui.selTrack === row.track ? 'bg-primary/5' : '';
  if (row.type === 'audio') return (
    <div onPointerDown={seek} className={`h-7 relative border-t border-white/5 ${hl}`}>
      {d.clips.filter((c) => c.kind === 'audio' && c.track === row.audio).map((c) => (
        <AudioClip key={c.id} c={c} zoom={zoom} wz={ui.wz} selected={ui.sel === c.id} onSelect={() => pick(c.id)} onChange={(p) => { D.pause(); D.setClip(c.id, p); }} snap={(t, id) => D.place(t, id)} />
      ))}
    </div>
  );
  const a = row.actor;
  return (
    <div onPointerDown={seek} className={`h-7 relative border-t border-white/5 ${a.muted ? 'opacity-40' : ''} ${hl}`}>
      {d.clips.filter((c) => c.actor === a.id && (row.kind ? c.kind === row.kind : c.kind !== 'audio')).map((c) => (
        <TimelineClip key={c.id} c={c} zoom={zoom} selected={ui.sel === c.id} locked={a.locked} onSelect={() => pick(c.id)} onGrab={() => D.pause()}
          place={(t) => D.place(t, c.id)} overlapAt={(s) => overlaps(D.tl.clips, c, s).length > 0} onMove={(s) => D.moveClip(c.id, s)} />
      ))}
    </div>
  );
}