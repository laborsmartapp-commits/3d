import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film, Download, Share2, Clapperboard, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { stageInfo, takeStage } from '@/game/stages/registry';
import { previewFormat } from '@/game/studio/PreviewEncoder';

const signed = async (uri) => (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 3600 })).signed_url;
const fileName = (t) => `${(t.name || 'take').replace(/[^\w\- ]+/g, '').trim()} - PREVIEW.${t.preview_ext}`;
const btn = 'rounded-full px-2.5 py-1 text-[11px] flex items-center gap-1 bg-white/10 hover:bg-white/20 disabled:opacity-40';

// Browser preview video: generate (in the take's own stage), watch, download, share.
export default function PreviewActions({ engine, st, take, interrupted, onWatch }) {
  const nav = useNavigate(), [res, setRes] = useState('720p'), [busy, setBusy] = useState(null);
  const ready = take.preview_status === 'ready' && take.preview_uri, here = takeStage(take) === engine.stage.id, fmt = previewFormat();
  const blob = async () => new File([await (await fetch(await signed(take.preview_uri))).blob()], fileName(take), { type: take.preview_mime });
  const download = async () => { setBusy('dl'); const f = await blob(), a = document.createElement('a'); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); URL.revokeObjectURL(a.href); setBusy(null); };
  const share = async () => {
    setBusy('share'); const f = await blob();
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], title: take.name }).catch(() => {});
    else { await navigator.clipboard.writeText(await signed(take.preview_uri)); engine.notify('Preview link copied (valid for 1 hour)'); }
    setBusy(null);
  };
  const generate = () => here ? engine.studio.generatePreview(take, res) : nav(`${stageInfo(takeStage(take)).path}?studioTake=${take.id}&do=preview&res=${res}`);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ready && <button onClick={onWatch} className={btn}><Film className="w-3 h-3" />Watch Preview</button>}
      {ready && <button onClick={download} disabled={!!busy} className={btn}>{busy === 'dl' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}Download Preview ({take.preview_ext.toUpperCase()})</button>}
      {ready && <button onClick={share} disabled={!!busy} className={btn}>{busy === 'share' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}Share</button>}
      {!interrupted && fmt && (<>
        <select value={res} onChange={(e) => setRes(e.target.value)} className="rounded-full bg-white/10 px-2 py-1 text-[11px]"><option value="720p">720p</option><option value="1080p">1080p</option></select>
        <button onClick={generate} disabled={st.status !== 'idle'} className={`${btn} bg-primary/20 text-primary`}><Clapperboard className="w-3 h-3" />{ready ? 'Regenerate Preview' : 'Generate Preview'}{!here && ` in ${stageInfo(takeStage(take)).name}`}</button>
      </>)}
    </div>
  );
}