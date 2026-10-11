import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { CATEGORIES, extOf } from '@/lib/assets';

const field = 'w-full bg-background border border-border rounded-xl px-3 py-2 text-sm';

// Uploads a real file to private storage and records it in the library. `base` = new version of an existing asset.
export default function AssetUploadDialog({ open, onOpenChange, category, base, onDone }) {
  const cat = base?.category || category || 'character';
  const [f, setF] = useState({ name: '', subcategory: '', folder: '', rig: '' }), [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); if (!file) return;
    setBusy(true); setErr('');
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      const meta = base
        ? { name: base.name, category: base.category, subcategory: base.subcategory, folder: base.folder, rig: base.rig, tags: base.tags, root_id: base.root_id || base.id, version: (base.version || 1) + 1 }
        : { name: f.name || file.name.replace(/\.[^.]+$/, ''), category: cat, subcategory: f.subcategory, folder: f.folder, rig: f.rig, version: 1 };
      const a = await base44.entities.Asset.create({ ...meta, file_uri, file_name: file.name, format: extOf(file.name), size: file.size, status: 'active', import_status: 'ok' });
      if (!base) await base44.entities.Asset.update(a.id, { root_id: a.id });
      onDone(); setFile(null); setF({ name: '', subcategory: '', folder: '', rig: '' });
    } catch (x) { setErr(x.message || 'Upload failed'); }
    setBusy(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader><DialogTitle className="font-heading">{base ? `New version of ${base.name}` : `Upload ${CATEGORIES[cat].label.replace(/s$/, '')}`}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <input type="file" required accept={CATEGORIES[cat].accept} onChange={(e) => setFile(e.target.files[0])} className={field} />
          {!base && <>
            <input placeholder="Name (defaults to file name)" value={f.name} onChange={set('name')} className={field} />
            <div className="grid grid-cols-2 gap-3">
              <select value={f.subcategory} onChange={set('subcategory')} className={field}><option value="">Type…</option>{CATEGORIES[cat].subs.map((s) => <option key={s}>{s}</option>)}</select>
              <input placeholder="Folder" value={f.folder} onChange={set('folder')} className={field} />
            </div>
            {cat !== 'audio' && cat !== 'texture' && <input placeholder="Rig / skeleton (e.g. Mixamo, Krush rig)" value={f.rig} onChange={set('rig')} className={field} />}
          </>}
          {base && <p className="text-xs text-muted-foreground">Version {(base.version || 1) + 1} is saved alongside the current one. Nothing already in use gets replaced.</p>}
          {err && <p className="text-xs text-destructive">{err}</p>}
          <button disabled={busy || !file} className="w-full rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50 inline-flex justify-center items-center gap-2">{busy && <Loader2 className="w-4 h-4 animate-spin" />}{busy ? 'Uploading…' : 'Upload'}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
}