import React, { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Loader2, Search, Upload, LayoutGrid, List, Box, Music, Image as ImgIcon, Activity } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORIES, fmtSize } from '@/lib/assets';
import PageHeader from '@/components/shell/PageHeader';
import AssetUploadDialog from '@/components/assets/AssetUploadDialog';
import AssetDetail from '@/components/assets/AssetDetail';

const ICON = { character: Box, object: Box, animation: Activity, audio: Music, texture: ImgIcon };
const chip = (on) => `rounded-full px-3 py-1 text-xs font-semibold ${on ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`;

export default function AssetLibrary() {
  const q0 = new URLSearchParams(window.location.search);
  const [cat, setCat] = useState(q0.get('cat') || 'character'), [q, setQ] = useState(''), [folder, setFolder] = useState(''), [sort, setSort] = useState('-created_date');
  const loc = useLocation();
  useEffect(() => { const c = new URLSearchParams(loc.search).get('cat'); if (c) setCat(c); }, [loc.search]);
  const [archived, setArchived] = useState(false), [grid, setGrid] = useState(true), [items, setItems] = useState(null), [folders, setFolders] = useState([]);
  const [upload, setUpload] = useState(q0.has('upload') ? {} : null), [open, setOpen] = useState(null);
  const load = useCallback(async () => {
    const query = { category: cat, status: archived ? 'archived' : 'active', ...(folder && { folder }), ...(q && { name: { $regex: q, $options: 'i' } }) };
    setItems((await base44.entities.Asset.filter(query, { sort, limit: 60 })).items);
    setFolders((await base44.entities.Asset.filter({ category: cat }, { distinct: 'folder' })).items.filter(Boolean));
  }, [cat, q, folder, sort, archived]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { const id = q0.get('id'); if (id) base44.entities.Asset.get(id).then(setOpen).catch(() => {}); }, []);
  const refresh = async () => { await load(); if (open) setOpen(await base44.entities.Asset.get(open.id).catch(() => null)); };
  const Icon = ICON[cat];
  return (
    <div className="max-w-6xl">
      <PageHeader eyebrow="Library" title={cat === 'animation' ? 'Animation Library' : 'Asset Library'}>
        <button onClick={() => setUpload({})} className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm bg-primary text-primary-foreground font-semibold"><Upload className="w-4 h-4" />Upload</button>
      </PageHeader>
      <div className="flex flex-wrap gap-1.5 mb-4">{Object.entries(CATEGORIES).map(([k, c]) => <button key={k} onClick={() => { setCat(k); setFolder(''); }} className={chip(cat === k)}>{c.label}</button>)}</div>
      <div className="flex flex-wrap gap-2 mb-6 items-center">
        <div className="relative"><Search className="w-4 h-4 absolute left-3 top-2.5 text-quiet" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="bg-card border border-border rounded-xl pl-9 pr-3 py-2 text-sm" /></div>
        <select value={folder} onChange={(e) => setFolder(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm"><option value="">All folders</option>{folders.map((f) => <option key={f}>{f}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="bg-card border border-border rounded-xl px-3 py-2 text-sm"><option value="-created_date">Newest</option><option value="name">Name</option><option value="-size">Largest</option></select>
        <button onClick={() => setArchived(!archived)} className={chip(archived)}>Archived</button>
        <div className="ml-auto flex gap-1"><button aria-label="Grid" onClick={() => setGrid(true)} className={chip(grid)}><LayoutGrid className="w-3.5 h-3.5" /></button><button aria-label="List" onClick={() => setGrid(false)} className={chip(!grid)}><List className="w-3.5 h-3.5" /></button></div>
      </div>
      {!items && <Loader2 className="w-5 h-5 animate-spin" />}
      {items && !items.length && <p className="text-sm text-muted-foreground">No {CATEGORIES[cat].label.toLowerCase()} {archived ? 'archived' : 'uploaded yet'}. Use Upload to add a real file ({CATEGORIES[cat].accept}).</p>}
      <div className={grid ? 'grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4' : 'space-y-2'}>
        {items?.map((a) => (
          <button key={a.id} onClick={() => setOpen(a)} className={`glass rounded-2xl text-left hover:bg-card/80 ${grid ? 'p-4' : 'p-3 flex items-center gap-4 w-full'}`}>
            <div className={`${grid ? 'h-28 mb-3' : 'w-10 h-10'} rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 grid place-items-center`}><Icon className="w-6 h-6 text-primary" /></div>
            <div className="min-w-0 flex-1"><p className="text-sm font-semibold truncate">{a.name}</p>
              <p className="text-[11px] text-muted-foreground">.{a.format} · {fmtSize(a.size)} · v{a.version || 1}{a.rig ? ` · ${a.rig}` : ''}{!grid ? ` · ${a.folder || 'No folder'} · ${format(new Date(a.created_date), 'MMM d')}` : ''}</p></div>
          </button>
        ))}
      </div>
      <AssetUploadDialog open={!!upload} onOpenChange={(o) => !o && setUpload(null)} category={cat} base={upload?.base} onDone={() => { setUpload(null); refresh(); }} />
      {open && <AssetDetail asset={open} onClose={() => setOpen(null)} onChanged={refresh} onNewVersion={(a) => setUpload({ base: a })} />}
    </div>
  );
}