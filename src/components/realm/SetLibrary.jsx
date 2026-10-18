import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { CATALOG, CATEGORIES } from '@/game/realm/catalog';
import RealmPanel from './RealmPanel';
import LibraryTile from './LibraryTile';

export default function SetLibrary({ R, onClose }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState('All'), [assets, setAssets] = useState(null);
  useEffect(() => { base44.entities.Asset.filter({ category: 'object', status: 'active' }, { sort: '-created_date', limit: 60 }).then((p) => setAssets(p.items)).catch(() => setAssets([])); }, []);
  const items = useMemo(() => {
    const built = Object.entries(CATALOG).map(([type, d]) => ({ type, name: d.name, cat: d.cat, data: { type } }));
    const imp = (assets || []).map((a) => ({ type: 'asset', name: a.name, cat: 'Imported Models', thumb: null, data: { type: 'asset', asset_id: a.id, asset_uri: a.file_uri, name: a.name } }));
    const s = q.trim().toLowerCase();
    return [...built, ...imp].filter((i) => (cat === 'All' || i.cat === cat) && (!s || i.name.toLowerCase().includes(s) || i.cat.toLowerCase().includes(s)));
  }, [q, cat, assets]);
  const insert = (d) => { R.setMode('edit'); R.R.editor.insert(d, null); };
  return (
    <RealmPanel title="Set Dressing Library" onClose={onClose}>
      <div className="relative mb-2"><Search className="w-4 h-4 absolute left-2.5 top-2.5 text-quiet" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture, props…" className="w-full rounded-lg bg-white/5 border border-white/10 pl-8 pr-2 py-2 text-sm outline-none focus:border-primary" /></div>
      <select value={cat} onChange={(e) => setCat(e.target.value)} className="w-full mb-3 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm">
        {['All', ...CATEGORIES, 'Imported Models'].map((c) => <option key={c} value={c} className="bg-card">{c}</option>)}
      </select>
      <p className="text-[11px] text-muted-foreground mb-2">Click to place where you're looking, or drag onto the world.</p>
      <div className="grid grid-cols-3 gap-2">{items.map((i) => <LibraryTile key={i.data.asset_id || i.type} item={i} onInsert={insert} />)}</div>
      {cat === 'Imported Models' && !items.length && <p className="text-xs text-muted-foreground mt-3">No imported 3D objects yet. Upload .glb models as “Objects” in the <Link to="/assets" className="text-primary underline">Asset Library</Link>.</p>}
    </RealmPanel>
  );
}