import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { STAGES } from '@/game/stages/registry';

export const TYPES = { music_video: 'Music Video', tv_episode: 'TV Episode', short_film: 'Short Film', animation_test: 'Animation Test' };
const field = 'w-full bg-background border border-border rounded-xl px-3 py-2 text-sm';

export default function NewProductionDialog({ open, onOpenChange, onCreate }) {
  const [f, setF] = useState({ title: '', description: '', production_type: 'music_video', stage_id: 'celestia-grotto', fps: 30, resolution: '1080p' });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: k === 'fps' ? Number(e.target.value) : e.target.value });
  const submit = async (e) => { e.preventDefault(); setSaving(true); await onCreate(f); setSaving(false); setF({ ...f, title: '', description: '' }); };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-heading">New Production</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Title" value={f.title} onChange={set('title')} className={field} />
          <textarea placeholder="Description" value={f.description} onChange={set('description')} className={field} rows={3} />
          <div className="grid grid-cols-2 gap-3">
            <select value={f.production_type} onChange={set('production_type')} className={field}>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <select value={f.stage_id} onChange={set('stage_id')} className={field}>{Object.values(STAGES).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <select value={f.fps} onChange={set('fps')} className={field}>{[24, 30, 60].map((n) => <option key={n} value={n}>{n} fps</option>)}</select>
            <select value={f.resolution} onChange={set('resolution')} className={field}>{['1080p', '1440p', '4k'].map((r) => <option key={r}>{r}</option>)}</select>
          </div>
          <button disabled={saving} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50">{saving ? 'Creating…' : 'Create Production'}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}