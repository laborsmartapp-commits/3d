import React, { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { castableCharacters, myProfiles, PRESETS } from '@/lib/voices';
import CharacterVoiceEditor from './CharacterVoiceEditor';

// Every castable character with its permanent voice; the profile is used in every scene and production.
export default function CharacterVoicesTab({ voices }) {
  const [chars, setChars] = useState(null), [profiles, setProfiles] = useState({}), [open, setOpen] = useState(null);
  const loadProfiles = () => myProfiles().then((l) => setProfiles(Object.fromEntries(l.map((p) => [p.character_key, p]))));
  useEffect(() => { castableCharacters().then(setChars); loadProfiles(); }, []);
  const voiceName = (p) => {
    if (!p) return null;
    if (p.voice_kind === 'preset') return { name: `${PRESETS.find(([k]) => k === p.preset)?.[1] || p.preset} (preset)`, ok: true };
    const v = voices?.find((x) => x.id === p.voice_id);
    return v ? { name: v.name, ok: v.status === 'ready' } : { name: 'Voice removed', ok: false };
  };
  if (!chars || !voices) return <Loader2 className="w-5 h-5 animate-spin" />;
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {chars.map((c) => {
        const p = profiles[c.key], vn = voiceName(p);
        return (
          <div key={c.key} className="glass rounded-xl p-3">
            <button onClick={() => setOpen(open === c.key ? null : c.key)} className="w-full flex items-center gap-2 text-left">
              <div className="min-w-0 mr-auto"><p className="font-semibold truncate">{c.name}</p><p className="text-[11px] text-muted-foreground">{c.kind}</p></div>
              {vn ? <span className={`text-xs flex items-center gap-1 ${vn.ok ? 'text-primary' : 'text-destructive'}`}>{!vn.ok && <AlertTriangle className="w-3 h-3" />}{vn.name}</span> : <span className="text-xs text-muted-foreground">No voice</span>}
            </button>
            {open === c.key && <CharacterVoiceEditor c={c} profile={p} voices={voices} onSaved={loadProfiles} />}
          </div>
        );
      })}
    </div>
  );
}