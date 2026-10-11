import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

// Adds a library reference to a production. The asset itself is never copied or moved.
export default function AttachToProduction({ asset, onDone }) {
  const [prods, setProds] = useState([]), [pick, setPick] = useState('');
  useEffect(() => { base44.entities.Production.filter({ status: { $ne: 'archived' } }, { sort: '-updated_date', limit: 50, fields: ['title', 'asset_ids'] }).then((r) => setProds(r.items)); }, []);
  const p = prods.find((x) => x.id === pick);
  const attach = async () => { await base44.entities.Production.update(p.id, { asset_ids: [...new Set([...(p.asset_ids || []), asset.id])] }); setPick(''); onDone(); };
  if (!prods.length) return null;
  return (
    <div className="flex gap-2">
      <select value={pick} onChange={(e) => setPick(e.target.value)} className="flex-1 bg-background border border-border rounded-xl px-3 py-1.5 text-xs">
        <option value="">Add to production…</option>{prods.map((x) => <option key={x.id} value={x.id}>{x.title}</option>)}
      </select>
      <button disabled={!p} onClick={attach} className="rounded-lg px-3 py-1.5 text-xs bg-primary text-primary-foreground disabled:opacity-40">Add</button>
    </div>
  );
}