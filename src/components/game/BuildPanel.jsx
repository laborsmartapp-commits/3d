import React, { useState } from 'react';
import { Gem, Home, Store, Landmark, Theater, TreePalm, Wheat, Sparkles, Flower2, Lamp, Archive } from 'lucide-react';
import SidePanel from './SidePanel';
import { CATALOG, CATEGORIES } from '@/game/build/catalog';

const ICONS = { homes: Home, shops: Store, civic: Landmark, culture: Theater, leisure: TreePalm, farm: Wheat, magical: Sparkles, decor: Flower2, lights: Lamp };

export default function BuildPanel({ engine, s, onClose }) {
  const [cat, setCat] = useState('homes');
  const mobile = window.innerWidth < 768;
  const pick = (fn) => { fn(); if (mobile) onClose(); };
  const items = cat === 'stored' ? [] : CATALOG.filter((d) => d.cat === cat);
  return (
    <SidePanel title="Structure Catalog" subtitle={s.build?.devPlace ? 'Dev placement: free & unrestricted' : 'Select a structure, then place it on your land'} onClose={onClose} wide>
      <div className="flex gap-1.5 overflow-x-auto pb-3 -mx-1 px-1">
        {[...CATEGORIES, { id: 'stored', label: `Stored (${s.stored?.length || 0})` }].map((c) => (
          <button key={c.id} onClick={() => setCat(c.id)} className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${cat === c.id ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{c.label}</button>
        ))}
      </div>
      {cat === 'stored' ? (
        <div className="space-y-2">
          {!s.stored?.length && <p className="text-sm text-muted-foreground py-8 text-center">Nothing in storage. Select a placed structure and choose Store.</p>}
          {s.stored?.map((r) => (
            <button key={r.id} onClick={() => pick(() => engine.build.placeStored(r.id))} className="w-full flex items-center gap-3 rounded-xl bg-white/5 hover:bg-white/10 p-3 text-left">
              <Archive className="w-4 h-4 text-accent" /><span className="text-sm flex-1">{r.name}</span><span className="text-xs text-primary">Place</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((d) => {
            const Icon = ICONS[d.cat];
            const afford = s.build?.devPlace || (s.shards ?? 0) >= d.cost;
            return (
              <button key={d.id} onClick={() => pick(() => engine.build.selectCatalog(d.id, { keepDev: true }))}
                className={`group rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/10 hover:border-primary/50 p-2.5 flex flex-col items-center text-center transition ${afford ? '' : 'opacity-50'}`}>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 grid place-items-center mb-1.5"><Icon className="w-5 h-5 text-primary" /></div>
                <span className="text-[11px] font-medium leading-tight min-h-[2rem] flex items-center">{d.name}</span>
                <span className="text-[10px] text-ember flex items-center gap-0.5 mt-0.5"><Gem className="w-2.5 h-2.5" />{d.cost}</span>
              </button>
            );
          })}
        </div>
      )}
    </SidePanel>
  );
}