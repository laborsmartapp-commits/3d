import React, { useState } from 'react';
import TimelineDock from './director/TimelineDock';
import { Circle, Square, Eye, EyeOff, PictureInPicture2, Save, Trash2, Loader2, Video, RefreshCw } from 'lucide-react';

const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const LABEL = { capturing: 'Capturing Performance', uploading: 'Uploading Performance', review: 'Performance Captured', pending: 'Pending upload — not saved yet', playing: 'Playback', loading: 'Loading take', saving: 'Saving preview video', directing: 'Director playback' };

export default function StudioBar({ engine, st, timeline = true }) {
  const S = engine.studio, cam = st.cameras.find((c) => c.id === (st.recCamId || st.selId));
  const btn = 'h-9 px-3 rounded-full flex items-center gap-1.5 text-xs font-semibold transition';
  const idle = st.status === 'idle';
  const toggle = (k) => { S[k] = !S[k]; S.emit(); };
  const [open, setOpen] = useState(true), dock = !!(timeline && st.scene && st.director);
  return (<>
    {dock && <TimelineDock engine={engine} st={st} open={open} setOpen={setOpen} />}
    <div className={`absolute ${dock ? (open ? 'bottom-[19rem]' : 'bottom-16') : 'bottom-6'} left-1/2 md:left-[calc(50%-260px)] -translate-x-1/2 z-20 max-w-[calc(100vw-1rem)] flex-wrap justify-center glass rounded-full px-2 py-1.5 flex items-center gap-1.5`}>
      {/* Recording lives on the timeline (Record armed actor); this bar only offers Stop while capturing. */}
      {st.status === 'capturing' && <button onClick={() => S.stop()} className={`${btn} bg-white text-background`}><Square className="w-3.5 h-3.5 fill-current" />Stop</button>}
      {st.status === 'pending' && (<>
        <button onClick={() => S.retryUpload()} className={`${btn} bg-ember text-background`}><RefreshCw className="w-3.5 h-3.5" />Retry upload</button>
        <button onClick={() => S.discardTake()} className={`${btn} bg-white/10 hover:bg-white/20`}><Trash2 className="w-3.5 h-3.5" />Discard</button>
      </>)}
      {st.status === 'review' && (<>
        <button onClick={() => S.saveTake()} className={`${btn} bg-primary text-primary-foreground`}><Save className="w-3.5 h-3.5" />Save Take</button>
        <button onClick={() => S.discardTake()} className={`${btn} bg-white/10 hover:bg-white/20`}><Trash2 className="w-3.5 h-3.5" />Discard</button>
      </>)}
      {st.status === 'playing' && <button onClick={() => S.stopPlayback()} className={`${btn} bg-white/10 hover:bg-white/20`}><Square className="w-3.5 h-3.5" />Stop Playback</button>}
      <div className="px-2 text-xs tabular-nums flex items-center gap-2">
        {st.status === 'capturing' && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
        {(st.status === 'uploading' || st.status === 'loading' || st.status === 'saving') && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        <span className="font-mono">{fmt(st.status === 'playing' ? st.playT : st.recT)}</span>
        <span className="text-muted-foreground hidden md:inline">{st.encoding && st.status === 'playing' ? `Encoding ${st.encoding} preview · ${st.playDur ? Math.round((st.playT / st.playDur) * 100) : 0}%` : LABEL[st.status] || 'Ready'}</span>
      </div>
      <span className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground px-2 border-l border-white/10"><Video className="w-3.5 h-3.5" />{st.status === 'playing' ? st.playing : cam?.name || 'No camera'}</span>
      <button onClick={() => toggle('viewThrough')} disabled={!cam && st.status !== 'playing'} className={`${btn} ${st.viewThrough ? 'bg-accent text-accent-foreground' : 'bg-white/10 hover:bg-white/20'}`}>
        {st.viewThrough ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}{st.viewThrough ? 'World View' : 'View Through Camera'}
      </button>
      <button onClick={() => toggle('preview')} title="Live camera preview" className={`${btn} ${st.preview ? 'bg-white/20' : 'bg-white/5'} hover:bg-white/20`}><PictureInPicture2 className="w-3.5 h-3.5" /></button>
    </div>
  </>);
}