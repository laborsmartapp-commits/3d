import React, { useState } from 'react';
import { format } from 'date-fns';
import { Download, RefreshCw, XCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StatusBadge from '@/components/shell/StatusBadge';

const control = (job_id, action) => base44.functions.invoke('renderJobControl', { job_id, action }).then((r) => r.data);

export default function RenderJobRow({ job, reload }) {
  const [busy, setBusy] = useState(null);
  const run = async (action) => {
    setBusy(action);
    const res = await control(job.id, action);
    if (action === 'download' && res.url) window.open(res.url, '_blank');
    setBusy(null);
    reload?.();
  };
  const active = ['queued', 'rendering', 'encoding'].includes(job.status);
  const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-40';
  return (
    <div className="glass rounded-2xl p-4 flex flex-wrap items-center gap-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2"><StatusBadge status={job.status} /><span className="font-mono text-xs text-quiet">{job.id}</span></div>
        <p className="text-sm mt-1.5">{job.resolution} · {job.fps} fps · {job.preset}{job.video_duration ? ` · ${job.video_duration.toFixed(1)}s` : ''}{job.file_size ? ` · ${(job.file_size / 1e6).toFixed(1)} MB` : ''}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{format(new Date(job.created_date), 'MMM d, yyyy HH:mm')}{job.status_message ? ` — ${job.status_message}` : ''}</p>
        {job.error && <p className="text-xs text-destructive mt-1 line-clamp-2">{job.error}</p>}
        {(job.status === 'rendering' || job.status === 'encoding') && job.progress > 0 && (
          <div className="h-1 bg-white/10 rounded-full mt-2 overflow-hidden"><div className="h-full bg-accent" style={{ width: `${job.progress}%` }} /></div>
        )}
      </div>
      <div className="flex gap-1.5">
        {active && <button className={btn} disabled={!!busy} onClick={() => run('status')}>{busy === 'status' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Refresh</button>}
        {active && <button className={btn} disabled={!!busy} onClick={() => run('cancel')}><XCircle className="w-3 h-3" />Cancel</button>}
        {job.status === 'completed' && job.video_uri && <button className={btn} disabled={!!busy} onClick={() => run('download')}>{busy === 'download' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}Watch / Download</button>}
      </div>
    </div>
  );
}