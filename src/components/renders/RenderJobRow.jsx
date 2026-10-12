import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Download, RefreshCw, XCircle, Loader2, RotateCcw, Film, ChevronDown } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { retryRender, queueRender, videoUrl } from '@/game/studio/RecordingJobManager';
import StatusBadge from '@/components/shell/StatusBadge';

const control = (job_id, action) => base44.functions.invoke('renderJobControl', { job_id, action }).then((r) => r.data);
const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-40';
const secs = (j) => (j.claimed_at ? Math.max(0, (new Date(j.updated_date) - new Date(j.claimed_at)) / 1000) : null);

export default function RenderJobRow({ job, reload, onWatch, defaultOpen }) {
  const [busy, setBusy] = useState(null), [open, setOpen] = useState(!!defaultOpen);
  const run = (k, fn) => async () => { setBusy(k); try { await fn(); } catch (e) { window.alert(e.response?.data?.error || e.message); } setBusy(null); reload?.(); };
  const active = ['queued', 'rendering', 'encoding'].includes(job.status), done = job.status === 'completed' && job.video_uri;
  const I = (k, Icon) => (busy === k ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />);
  const rerender = run('rr', async () => queueRender(await base44.entities.SceneTake.get(job.take_id), { resolution: job.resolution, fps: job.fps, preset: job.preset }));
  const ex = secs(job), cancelled = job.error === 'Cancelled';
  const details = [['Job', job.id], ['RunPod job', job.runpod_job_id || '—'], ['RunPod status', job.runpod_status || '—'], ['Frames', job.frame_count || '—'], ['Execution', ex ? `${(ex / 60).toFixed(1)} min` : '—'],
    ['Output', done ? `${job.video_width}×${job.video_height} @ ${job.video_fps} fps` : '—'], ['Soundtrack', !done ? '—' : job.audio_info?.audio ? `${job.audio_info.codec?.toUpperCase()} ${job.audio_info.sample_rate / 1000} kHz, A/V offset ${job.audio_info.av_offset_ms} ms` : job.audio_info?.audio === false ? 'None (silent master)' : 'Not reported (older render worker, no audio)'], ['GPU', job.gpu || '—'], ['Attempts', job.attempts || 1]];
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><StatusBadge status={cancelled ? 'archived' : job.status} />{cancelled && <span className="text-[11px] text-quiet">cancelled</span>}<span className="font-mono text-xs text-quiet">{job.id}</span></div>
          <p className="text-sm mt-1.5">{job.resolution} · {job.fps} fps · {job.preset}{job.video_duration ? ` · ${job.video_duration.toFixed(1)}s` : ''}{job.file_size ? ` · ${(job.file_size / 1e6).toFixed(1)} MB` : ''}{ex ? ` · ran ${(ex / 60).toFixed(1)} min` : ''}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(job.created_date), 'MMM d, yyyy HH:mm')}{job.status_message ? ` — ${job.status_message}` : ''}</p>
          {job.error && !cancelled && <p className="text-xs text-destructive mt-1 line-clamp-2">{job.error}</p>}
          {(job.status === 'rendering' || job.status === 'encoding') && job.progress > 0 && <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${job.progress}%` }} /></div>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {active && <button className={btn} disabled={!!busy} onClick={run('st', () => control(job.id, 'status'))}>{I('st', RefreshCw)}Refresh</button>}
          {active && <button className={btn} disabled={!!busy} onClick={run('cx', () => window.confirm('Cancel this render on RunPod?') && control(job.id, 'cancel'))}>{I('cx', XCircle)}Cancel</button>}
          {job.status === 'failed' && <button className={btn} disabled={!!busy} onClick={run('rt', () => retryRender(job))}>{I('rt', RotateCcw)}Retry</button>}
          {!active && <button className={btn} disabled={!!busy} onClick={rerender}>{I('rr', RefreshCw)}Re-render</button>}
          {done && <button className={btn} disabled={!!busy} onClick={run('w', async () => onWatch?.({ url: await videoUrl(job), title: `Cloud master ${job.resolution}` }))}>{I('w', Film)}Watch</button>}
          {done && <button className={btn} disabled={!!busy} onClick={run('dl', async () => window.open(await videoUrl(job), '_blank'))}>{I('dl', Download)}Download</button>}
          <button className={btn} onClick={() => setOpen(!open)}><ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />Details</button>
        </div>
      </div>
      {open && (
        <div className="mt-4 border-t border-border pt-3 text-xs space-y-2">
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">{details.map(([k, v]) => <div key={k}><dt className="text-quiet">{k}</dt><dd className="font-mono break-all">{v}</dd></div>)}</dl>
          <Link to={`/recordings?take=${job.take_id}`} className="text-primary">Open recording →</Link>
          {job.error && <pre className="whitespace-pre-wrap text-destructive bg-black/30 rounded-lg p-2">{job.error}</pre>}
          {job.manifest && <details><summary className="cursor-pointer text-quiet">Render manifest</summary><pre className="whitespace-pre-wrap bg-black/30 rounded-lg p-2 max-h-60 overflow-auto">{JSON.stringify(job.manifest, null, 2)}</pre></details>}
        </div>
      )}
    </div>
  );
}