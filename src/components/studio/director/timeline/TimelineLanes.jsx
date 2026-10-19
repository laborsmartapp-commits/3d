import React from 'react';
import LaneLabel from './LaneLabel';
import LaneClips from './LaneClips';
import { ACTOR_ROWS } from './timelineUI';
import { AUDIO_TRACKS } from '@/game/studio/AudioEngine';

// Ruler + clip lanes for the active view: Characters → actor lanes, Audio → audio lanes, otherwise everything.
export default function TimelineLanes({ engine, st, d, ui, set }) {
  const D = engine.studio.dir, zoom = ui.zoom, col = ui.collapsed;
  const seek = (e) => { const r = e.currentTarget.getBoundingClientRect(); D.seek((e.clientX - r.left) / zoom); };
  const beats = d.bpm > 0 && zoom * (60 / d.bpm) >= 6 ? Array.from({ length: Math.floor((d.duration - d.beat_offset) * d.bpm / 60) + 1 }, (_, i) => d.beat_offset + (i * 60) / d.bpm).filter((b) => b >= 0) : [];
  const rows = [];
  if (ui.view !== 'audio') {
    if (!d.actors.length) rows.push({ key: 'empty', type: 'empty' });
    d.actors.forEach((a) => {
      if (col[a.id]) rows.push({ key: a.id + 'all', type: 'actor', actor: a, kind: null, first: true, track: `${a.id}:perf` });
      else ACTOR_ROWS.forEach(([k, l], i) => rows.push({ key: a.id + k, type: 'actor', actor: a, kind: k, label: l, first: i === 0, track: `${a.id}:${k}` }));
    });
  }
  if (ui.view !== 'characters') {
    rows.push({ key: 'audio-head', type: 'audioHead' });
    if (!col.audio) AUDIO_TRACKS.forEach(([k, l]) => rows.push({ key: 'a-' + k, type: 'audio', audio: k, label: l, track: `audio:${k}` }));
  }
  const p = { engine, st, d, ui, set };
  return (
    <div className="flex-1 min-h-0 flex overflow-y-auto" data-tl-lanes>
      <div className="w-28 md:w-40 shrink-0 text-[11px]">
        <div className="h-5" />
        {rows.map((r) => <LaneLabel key={r.key} row={r} {...p} />)}
      </div>
      <div className="flex-1 min-w-0 overflow-x-auto">
        <div className="relative" style={{ width: d.duration * zoom + 40 }}>
          <div onPointerDown={seek} className="h-5 relative cursor-pointer text-[9px] text-muted-foreground">
            {Array.from({ length: Math.floor(d.duration) + 1 }, (_, i) => i).filter((i) => zoom >= 20 || i % 5 === 0).map((i) => <span key={i} className="absolute top-0.5 border-l border-white/20 pl-0.5" style={{ left: i * zoom }}>{i}s</span>)}
          </div>
          {rows.map((r) => <LaneClips key={r.key} row={r} seek={seek} {...p} />)}
          {beats.map((b, i) => <div key={i} className="absolute top-5 bottom-0 w-px bg-white/10 pointer-events-none" style={{ left: b * zoom }} />)}
          {d.markers.map((m, i) => <div key={'m' + i} className="absolute top-0 bottom-0 w-px bg-sky-400/70 pointer-events-none" style={{ left: m * zoom }} />)}
          <div className="absolute top-0 bottom-0 w-px bg-destructive pointer-events-none" style={{ left: d.t * zoom }} />
          {d.stopAt != null && <div className="absolute top-0 bottom-0 w-px bg-ember/70 pointer-events-none" style={{ left: d.stopAt * zoom }} />}
        </div>
      </div>
    </div>
  );
}