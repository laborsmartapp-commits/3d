import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { voiceApi } from '@/lib/voices';

// Authorized reference recordings -> a new ElevenLabs voice. The voice only enters the library once the
// provider has created it; a plain upload never counts as a voice.
export default function CreateVoiceDialog({ open, onClose, onDone }) {
  const [name, setName] = useState(''), [files, setFiles] = useState([]), [consent, setConsent] = useState(false), [busy, setBusy] = useState(''), [err, setErr] = useState('');
  const create = async () => {
    setErr('');
    try {
      setBusy('Uploading recordings…');
      const file_uris = [];
      for (const f of files) file_uris.push((await base44.integrations.Core.UploadPrivateFile({ file: f })).file_uri);
      setBusy('ElevenLabs is creating the voice…');
      const r = await voiceApi('create', { name, file_uris, consent, consent_statement: 'I own this voice or have the speaker\'s permission to create an AI voice from these recordings.' });
      onDone(); onClose(); setName(''); setFiles([]); setConsent(false);
      if (r.voice.status !== 'ready') window.alert(r.voice.status_detail);
    } catch (e) { setErr(e.message); }
    setBusy('');
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md space-y-1">
        <DialogHeader><DialogTitle>Create Voice from Recordings</DialogTitle></DialogHeader>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Voice name, e.g. Camden" />
        <input type="file" multiple accept="audio/*,.mp3,.wav,.m4a" onChange={(e) => setFiles([...e.target.files].slice(0, 5))} className="text-xs" />
        <p className="text-[11px] text-muted-foreground">1–5 clean recordings of one speaker, 1–3 minutes total works best.</p>
        <label className="flex gap-2 text-xs items-start"><Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} className="mt-0.5" />I own this voice or have the speaker's permission to create an AI voice from these recordings.</label>
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button onClick={create} disabled={!name.trim() || !files.length || !consent || !!busy}>{busy ? <><Loader2 className="w-4 h-4 animate-spin" />{busy}</> : 'Create Voice'}</Button>
      </DialogContent>
    </Dialog>
  );
}