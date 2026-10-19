import React from 'react';
import { ChevronDown, ChevronRight, Video } from 'lucide-react';
import { ACTOR_ROWS } from './timelineUI';
import { AUDIO_TRACKS } from '@/game/studio/AudioEngine';

// Every track group in one list; expanding/collapsing here changes the lanes shown in the timeline.
export default function TracksPop({ d, ui, set }) {
  const groups = [
    ...d.actors.map((a) => ({ id: a.id, name: a.name, tracks: ACTOR_ROWS.length, clips: d.clips.filter((c) => c.actor === a.id && c.kind !== 'audio').length })),
    { id: 'audio', name: 'Audio', tracks: AUDIO_TRACKS.length, clips: d.clips.filter((c) => c.kind === 'audio').length },
  ];
  const all = (v) => set({ collapsed: Object.fromEntries(groups.map((g) => [g.id, v])) });
  return (
    <div className="space-y-1.5 text-xs">
      <div className="flex gap-1.5">
        <button onClick={() => all(false)} className="flex-1 h-7 rounded-md bg-white/10 hover:bg-white/20">Expand all</button>
        <button onClick={() => all(true)} className="flex-1 h-7 rounded-md bg-white/10 hover:bg-white/20">Collapse all</button>
      </div>
      {groups.map((g) => (
        <button key={g.id} onClick={() => set({ collapsed: { ...ui.collapsed, [g.id]: !ui.collapsed[g.id] } })} className="w-full rounded-lg bg-white/5 hover:bg-white/10 px-2 py-1.5 flex items-center gap-1.5 text-left">
          {ui.collapsed[g.id] ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          <span className={`flex-1 truncate font-semibold ${g.id === 'audio' ? 'text-sky-300' : ''}`}>{g.name}</span>
          <span className="text-muted-foreground">{g.tracks} tracks · {g.clips} clips</span>
        </button>
      ))}
      <div className="rounded-lg bg-white/5 px-2 py-1.5 flex items-center gap-1.5 text-muted-foreground"><Video className="w-3.5 h-3.5" />Camera: recorded with each take, no editable lane yet</div>
    </div>
  );
}