import React from 'react';
import { Square, Save, Trash2, RefreshCw, Loader2, Pause } from 'lucide-react';

const fmt = (t = 0) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const LABEL = { capturing: 'Recording', uploading: 'Uploading take', review: 'Take captured', pending: 'Upload pending', playing: 'Playback', loading: 'Loading take', saving: 'Saving preview', directing: 'Timeline playback' };

// Only visible while the studio is doing something: recording, reviewing, uploading or playing back.
export default function TakeStatusPill({ engine, st }) {
  if (!st || st.status === 'idle') return null;
  const S = engine.studio, s = st.status, b = 'h-7 px-2.5 rounded-full flex items-center gap-1 text-[11px] font-semibold';
  const t = s === 'playing' ? st.playT : s === 'directing' ? st.director?.t : st.recT;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 glass rounded-full pl-3 pr-1 py-1 flex items-center gap-2">
      {s === 'capturing' && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
      {['uploading', 'loading', 'saving'].includes(s) && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      <span className="font-mono text-xs tabular-nums">{fmt(t)}</span>
      <span className="text-[11px] text-muted-foreground">{st.encoding && s === 'playing' ? `Encoding ${st.encoding} preview` : LABEL[s] || s}</span>
      {s === 'capturing' && <button onClick={() => S.stop()} className={`${b} bg-foreground text-background`}><Square className="w-3 h-3 fill-current" />Stop</button>}
      {s === 'directing' && <button onClick={() => S.dir.pause()} className={`${b} bg-white/10 hover:bg-white/20`}><Pause className="w-3 h-3" />Pause</button>}
      {s === 'playing' && <button onClick={() => S.stopPlayback()} className={`${b} bg-white/10 hover:bg-white/20`}><Square className="w-3 h-3" />Stop</button>}
      {s === 'review' && <button onClick={() => S.saveTake()} className={`${b} bg-primary text-primary-foreground`}><Save className="w-3 h-3" />Save Take</button>}
      {s === 'pending' && <button onClick={() => S.retryUpload()} className={`${b} bg-ember text-background`}><RefreshCw className="w-3 h-3" />Retry</button>}
      {(s === 'review' || s === 'pending') && <button onClick={() => S.discardTake()} className={`${b} bg-white/10 hover:bg-white/20`}><Trash2 className="w-3 h-3" />Discard</button>}
    </div>
  );
}