import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Eye, Download, Pencil, Copy, Trash2, RefreshCw, Clapperboard, Loader2, Film } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { queueRender, videoUrl } from '@/game/studio/RecordingJobManager';
import { defaultCloud } from '@/game/studio/quality';
import { deleteTake } from '@/game/studio/takeOps';
import { playTakeUrl, directorUrl } from '@/lib/studioLinks';

const btn = 'inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs bg-white/5 hover:bg-white/10 disabled:opacity-40';
const signed = async (uri) => (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 })).signed_url;

export default function RecordingActions({ take, master, onWatch, reload }) {
  const [busy, setBusy] = useState(null);
  const run = (k, fn) => async () => { setBusy(k); try { await fn(); } catch (e) { window.alert(e.response?.data?.error || e.message); } setBusy(null); reload(); };
  const ok = take.status === 'captured';
  const I = (k, Icon) => (busy === k ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />);
  const rename = run('rename', async () => { const n = window.prompt('Rename take', take.name || ''); if (n?.trim()) await base44.entities.SceneTake.update(take.id, { name: n.trim() }); });
  const dup = run('dup', async () => {
    const { id, created_date, updated_date, created_by_id, preview_uri, preview_status, ...rest } = take;
    await base44.entities.SceneTake.create({ ...rest, name: `${take.name || 'Take'} (Copy)`, source_take_id: take.source_take_id || take.id, preview_status: 'none' });
  });
  const del = run('del', async () => { if (window.confirm(`Delete “${take.name || 'this take'}”, its performance data and its render jobs? Library assets are not affected.`)) await deleteTake(take); });
  const rerender = run('rr', () => queueRender(take, { ...defaultCloud(), ...take.render_settings }));
  return (
    <div className="flex flex-wrap gap-1.5">
      {take.preview_uri && <button className={btn} disabled={!!busy} onClick={run('wp', async () => onWatch({ url: await signed(take.preview_uri), title: `${take.name} — local preview` }))}>{I('wp', Eye)}Watch Preview</button>}
      {take.preview_uri && <button className={btn} disabled={!!busy} onClick={run('dp', async () => window.open(await signed(take.preview_uri), '_blank'))}>{I('dp', Download)}Preview</button>}
      {master && <button className={btn} disabled={!!busy} onClick={run('wm', async () => onWatch({ url: await videoUrl(master), title: `${take.name} — cloud master ${master.resolution}` }))}>{I('wm', Film)}Watch Master</button>}
      {master && <button className={btn} disabled={!!busy} onClick={run('dm', async () => window.open(await videoUrl(master), '_blank'))}>{I('dm', Download)}Master</button>}
      {ok && <Link to={playTakeUrl(take)} className={btn}><Play className="w-3 h-3" />Play in Stage</Link>}
      <Link to={directorUrl(take.world, take.scene_id)} className={btn}><Clapperboard className="w-3 h-3" />Director</Link>
      {ok && <button className={btn} disabled={!!busy} onClick={rerender}>{I('rr', RefreshCw)}Re-render</button>}
      <button className={btn} disabled={!!busy} onClick={rename}>{I('rename', Pencil)}Rename</button>
      {ok && <button className={btn} disabled={!!busy} onClick={dup}>{I('dup', Copy)}Duplicate</button>}
      <button className={`${btn} text-destructive`} disabled={!!busy} onClick={del}>{I('del', Trash2)}Delete</button>
    </div>
  );
}