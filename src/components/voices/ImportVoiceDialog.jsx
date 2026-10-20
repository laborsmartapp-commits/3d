import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { voiceApi } from '@/lib/voices';

// Connect an existing ElevenLabs voice by its persistent voice ID (picked from the account or pasted).
export default function ImportVoiceDialog({ open, onClose, onDone }) {
  const [list, setList] = useState(null), [id, setId] = useState(''), [busy, setBusy] = useState(''), [err, setErr] = useState('');
  useEffect(() => { if (open && !list) voiceApi('provider_voices').then((r) => setList(r.voices)).catch((e) => { setErr(e.message); setList([]); }); }, [open, list]);
  const imp = async (vid) => {
    setBusy(vid); setErr('');
    try { await voiceApi('import', { provider_voice_id: vid }); setList((l) => l?.map((v) => (v.provider_voice_id === vid ? { ...v, imported: true } : v))); setId(''); onDone(); }
    catch (e) { setErr(e.message); }
    setBusy('');
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Import Voice from ElevenLabs</DialogTitle></DialogHeader>
        <div className="flex gap-2">
          <Input value={id} onChange={(e) => setId(e.target.value)} placeholder="Paste a voice ID" />
          <Button onClick={() => imp(id.trim())} disabled={!id.trim() || !!busy}>Import</Button>
        </div>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="max-h-80 overflow-y-auto space-y-1">
          {!list && <Loader2 className="w-4 h-4 animate-spin" />}
          {list?.map((v) => (
            <div key={v.provider_voice_id} className="flex items-center gap-2 rounded-lg bg-white/5 px-2 py-1.5 text-sm">
              <div className="min-w-0 mr-auto"><p className="truncate">{v.name}</p><p className="text-[10px] text-muted-foreground">{v.category} · {v.provider_voice_id}</p></div>
              {v.imported ? <span className="text-[11px] text-primary">In library</span>
                : <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => imp(v.provider_voice_id)}>{busy === v.provider_voice_id && <Loader2 className="w-3 h-3 animate-spin" />}Import</Button>}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}