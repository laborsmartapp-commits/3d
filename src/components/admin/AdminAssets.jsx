import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORIES, fmtSize } from '@/lib/assets';

// Characters, objects, animations, audio and textures across all owners. `cats` limits the categories shown.
export default function AdminAssets({ cats = Object.keys(CATEGORIES) }) {
  const [cat, setCat] = useState('all'), [q, setQ] = useState(''), [failed, setFailed] = useState(false), [items, setItems] = useState(null);
  useEffect(() => {
    const t = setTimeout(async () => {
      const query = { category: cat === 'all' ? { $in: cats } : cat, ...(failed && { import_status: 'failed' }), ...(q && { name: { $regex: q, $options: 'i' } }) };
      setItems((await base44.entities.Asset.filter(query, { sort: '-created_date', limit: 100 })).items);
    }, 250);
    return () => clearTimeout(t);
  }, [cat, q, failed, cats.join()]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search assets" className="bg-card border border-border rounded-xl px-3 py-2 text-sm" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm"><option value="all">All</option>{cats.map((c) => <option key={c} value={c}>{CATEGORIES[c].label}</option>)}</select>
        <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={failed} onChange={(e) => setFailed(e.target.checked)} />Failed imports only</label>
      </div>
      {!items && <Loader2 className="w-5 h-5 animate-spin" />}
      {items && !items.length && <p className="text-sm text-muted-foreground">No assets uploaded yet.</p>}
      {!!items?.length && <div className="overflow-x-auto"><table className="w-full text-sm">
        <thead className="text-xs text-quiet text-left"><tr><th className="py-2">Name</th><th>Type</th><th>Format</th><th>Size</th><th>Version</th><th>Rig</th><th>Import</th><th>Uploaded</th></tr></thead>
        <tbody>{items.map((a) => (
          <tr key={a.id} className="border-t border-border">
            <td className="py-2"><Link to={`/assets?cat=${a.category}&id=${a.id}`} className="text-primary">{a.name}</Link></td><td>{a.category}{a.subcategory ? ` · ${a.subcategory}` : ''}</td>
            <td>.{a.format}</td><td>{fmtSize(a.size)}</td><td>v{a.version || 1}</td><td>{a.rig || '—'}</td>
            <td className={a.import_status === 'failed' ? 'text-destructive' : ''}>{a.import_status === 'failed' ? a.import_error || 'failed' : 'ok'}</td><td>{format(new Date(a.created_date), 'MMM d')}</td>
          </tr>
        ))}</tbody>
      </table></div>}
    </div>
  );
}