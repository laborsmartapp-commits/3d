import React, { useEffect, useState } from 'react';
import { Film } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';
import { JOB_STATUS, TAKE_STATUS } from '@/game/studio/RecordingJobManager';
import TakeActions from './TakeActions';

const COLOR = { queued: 'text-ember', rendering: 'text-chart-4', encoding: 'text-chart-4', completed: 'text-primary', failed: 'text-destructive' };
const mb = (b) => (b ? `${(b / 1048576).toFixed(1)} MB` : '—');

export default function TakeRow({ engine, st, take, jobs, reload }) {
  const [thumb, setThumb] = useState(null);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (take.thumb_uri) base44.integrations.Core.CreateFileSignedUrl({ file_uri: take.thumb_uri, expires_in: 3600 }).then((r) => setThumb(r.signed_url)); }, [take.thumb_uri]);
  const job = jobs[0];
  const interrupted = take.status !== 'captured' && st.take?.id !== take.id;
  return (
    <div className="rounded-xl bg-white/5 p-3 space-y-2">
      <div className="flex gap-3">
        <div className="w-28 h-16 rounded-lg bg-black/40 overflow-hidden shrink-0 flex items-center justify-center">
          {thumb ? <Image src={thumb} alt={take.name} className="w-full h-full" /> : <Film className="w-5 h-5 text-muted-foreground" />}
        </div>
        <div className="min-w-0 flex-1 text-xs space-y-0.5">
          <p className="text-sm font-semibold truncate">{take.name}</p>
          <p className="text-muted-foreground">Take {take.take_number} · {take.location} · {new Date(take.created_date).toLocaleString()}</p>
          <p className="text-muted-foreground">{(take.duration || 0).toFixed(1)}s · {take.camera_name} · {take.camera_mode === 'follow' ? 'Follow' : 'Stationary'}</p>
          {job ? <p>{job.resolution === '4k' ? '4K' : job.resolution} · {job.fps} fps · {job.preset} · <span className={COLOR[job.status]}>{JOB_STATUS[job.status]}</span> · {mb(job.file_size)}</p>
            : <p className="text-ember">{interrupted ? 'Interrupted, performance kept' : TAKE_STATUS[take.status]} · not rendered</p>}
        </div>
      </div>
      {job?.status_message && job.status !== 'completed' && <p className="text-[11px] text-muted-foreground">{job.status_message}{job.error ? ` — ${job.error}` : ''}</p>}
      <TakeActions engine={engine} st={st} take={take} jobs={jobs} interrupted={interrupted} reload={reload} onDetails={() => setOpen(!open)} />
      {open && (
        <pre className="text-[10px] bg-black/40 rounded-lg p-2 max-h-56 overflow-auto whitespace-pre-wrap">
          {JSON.stringify({ take_id: take.id, performance_source: take.source_take_id || take.id, samples: take.sample_count, chunks: take.chunk_count, env_start: take.env_start, camera: take.camera_snapshot, renders: jobs.map((j) => ({ id: j.id, status: j.status, size: `${j.width}x${j.height}`, fps: j.fps, preset: j.preset, attempts: j.attempts, runpod: j.runpod_job_id })) }, null, 1)}
        </pre>
      )}
    </div>
  );
}