import React, { useMemo, useState } from 'react';
import { Eye, EyeOff, Lock, ChevronRight } from 'lucide-react';
import RealmPanel from './RealmPanel';

const AREAS = ['Ground Floor', 'Upper Floor', 'Front of House', 'Backyard & Patio'];

// Object hierarchy: House → floor → room → objects, plus the outdoor areas.
export default function HierarchyPanel({ R, r, onClose }) {
  const [q, setQ] = useState(''), [open, setOpen] = useState({});
  const tree = useMemo(() => {
    const s = q.trim().toLowerCase(), t = {};
    for (const o of r.objects) { if (s && !`${o.name} ${o.cat} ${o.room}`.toLowerCase().includes(s)) continue; ((t[o.area] ||= {})[o.room] ||= []).push(o); }
    return t;
  }, [r.objRev, r.objects, q]);
  const sel = new Set(r.sel.map((x) => x.id)), ed = R.R.editor;
  const pick = (id) => { R.setMode('edit'); ed.select([id]); ed.focus(id); };
  return (
    <RealmPanel title="Objects by Room" onClose={onClose}>
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter objects…" className="w-full mb-3 rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm outline-none focus:border-primary" />
      {AREAS.filter((a) => tree[a]).map((a) => (
        <div key={a} className="mb-3">
          <p className="text-[11px] uppercase tracking-wider text-quiet mb-1">{a}</p>
          {Object.entries(tree[a]).map(([room, list]) => {
            const k = `${a}/${room}`, isOpen = open[k] ?? !!q;
            return (
              <div key={k}>
                <button onClick={() => setOpen({ ...open, [k]: !isOpen })} className="w-full flex items-center gap-1 py-1 text-sm hover:text-primary"><ChevronRight className={`w-3.5 h-3.5 transition ${isOpen ? 'rotate-90' : ''}`} />{room}<span className="ml-auto text-xs text-quiet">{list.length}</span></button>
                {isOpen && list.map((o) => (
                  <div key={o.id} className={`ml-5 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs ${sel.has(o.id) ? 'bg-primary/20 text-primary' : 'hover:bg-white/5'}`}>
                    <button onClick={() => pick(o.id)} className="flex-1 text-left truncate">{o.name}</button>
                    {o.locked && <Lock className="w-3 h-3 text-ember" />}
                    <button onClick={() => { ed.select([o.id]); ed.patch({ hidden: !o.hidden }); }} title={o.hidden ? 'Show' : 'Hide'}>{o.hidden ? <EyeOff className="w-3.5 h-3.5 text-quiet" /> : <Eye className="w-3.5 h-3.5 text-quiet" />}</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </RealmPanel>
  );
}