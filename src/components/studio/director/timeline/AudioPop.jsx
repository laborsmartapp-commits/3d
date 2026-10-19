import React from 'react';
import TrackControls from '../TrackControls';
import MicRecord from '../MicRecord';
import AddAudio from '../AddAudio';
import { AUDIO_TRACKS } from '@/game/studio/AudioEngine';

// Audio tracks: master level, per-track mute/solo/gain, add clips, mic recording, waveform zoom.
export default function AudioPop({ engine, st, d, ui, set }) {
  const D = engine.studio.dir, free = st.status === 'idle';
  return (
    <div className="space-y-1.5 text-xs">
      <label className="flex items-center gap-2 text-muted-foreground">Master
        <input type="range" min="0" max="1.5" step="0.05" value={d.master_gain} disabled={!free} onChange={(e) => D.setTl({ master_gain: +e.target.value })} className="flex-1 accent-primary" />
        <span className="w-9 text-right tabular-nums">{Math.round(d.master_gain * 100)}%</span>
      </label>
      {AUDIO_TRACKS.map(([k, l]) => {
        const n = d.clips.filter((c) => c.kind === 'audio' && c.track === k).length, id = `audio:${k}`;
        return (
          <div key={k} data-audio-track={k} className={`rounded-lg px-2 py-1.5 flex items-center gap-1.5 ${ui.selTrack === id ? 'bg-primary/10 ring-1 ring-primary/40' : 'bg-white/5'}`}>
            <button onClick={() => set({ selTrack: id })} className="flex-1 min-w-0 text-left truncate">{l}<span className="text-muted-foreground"> · {n}</span></button>
            <TrackControls engine={engine} track={k} t={d.tracks?.[k]} disabled={!free} />
            {k === 'dialogue' && <MicRecord engine={engine} disabled={!st.scene || st.status === 'capturing'} />}
            <AddAudio engine={engine} track={k} disabled={!free || !st.scene} />
          </div>
        );
      })}
      <label className="flex items-center gap-2 text-muted-foreground pt-1">Waveform
        <input type="range" min="0.5" max="6" step="0.5" value={ui.wz} onChange={(e) => set({ wz: +e.target.value })} className="flex-1 accent-primary" />
      </label>
    </div>
  );
}