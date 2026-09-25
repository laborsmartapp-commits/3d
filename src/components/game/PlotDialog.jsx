import React from 'react';
import { motion } from 'framer-motion';
import { Gem, MapPin, Lock, Eye, Hammer } from 'lucide-react';

export default function PlotDialog({ engine, plot, shards, readOnly }) {
  const free = plot.unlock !== 'purchase';
  const rows = [['Plot size', `${plot.size} · ${plot.radius * 2}m across`], ['Environment', plot.biome], ['Terrain', 'Level, prepared foundation'], ['Allowed', plot.allowed]];
  const close = () => engine.emit({ plot: null });
  return (
    <div className="absolute inset-0 z-30 flex items-end md:items-center justify-center bg-background/30" onClick={close}>
      <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} onClick={(e) => e.stopPropagation()} className="glass rounded-t-3xl md:rounded-2xl w-full md:w-[420px] p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary"><MapPin className="w-3.5 h-3.5" />{plot.owned ? 'Your Land' : 'Available Land'}</div>
        <h3 className="font-display text-2xl font-semibold mt-1">{plot.name}</h3>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/5 p-2.5"><p className="text-[10px] uppercase tracking-wider text-quiet">{k}</p><p className="text-sm mt-0.5">{v}</p></div>
          ))}
        </div>
        {!plot.owned && (
          <div className="mt-3 flex items-center justify-between rounded-xl bg-white/5 p-3">
            <span className="text-sm text-muted-foreground">{plot.unlocked ? (free ? plot.unlockLabel : 'Price') : plot.unlockLabel}</span>
            {plot.unlocked && !free && <span className="flex items-center gap-1 text-ember font-semibold"><Gem className="w-4 h-4" />{plot.price}</span>}
            {!plot.unlocked && <Lock className="w-4 h-4 text-quiet" />}
          </div>
        )}
        <div className="mt-5 flex gap-2">
          {plot.owned ? (
            <button onClick={() => engine.buildOnPlot(plot.id)} className="flex-1 flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground py-2.5 font-semibold"><Hammer className="w-4 h-4" />Build Here</button>
          ) : (
            <button disabled={!plot.unlocked || readOnly || (!free && shards < plot.price)} onClick={() => engine.purchasePlot(plot.id)} className="flex-1 rounded-full bg-primary text-primary-foreground py-2.5 font-semibold disabled:opacity-40">
              {free ? 'Claim Land' : 'Purchase Land'}
            </button>
          )}
          <button onClick={() => engine.previewPlot(plot.id)} className="rounded-full bg-white/10 hover:bg-white/15 px-4 flex items-center gap-1.5 text-sm"><Eye className="w-4 h-4" />Preview</button>
          <button onClick={close} className="rounded-full bg-white/10 hover:bg-white/15 px-4 text-sm">Cancel</button>
        </div>
      </motion.div>
    </div>
  );
}