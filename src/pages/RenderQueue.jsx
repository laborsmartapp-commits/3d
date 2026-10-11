import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import PageHeader from '@/components/shell/PageHeader';
import RenderJobRow from '@/components/renders/RenderJobRow';

const FILTERS = ['all', 'queued', 'rendering', 'encoding', 'completed', 'failed'];

export default function RenderQueue() {
  const [status, setStatus] = useState('all'), [jobs, setJobs] = useState(null);
  const load = useCallback(async () => {
    const page = await base44.entities.RenderJob.filter(status === 'all' ? {} : { status }, { sort: '-created_date', limit: 50 });
    setJobs(page.items);
  }, [status]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => base44.entities.RenderJob.subscribe(() => load()), [load]);
  return (
    <div className="max-w-5xl">
      <PageHeader eyebrow="Cloud Rendering" title="Render Queue" />
      <div className="flex flex-wrap gap-1.5 mb-6">
        {FILTERS.map((f) => <button key={f} onClick={() => setStatus(f)} className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${status === f ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{f}</button>)}
      </div>
      {!jobs && <Loader2 className="w-5 h-5 animate-spin" />}
      {jobs && !jobs.length && <p className="text-muted-foreground text-sm">No render jobs here. Send a take to the cloud from Director Mode.</p>}
      <div className="space-y-3">{jobs?.map((j) => <RenderJobRow key={j.id} job={j} reload={load} />)}</div>
    </div>
  );
}