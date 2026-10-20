import React, { useState } from 'react';
import { Loader2, Play, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { base44 } from '@/api/base44Client';
import { DEFAULTS, EMOTIONS, PRESETS, voiceApi, playUri } from '@/lib/voices';

const SL = [['stability', 'Stability', 0, 1, 0.05], ['similarity', 'Similarity', 0, 1, 0.05], ['expressiveness', 'Expressiveness', 0, 1, 0.05], ['speed', 'Pacing', 0.7, 1.2, 0.05]];

// Edits one character's permanent voice profile (voice + delivery + pronunciations).
export default function CharacterVoiceEditor({ c, profile, voices, onSaved }) {
  const [p, setP] = useState({ ...DEFAULTS, voice_kind: 'custom', ...profile }), [busy, setBusy] = useState(''), [msg, setMsg] = useState('');
  const set = (k, v) => setP((x) => ({ ...x, [k]: v }));
  const sel = p.voice_kind === 'preset' ? `preset:${p.preset}` : p.voice_id ? `v:${p.voice_id}` : '';
  const pick = (s) => setP((x) => (s.startsWith('preset:') ? { ...x, voice_kind: 'preset', preset: s.slice(7), voice_id: '' } : { ...x, voice_kind: 'custom', voice_id: s.slice(2), preset: '' }));
  const save = async () => {
    const { id, created_date, updated_date, created_by_id, created_by, ...data } = p;
    const rec = { ...data, character_key: c.key, character_name: c.name };
    return profile ? base44.entities.CharacterVoice.update(profile.id, rec) : base44.entities.CharacterVoice.create(rec);
  };
  const run = async (k, fn) => { setBusy(k); setMsg(''); try { await fn(); } catch (e) { setMsg(e.message); } setBusy(''); };
  return (
    <div className="mt-3 space-y-3 text-sm">
      <select value={sel} onChange={(e) => pick(e.target.value)} className="w-full rounded-md bg-secondary px-2 py-1.5">
        <option value="" disabled>Choose a voice…</option>
        <optgroup label="Custom voices">{voices.map((v) => <option key={v.id} value={`v:${v.id}`} disabled={v.status !== 'ready'}>{v.name}{v.status !== 'ready' ? ' (unavailable)' : ''}</option>)}</optgroup>
        <optgroup label="Presets">{PRESETS.map(([k, n]) => <option key={k} value={`preset:${k}`}>{n}</option>)}</optgroup>
      </select>
      {SL.map(([k, l, a, b, s]) => (
        <div key={k}><div className="flex justify-between text-xs text-muted-foreground"><span>{l}</span><span>{p[k]}</span></div><Slider min={a} max={b} step={s} value={[p[k]]} onValueChange={([v]) => set(k, v)} /></div>
      ))}
      <div className="flex items-center gap-3 text-xs">
        <label className="flex items-center gap-2"><Switch checked={p.speaker_boost} onCheckedChange={(v) => set('speaker_boost', v)} />Speaker boost</label>
        <select value={p.default_emotion} onChange={(e) => set('default_emotion', e.target.value)} className="ml-auto rounded-md bg-secondary px-2 py-1">{EMOTIONS.map((e) => <option key={e}>{e}</option>)}</select>
      </div>
      <Input value={p.delivery_notes || ''} onChange={(e) => set('delivery_notes', e.target.value)} placeholder="Delivery notes (e.g. laid-back, dry humour)" />
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Pronunciations</p>
        {(p.pronunciations || []).map((r, i) => (
          <div key={i} className="flex gap-1">
            <Input value={r.word} onChange={(e) => set('pronunciations', p.pronunciations.map((x, j) => (j === i ? { ...x, word: e.target.value } : x)))} placeholder="Word" />
            <Input value={r.say} onChange={(e) => set('pronunciations', p.pronunciations.map((x, j) => (j === i ? { ...x, say: e.target.value } : x)))} placeholder="Say it as" />
            <button onClick={() => set('pronunciations', p.pronunciations.filter((_, j) => j !== i))}><X className="w-4 h-4" /></button>
          </div>
        ))}
        <button onClick={() => set('pronunciations', [...(p.pronunciations || []), { word: '', say: '' }])} className="text-xs flex items-center gap-1 text-primary"><Plus className="w-3 h-3" />Add pronunciation</button>
      </div>
      <div className="flex gap-2">
        <Button size="sm" disabled={!sel || !!busy} onClick={() => run('save', async () => { await save(); await onSaved(); setMsg('Saved'); })}>{busy === 'save' && <Loader2 className="w-3 h-3 animate-spin" />}Save</Button>
        <Button size="sm" variant="secondary" disabled={!sel || !!busy} onClick={() => run('test', async () => { await save(); await onSaved(); const r = await voiceApi('speak', { ...(c.key.startsWith('asset:') ? { asset_id: c.key.slice(6) } : { char: c.key.slice(5) }), name: c.name, text: `Hey, it's ${c.name}.` }); await playUri(r.asset.file_uri); })}>{busy === 'test' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}Save & Test</Button>
      </div>
      {msg && <p className={`text-xs ${msg === 'Saved' ? 'text-primary' : 'text-destructive'}`}>{msg}</p>}
    </div>
  );
}