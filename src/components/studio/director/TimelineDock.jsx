import React, { useState } from 'react';
import DirectorTransport from './DirectorTransport';
import TimelineClip from './TimelineClip';
import ClipInspector from './ClipInspector';
import AddLibraryActor from './AddLibraryActor';
import AudioClip from './AudioClip';
import AudioInspector from './AudioInspector';
import AddAudio from './AddAudio';
import BeatBar from './BeatBar';
import { AUDIO_TRACKS } from '@/game/studio/AudioEngine';

const ROWS = [['perf', 'Movement'], ['anim', 'Body Anim']];

// Bottom multilayer timeline: one master clock for every actor lane and every audio track.
export default function TimelineDock({ engine, st, open, setOpen }) {
  const d = st.director, D = engine.studio.dir;
  const [zoom, setZoom] = useState(40), [sel, setSel] = useState(null), [wz, setWz] = useState(1.5);
  const W = d.duration * zoom, clip = d.clips.find((c) => c.id === sel), free = st.status === 'idle';
  const seek = (e) => { const r = e.currentTarget.getBoundingClientRect(); D.seek((e.clientX - r.left) / zoom); };
  const beats = d.bpm > 0 && zoom * (60 / d.bpm) >= 6 ? Array.from({ length: Math.floor((d.duration - d.beat_offset) * d.bpm / 60) + 1 }, (_, i) => d.beat_offset + (i * 60) / d.bpm).filter((b) => b >= 0) : [];
  return (
    <div className={`absolute bottom-0 inset-x-0 z-20 glass rounded-t-2xl ${st.active ? 'md:mr-[520px]' : ''}`}>
      <DirectorTransport engine={engine} st={st} d={d} zoom={zoom} setZoom={setZoom} open={open} setOpen={setOpen} />
      {(st.error || st.notice) && <p className={`px-3 py-1 text-[11px] ${st.error ? 'text-destructive' : 'text-primary'}`}>{st.error || st.notice}</p>}
      {open && <BeatBar engine={engine} d={d} wz={wz} setWz={setWz} free={free} />}
      {open && (
        <div className="flex max-h-64 overflow-y-auto">
          <div className="w-28 shrink-0 text-[11px]">
            <div className="h-5" />
            {d.actors.map((a) => ROWS.map(([k, l]) => (
              <div key={a.id + k} className={`h-7 px-2 flex items-center truncate border-t border-white/5 ${a.id === d.controlled ? 'text-primary' : ''}`}>{k === 'perf' ? <button onClick={() => { D.control(a.id); if (!a.armed) D.setActor(a.id, { armed: true }); }} disabled={st.status === 'capturing'} title="Control this character" className="truncate font-bold hover:text-primary text-left">{a.name}</button> : <span className="text-muted-foreground">{l}</span>}</div>
            )))}
            <AddLibraryActor engine={engine} disabled={!free || !st.scene} />
            <div className="h-5 px-2 flex items-center text-[9px] tracking-widest text-sky-300 border-t border-white/10">AUDIO</div>
            {AUDIO_TRACKS.map(([k, l]) => (
              <div key={k} className="h-7 px-2 flex items-center gap-1 border-t border-white/5 text-muted-foreground"><span className="truncate">{l}</span><AddAudio engine={engine} track={k} disabled={!free || !st.scene} /></div>
            ))}
          </div>
          <div className="flex-1 overflow-x-auto">
            <div className="relative" style={{ width: W + 40 }}>
              <div onPointerDown={seek} className="h-5 relative cursor-pointer text-[9px] text-muted-foreground">
                {Array.from({ length: Math.floor(d.duration) + 1 }, (_, i) => i).filter((i) => zoom >= 20 || i % 5 === 0).map((i) => <span key={i} className="absolute top-0.5 border-l border-white/20 pl-0.5" style={{ left: i * zoom }}>{i}s</span>)}
              </div>
              {d.actors.map((a) => ROWS.map(([k]) => (
                <div key={a.id + k} onPointerDown={seek} className={`h-7 relative border-t border-white/5 ${a.muted ? 'opacity-40' : ''}`}>
                  {d.clips.filter((c) => c.actor === a.id && c.kind === k).map((c) => (
                    <TimelineClip key={c.id} c={c} zoom={zoom} selected={sel === c.id} locked={a.locked} onSelect={() => setSel(c.id)}
                      onMove={(s) => { const start = D.snap(s); D.setClip(c.id, k === 'anim' ? { start, end: +(start + c.end - c.start).toFixed(3) } : { start }); }} />
                  ))}
                </div>
              )))}
              <div className="h-7 border-t border-white/5" />
              <div className="h-5 border-t border-white/10" />
              {AUDIO_TRACKS.map(([k]) => (
                <div key={k} onPointerDown={seek} className="h-7 relative border-t border-white/5">
                  {d.clips.filter((c) => c.kind === 'audio' && c.track === k).map((c) => (
                    <AudioClip key={c.id} c={c} zoom={zoom} wz={wz} selected={sel === c.id} onSelect={() => setSel(c.id)} onChange={(p) => D.setClip(c.id, p)} snap={(t, id) => D.snap(t, id)} />
                  ))}
                </div>
              ))}
              {beats.map((b, i) => <div key={i} className="absolute top-5 bottom-0 w-px bg-white/10 pointer-events-none" style={{ left: b * zoom }} />)}
              {d.markers.map((m, i) => <div key={'m' + i} className="absolute top-0 bottom-0 w-px bg-sky-400/70 pointer-events-none" style={{ left: m * zoom }} />)}
              <div className="absolute top-0 bottom-0 w-px bg-destructive pointer-events-none" style={{ left: d.t * zoom }} />
              {d.stopAt != null && <div className="absolute top-0 bottom-0 w-px bg-ember/70 pointer-events-none" style={{ left: d.stopAt * zoom }} />}
            </div>
          </div>
        </div>
      )}
      {open && clip && (clip.kind === 'audio' ? <AudioInspector engine={engine} c={clip} actors={d.actors} /> : <ClipInspector engine={engine} c={clip} />)}
    </div>
  );
}