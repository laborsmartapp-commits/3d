import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Left label for one timeline row. Labels only select; track settings live in the rail pop-outs.
export default function LaneLabel({ engine, st, d, row, ui, set }) {
  const D = engine.studio.dir, toggle = (id) => set({ collapsed: { ...ui.collapsed, [id]: !ui.collapsed[id] } });
  const Chev = ({ id }) => <button onClick={() => toggle(id)} aria-label={ui.collapsed[id] ? 'Expand' : 'Collapse'} className="p-0.5 rounded hover:bg-white/10 shrink-0">{ui.collapsed[id] ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}</button>;
  const selCls = row.track && ui.selTrack === row.track ? 'bg-primary/10' : '';
  if (row.type === 'empty') return <div className="h-7 px-2 flex items-center text-muted-foreground border-t border-white/5 truncate">No characters yet</div>;
  if (row.type === 'audioHead') return <div className="h-5 px-1 flex items-center gap-1 text-[9px] tracking-widest text-sky-300 border-t border-white/10"><Chev id="audio" />AUDIO</div>;
  if (row.type === 'audio') {
    const t = d.tracks?.[row.audio] || {};
    return (
      <button onClick={() => set({ selTrack: row.track })} className={`h-7 w-full pl-5 pr-2 flex items-center gap-1 border-t border-white/5 text-muted-foreground hover:text-foreground ${selCls}`}>
        <span className="truncate">{row.label}</span>
        {t.muted && <span className="ml-auto text-[9px] font-bold text-destructive">M</span>}
        {t.solo && <span className={`${t.muted ? '' : 'ml-auto'} text-[9px] font-bold text-ember`}>S</span>}
      </button>
    );
  }
  const a = row.actor, mine = a.id === d.controlled ? 'text-primary' : '';
  if (!row.first) return <button onClick={() => set({ selTrack: row.track })} className={`h-7 w-full pl-5 pr-2 flex items-center border-t border-white/5 text-muted-foreground hover:text-foreground truncate ${selCls}`}>{row.label}</button>;
  return (
    <div className={`h-7 px-1 flex items-center gap-1 border-t border-white/5 ${mine} ${selCls}`}>
      <Chev id={a.id} />
      <button onClick={() => { D.control(a.id); if (!a.armed) D.setActor(a.id, { armed: true }); set({ selTrack: row.track }); }} disabled={st.status === 'capturing'} title="Control this character" className="truncate font-bold hover:text-primary text-left">{a.name}</button>
    </div>
  );
}