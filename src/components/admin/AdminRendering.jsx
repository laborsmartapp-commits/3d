import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useAdminApi from '@/hooks/useAdminApi';
import RenderJobRow from '@/components/renders/RenderJobRow';
import VideoDialog from '@/components/recordings/VideoDialog';

const Box = ({ l, v }) => <div className="glass rounded-2xl p-4"><p className="font-heading text-xl">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>;

export default function AdminRendering() {
  const rp = useAdminApi('runpod').data, c = useAdminApi('costs').data;
  const [jobs, setJobs] = useState(null), [status, setStatus] = useState(''), [video, setVideo] = useState(null), [users, setUsers] = useState({});
  const load = () => base44.entities.RenderJob.filter(status ? { status } : {}, { sort: '-created_date', limit: 50 }).then((r) => setJobs(r.items));
  useEffect(() => { load(); }, [status]);
  useEffect(() => { base44.functions.invoke('adminApi', { action: 'users' }).then((r) => setUsers(Object.fromEntries(r.data.users.map((u) => [u.id, u.email])))); }, []);
  const w = rp?.health?.workers || {}, j = rp?.health?.jobs || {};
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Box l="Endpoint" v={rp ? (rp.configured ? rp.endpoint : 'Not configured') : '…'} />
        <Box l="Workers running / idle / ready" v={rp?.health ? `${w.running || 0} / ${w.idle || 0} / ${w.ready || 0}` : rp?.error || '…'} />
        <Box l="RunPod in queue / in progress" v={rp?.health ? `${j.inQueue || 0} / ${j.inProgress || 0}` : '…'} />
        <Box l={`Estimated GPU cost (${c ? `$${c.rate}/h, estimate` : '…'})`} v={c ? `$${c.cost.toFixed(2)} · ${(c.seconds / 3600).toFixed(2)} h` : '…'} />
      </div>
      {c && <div className="text-xs text-muted-foreground space-y-1"><p className="text-quiet">Usage by user (estimated from worker claim → finish time; exact RunPod billing is not available through the API):</p>
        {c.byUser.map((u) => <p key={u.id}>{users[u.id] || u.id}: {u.jobs} jobs · {(u.seconds / 60).toFixed(1)} min · ${((u.seconds / 3600) * c.rate).toFixed(2)}</p>)}</div>}
      <div className="flex gap-1.5">{['', 'queued', 'rendering', 'encoding', 'completed', 'failed'].map((s) => <button key={s} onClick={() => setStatus(s)} className={`rounded-full px-3 py-1 text-xs ${status === s ? 'bg-primary text-primary-foreground' : 'bg-white/5'}`}>{s || 'all'}</button>)}</div>
      {!jobs ? <Loader2 className="w-5 h-5 animate-spin" /> : <div className="space-y-3">{jobs.map((x) => <div key={x.id}><p className="text-[11px] text-quiet mb-1">Submitted by {users[x.created_by_id] || x.created_by_id}</p><RenderJobRow job={x} reload={load} onWatch={setVideo} /></div>)}</div>}
      <p className="text-xs text-quiet">Endpoint scaling, GPU type and worker counts are managed in the RunPod console — no controls here pretend to change them.</p>
      <VideoDialog video={video} onClose={() => setVideo(null)} />
    </div>
  );
}