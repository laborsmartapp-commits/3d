import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { base44 } from '@/api/base44Client';
import { fmtSize } from '@/lib/assets';
import AssetPreview from './AssetPreview';
import AttachToProduction from './AttachToProduction';
import StageUse from './StageUse';

const btn = 'rounded-lg px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10';

export default function AssetDetail({ asset, onClose, onChanged, onNewVersion }) {
  const [versions, setVersions] = useState([]), [usedBy, setUsedBy] = useState([]);
  useEffect(() => {
    if (!asset) return;
    base44.entities.Asset.filter({ root_id: asset.root_id || asset.id }, { sort: '-version', limit: 20 }).then((r) => setVersions(r.items));
    base44.entities.Production.filter({ asset_ids: asset.id }, { limit: 20, fields: ['title'] }).then((r) => setUsedBy(r.items));
  }, [asset]);
  if (!asset) return null;
  const E = base44.entities.Asset, act = async (fn) => { await fn(); onChanged(); };
  const rename = () => { const n = window.prompt('Rename asset', asset.name); if (n?.trim()) act(() => E.update(asset.id, { name: n.trim() })); };
  const move = () => { const n = window.prompt('Move to folder', asset.folder || ''); if (n !== null) act(() => E.update(asset.id, { folder: n.trim() })); };
  const dup = () => act(async () => { const { id, created_date, updated_date, created_by_id, ...rest } = asset; const c = await E.create({ ...rest, name: `${asset.name} (Copy)`, version: 1 }); await E.update(c.id, { root_id: c.id }); });
  const del = () => {
    const msg = usedBy.length ? `“${asset.name}” is used by ${usedBy.length} production(s). Delete this library entry anyway? Scenes keep their own data.` : `Delete “${asset.name}” v${asset.version} from the library?`;
    if (window.confirm(msg)) act(async () => { await E.delete(asset.id); onClose(); });
  };
  const rows = [['Type', `${asset.category} · ${asset.subcategory || '—'}`], ['Format', `.${asset.format}`], ['Size', fmtSize(asset.size)], ['Version', `v${asset.version || 1}`],
    ['Folder', asset.folder || '—'], ['Rig', asset.rig || '—'], ['Import', asset.import_status === 'failed' ? `Failed: ${asset.import_error}` : 'OK'], ['Uploaded', format(new Date(asset.created_date), 'MMM d, yyyy HH:mm')], ['Storage', 'Private (signed links only)']];
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-heading">{asset.name}</DialogTitle></DialogHeader>
        <AssetPreview asset={asset} />
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">{rows.map(([k, v]) => <React.Fragment key={k}><dt className="text-quiet">{k}</dt><dd className="capitalize-first">{v}</dd></React.Fragment>)}</dl>
        <p className="text-xs text-muted-foreground">Used by: {usedBy.map((p) => p.title).join(', ') || 'no productions'}</p>
        <AttachToProduction asset={asset} onDone={() => base44.entities.Production.filter({ asset_ids: asset.id }, { limit: 20, fields: ['title'] }).then((r) => setUsedBy(r.items))} />
        <StageUse asset={asset} onChanged={onChanged} />
        {versions.length > 1 && <p className="text-xs text-muted-foreground">Versions: {versions.map((v) => `v${v.version}`).join(', ')}</p>}
        <div className="flex flex-wrap gap-2">
          <button className={btn} onClick={rename}>Rename</button><button className={btn} onClick={move}>Move to folder</button>
          <button className={btn} onClick={dup}>Duplicate</button><button className={btn} onClick={() => onNewVersion(asset)}>Upload new version</button>
          <button className={btn} onClick={() => act(() => E.update(asset.id, { status: asset.status === 'archived' ? 'active' : 'archived' }))}>{asset.status === 'archived' ? 'Restore' : 'Archive'}</button>
          <button className={`${btn} text-destructive`} onClick={del}>Delete</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}