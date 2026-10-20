import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Archive } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import StageThumb from './StageThumb';
import { STYLE_LABEL } from './options';

const FIELDS = ['name', 'root_id', 'version', 'texture_style', 'category', 'thumbnail_uri', 'creation_mode', 'prompt_summary', 'created_date', 'status'];
export const loadFamilies = async () => {
  const { items } = await base44.entities.GeneratedStage.filter({ status: { $in: ['active', 'building'] } }, { sort: '-created_date', limit: 100, fields: FIELDS });
  const by = new Map();
  for (const r of items) { const k = r.root_id || r.id; if (!by.has(k)) by.set(k, []); by.get(k).push(r); }
  return [...by.values()].map((v) => v.sort((a, b) => (b.version || 1) - (a.version || 1)));
};

// Every generated stage family with its versions. Versions never overwrite each other.
export default function LibraryTab({ current }) {
  const [fams, setFams] = useState(null), [open, setOpen] = useState(current?.root_id || null), nav = useNavigate();
  const load = () => loadFamilies().then(setFams);
  useEffect(() => { load(); }, []);
  const archive = async (id) => { await base44.entities.GeneratedStage.update(id, { status: 'archived' }); load(); };
  if (!fams) return <p className="text-xs text-quiet">Loading stages…</p>;
  if (!fams.length) return <p className="text-xs text-quiet">No generated stages yet. Create one in the Create tab.</p>;
  return (
    <div className="space-y-2">
      {fams.map((v) => { const top = v[0], root = top.root_id || top.id; return (
        <div key={root} className="rounded-xl bg-white/5 p-2">
          <div className="flex items-center gap-2">
            <StageThumb uri={v.find((x) => x.thumbnail_uri)?.thumbnail_uri} />
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{top.name}</p><p className="text-[10px] text-quiet">{STYLE_LABEL[top.texture_style] || top.texture_style} · {v.length} version{v.length > 1 ? 's' : ''}{top.status === 'building' && <span className="ml-1 text-ember">· under construction</span>}</p></div>
            <button onClick={() => nav(`/stage/${top.id}`)} className="rounded-md bg-primary text-primary-foreground px-2 py-1 text-[10px] font-semibold">Open</button>
            <button onClick={() => setOpen(open === root ? null : root)} aria-label="Versions" className="p-1 rounded hover:bg-white/10"><ChevronDown className={`w-3.5 h-3.5 transition ${open === root ? 'rotate-180' : ''}`} /></button>
          </div>
          {open === root && <div className="mt-2 space-y-1">{v.map((x) => (
            <div key={x.id} className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] ${current?.id === x.id ? 'bg-primary/15' : 'bg-white/5'}`}>
              <span className="font-mono text-quiet">v{x.version || 1}</span><span className="flex-1 truncate text-muted-foreground">{x.prompt_summary || x.creation_mode}</span>
              <button onClick={() => nav(`/stage/${x.id}`)} className="text-primary">Open</button>
              {current?.id !== x.id && <button onClick={() => archive(x.id)} aria-label="Archive version" className="text-quiet hover:text-destructive"><Archive className="w-3 h-3" /></button>}
            </div>
          ))}</div>}
        </div>
      ); })}
    </div>
  );
}