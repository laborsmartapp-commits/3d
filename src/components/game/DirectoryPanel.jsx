import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, Home, Star, Clock, Globe } from 'lucide-react';
import SidePanel from './SidePanel';

function Row({ isl, current, onVisit }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{isl.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{isl.owner_label} · {(isl.owned_plots || []).length} plots</p>
      </div>
      {current ? <span className="text-[11px] text-primary">Here</span> : <button onClick={onVisit} className="rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">Visit</button>}
    </div>
  );
}

export default function DirectoryPanel({ engine, s, onClose }) {
  const [list, setList] = useState(null);
  useEffect(() => { base44.entities.Island.filter({ is_public: true }, '-updated_date', 40).then(setList); }, []);
  const recent = JSON.parse(localStorage.getItem('celestia_recent') || '[]');
  const my = engine.myIsland;
  const sections = list && [
    { title: 'Sample Worlds', icon: Star, items: list.filter((i) => i.kind === 'sample' || i.kind === 'test') },
    { title: 'Recently Visited', icon: Clock, items: recent.map((id) => list.find((i) => i.id === id)).filter(Boolean) },
    { title: 'Featured Worlds', icon: Globe, items: list.filter((i) => i.kind === 'player' && i.id !== my.id).slice(0, 10) },
  ];
  return (
    <SidePanel title="Island Directory" subtitle="Visit floating islands across the skies" onClose={onClose}>
      <p className="text-xs uppercase tracking-wider text-quiet mb-2 flex items-center gap-1.5"><Home className="w-3 h-3" />My Island</p>
      <Row isl={my} current={s.islandId === my.id} onVisit={() => engine.visitIsland(my.id)} />
      {!list && <div className="py-10 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>}
      {sections?.map(({ title, icon: Icon, items }) => items.length > 0 && (
        <div key={title} className="mt-5">
          <p className="text-xs uppercase tracking-wider text-quiet mb-2 flex items-center gap-1.5"><Icon className="w-3 h-3" />{title}</p>
          <div className="space-y-2">{items.map((i) => <Row key={i.id} isl={i} current={s.islandId === i.id} onVisit={() => engine.visitIsland(i.id)} />)}</div>
        </div>
      ))}
      <p className="text-[11px] text-quiet mt-5">Visitors can explore freely but cannot modify another owner's island.</p>
    </SidePanel>
  );
}