import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const field = 'w-full bg-background border border-border rounded-xl px-3 py-2 text-sm';

// Create or edit a shot: a named camera + time range inside a scene's timeline.
export default function ShotDialog({ open, shot, scene, onClose, onSave }) {
  const [f, setF] = useState({});
  useEffect(() => { if (open) setF({ name: shot?.name || '', camera_id: shot?.camera_id || '', start_t: shot?.start_t || 0, end_t: shot?.end_t || '', notes: shot?.notes || '' }); }, [open, shot]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => { e.preventDefault(); onSave({ ...f, start_t: Number(f.start_t) || 0, end_t: f.end_t === '' ? null : Number(f.end_t) }); };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-heading">{shot?.id ? 'Edit Shot' : 'New Shot'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input required placeholder="Shot name" value={f.name || ''} onChange={set('name')} className={field} />
          <select value={f.camera_id || ''} onChange={set('camera_id')} className={field}>
            <option value="">Scene's selected camera</option>
            {(scene?.cameras || []).map((c) => <option key={c.id} value={c.id}>{c.name || c.id}</option>)}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" step="0.1" min="0" placeholder="Start (s)" value={f.start_t} onChange={set('start_t')} className={field} />
            <input type="number" step="0.1" min="0" placeholder="End (s)" value={f.end_t ?? ''} onChange={set('end_t')} className={field} />
          </div>
          <textarea placeholder="Notes" rows={2} value={f.notes || ''} onChange={set('notes')} className={field} />
          <button className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold">Save Shot</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}