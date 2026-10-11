import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shell/PageHeader';
import RenderJobRow from '@/components/renders/RenderJobRow';
import VideoDialog from '@/components/recordings/VideoDialog';

const FILTERS = ['all', 'queued', 'rendering', 'encoding', 'completed', 'failed'];

export default function RenderQueue() {
  const only = new URLSearchParams(window.location.search).get('job');
  const [status, setStatus] = useState('all'), [jobs, setJobs] = useState(null), [video, setVideo] = useState(null);
  const load = useCallback(async () => {
    const page = await base44.entities.RenderJob.filter(only ? { id: only } : status === 'all' ? {} : { status }, { sort: '-created_date', limit: 50 });
    setJobs(page.items);
  }, [status, only]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => base44.entities.RenderJob.subscribe(() => load()), [load]);
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Cloud Rendering" title="Render Queue" />
      {only ? <Link to="/renders" className="text-xs text-primary mb-4 inline-block">← All jobs</Link> : (
        <div className="flex flex-wrap gap-1.5 mb-6">
          {FILTERS.map((f) => <button key={f} onClick={() => setStatus(f)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${status === f ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{f}</button>)}
        </div>
      )}
      {!jobs && <Loader2 className="w-5 h-5 animate-spin" />}
      {jobs && !jobs.length && <p className="text-muted-foreground text-sm">No render jobs here. Send a take to the cloud from Recorded Scenes or Director Mode.</p>}
      <div className="space-y-3">{jobs?.map((j) => <RenderJobRow key={j.id} job={j} reload={load} onWatch={setVideo} defaultOpen={!!only} />)}</div>
      <VideoDialog video={video} onClose={() => setVideo(null)} />
    </div>
  );
}