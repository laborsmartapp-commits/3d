import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { adminLog } from '@/lib/studioLinks';
import StatusBadge from '@/components/shell/StatusBadge';
import ProductionTree from './ProductionTree';

const STATUSES = ['draft', 'in_production', 'review', 'completed', 'archived'];

export default function AdminProductions() {
  const [items, setItems] = useState(null), [q, setQ] = useState(''), [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    setItems((await base44.entities.Production.filter(q ? { title: { $regex: q, $options: 'i' } } : {}, { sort: '-updated_date', limit: 50 })).items);
  }, [q]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const setStatus = async (p, status) => { await base44.entities.Production.update(p.id, { status }); adminLog('production.status_changed', 'Production', p.id, { status }); load(); };
  const del = async (p) => {
    if (!window.confirm(`Delete “${p.title}”? Its shots are removed; scenes, takes, renders and library assets are kept.`)) return;
    await base44.entities.Shot.deleteMany({ production_id: p.id }); await base44.entities.Production.delete(p.id);
    adminLog('production.deleted', 'Production', p.id, { title: p.title }); load();
  };
  return (
    <div className="space-y-4">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search productions" className="bg-card border border-border rounded-xl px-3 py-2 text-sm" />
      {!items && <Loader2 className="w-5 h-5 animate-spin" />}
      {items && !items.length && <p className="text-sm text-muted-foreground">No productions.</p>}
      {items?.map((p) => (
        <div key={p.id} className="glass rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => setOpen(open === p.id ? null : p.id)} aria-label="Expand"><ChevronRight className={`w-4 h-4 transition-transform ${open === p.id ? 'rotate-90' : ''}`} /></button>
            <Link to={`/productions/${p.id}`} className="font-semibold hover:text-primary flex-1">{p.title}</Link>
            <StatusBadge status={p.status} />
            <select value={p.status} onChange={(e) => setStatus(p, e.target.value)} className="bg-background border border-border rounded-lg px-2 py-1 text-xs">{STATUSES.map((s) => <option key={s}>{s}</option>)}</select>
            <button onClick={() => del(p)} className="text-xs text-destructive">Delete</button>
          </div>
          {open === p.id && <ProductionTree production={p} />}
        </div>
      ))}
    </div>
  );
}