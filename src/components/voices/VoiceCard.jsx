import React, { useState } from 'react';
import { Loader2, Play, RefreshCw, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { voiceApi, playUri } from '@/lib/voices';

const BADGE = { ready: 'bg-primary/15 text-primary', pending_verification: 'bg-ember/15 text-ember', unavailable: 'bg-destructive/15 text-destructive' };
const LABEL = { ready: 'Ready', pending_verification: 'Awaiting verification', unavailable: 'Unavailable' };

// One library voice (custom or preset): speak a real test line, re-check it with the provider, remove it.
export default function VoiceCard({ v, preset, reload }) {
  const [busy, setBusy] = useState(''), [err, setErr] = useState('');
  const run = async (k, fn) => { setBusy(k); setErr(''); try { await fn(); } catch (e) { setErr(e.message); } setBusy(''); };
  const test = () => run('play', async () => { const r = await voiceApi('speak', { text: 'This is my voice in MationStudio.', ...(preset ? { preset: preset.key } : { voice_id: v.id }) }); await playUri(r.asset.file_uri); });
  const status = preset ? 'ready' : v.status;
  return (
    <div className="glass rounded-xl p-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <p className="font-semibold truncate mr-auto">{preset ? preset.name : v.name}</p>
        <span className={`text-[10px] rounded-full px-2 py-0.5 ${BADGE[status]}`}>{preset ? 'Preset' : LABEL[status]}</span>
      </div>
      <p className="text-xs text-muted-foreground truncate">{preset ? preset.description : `ElevenLabs · ${v.source === 'created' ? 'created from recordings' : 'imported'} · ${v.provider_voice_id}`}</p>
      {v?.status_detail && <p className="text-[11px] text-ember">{v.status_detail}</p>}
      <div className="flex gap-1 pt-1">
        <button onClick={test} disabled={!!busy || status !== 'ready'} className="text-xs flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 px-2 py-1 disabled:opacity-40">{busy === 'play' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}Test</button>
        {!preset && <button onClick={() => run('check', async () => { await voiceApi('verify', { id: v.id }); await reload(); })} disabled={!!busy} className="text-xs flex items-center gap-1 rounded-md bg-white/5 hover:bg-white/10 px-2 py-1">{busy === 'check' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}Re-check</button>}
        {!preset && <button onClick={() => window.confirm(`Remove "${v.name}" from your library? Characters using it will need a new voice.`) && run('rm', async () => { await base44.entities.Voice.delete(v.id); await reload(); })} disabled={!!busy} className="ml-auto text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>}
      </div>
      {err && <p className="text-[11px] text-destructive">{err}</p>}
    </div>
  );
}