import React, { useState } from 'react';
import { Download, Loader2, Mic } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRESETS } from '@/lib/voices';
import VoiceCard from './VoiceCard';
import ImportVoiceDialog from './ImportVoiceDialog';
import CreateVoiceDialog from './CreateVoiceDialog';

export default function VoiceLibraryTab({ voices, reload }) {
  const [dlg, setDlg] = useState(null);
  return (
    <div className="space-y-8">
      <section>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <h3 className="font-heading text-lg mr-auto">Custom Voices</h3>
          <Button onClick={() => setDlg('import')}><Download className="w-4 h-4" />Import Voice</Button>
          <Button variant="secondary" onClick={() => setDlg('create')}><Mic className="w-4 h-4" />Create from Recordings</Button>
        </div>
        {!voices && <Loader2 className="w-5 h-5 animate-spin" />}
        {voices && !voices.length && <p className="text-sm text-muted-foreground">No custom voices yet. Import one from ElevenLabs by its voice ID, or create one from authorized recordings.</p>}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{voices?.map((v) => <VoiceCard key={v.id} v={v} reload={reload} />)}</div>
      </section>
      <section>
        <h3 className="font-heading text-lg mb-3">Preset Voices</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{PRESETS.map(([k, n, d]) => <VoiceCard key={k} preset={{ key: k, name: n, description: d }} />)}</div>
      </section>
      <ImportVoiceDialog open={dlg === 'import'} onClose={() => setDlg(null)} onDone={reload} />
      <CreateVoiceDialog open={dlg === 'create'} onClose={() => setDlg(null)} onDone={reload} />
    </div>
  );
}