import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Music, Upload } from 'lucide-react';
import { uploadAudioAsset } from '@/lib/audioUpload';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { base44 } from '@/api/base44Client';

// Pick a file from the Audio Library and drop it on this audio track at the playhead.
export default function AddAudio({ engine, track, disabled }) {
  const [items, setItems] = useState(null), [busy, setBusy] = useState(null), [err, setErr] = useState('');
  const load = async (open) => { if (open && !items) setItems((await base44.entities.Asset.filter({ category: 'audio', status: 'active' }, { sort: '-created_date', limit: 50 })).items); };
  const add = async (a) => {
    setBusy(a.id); setErr('');
    try { await engine.studio.dir.addAudio(a, track); } catch { setErr(`Couldn't decode "${a.name}". Try MP3 or WAV.`); }
    setBusy(null);
  };
  const upload = async (e) => {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setBusy('upload'); setErr('');
    try { const a = await uploadAudioAsset(f, { subcategory: track }); setItems((l) => [a, ...(l || [])]); await engine.studio.dir.addAudio(a, track); }
    catch (x) { setErr(x.message || 'Upload failed'); }
    setBusy(null);
  };
  return (
    <Popover onOpenChange={load}>
      <PopoverTrigger disabled={disabled} title="Add audio" className="ml-auto text-primary disabled:opacity-30"><Music className="w-3 h-3" /></PopoverTrigger>
      <PopoverContent side="top" align="start" className="w-60 p-1 bg-card border-border">
        {!items && <Loader2 className="w-4 h-4 animate-spin m-2" />}
        {items && !items.length && <p className="text-xs text-muted-foreground p-2">No audio in your library yet.</p>}
        {items?.map((a) => (
          <button key={a.id} disabled={!!busy} onClick={() => add(a)} className="w-full flex items-center gap-1.5 text-left text-sm px-2 py-1.5 rounded-md hover:bg-white/10 truncate">
            {busy === a.id && <Loader2 className="w-3 h-3 animate-spin" />}<span className="truncate">{a.name}</span><span className="ml-auto text-[10px] text-muted-foreground">{a.subcategory}</span>
          </button>
        ))}
        {err && <p className="text-[11px] text-destructive px-2 py-1">{err}</p>}
        <label className="flex items-center gap-1.5 text-[11px] text-primary px-2 py-1.5 border-t border-white/10 cursor-pointer hover:bg-white/5">
          {busy === 'upload' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}Upload audio to this track
          <input type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac" className="hidden" disabled={!!busy} onChange={upload} />
        </label>
        <Link to="/assets" className="block text-[11px] text-muted-foreground px-2 py-1.5">Open the Asset Library →</Link>
      </PopoverContent>
    </Popover>
  );
}