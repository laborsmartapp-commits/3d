import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { PanelEmbed } from './embed';

// The one panel frame every bubble tool opens into, docked just left of the bubble column.
export default function ToolPanel({ title, subtitle, tabs, tab, setTab, error, onClose, children }) {
  return (
    <motion.div initial={{ opacity: 0, x: 28, scale: 0.97 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 28, scale: 0.97 }} transition={{ type: 'spring', damping: 28, stiffness: 340 }}
      className="absolute right-[84px] top-4 max-h-[calc(100%-2rem)] z-30 w-[min(360px,calc(100vw-100px))] glass rounded-2xl flex flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-2">
        <div className="min-w-0">
          <h2 className="font-heading text-sm tracking-wide">{title}</h2>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
        </div>
        <button onClick={onClose} aria-label="Close panel" className="p-1 rounded-full hover:bg-white/10"><X className="w-4 h-4" /></button>
      </div>
      {tabs && (
        <div className="mx-4 mb-3 flex gap-1 rounded-lg bg-white/5 p-1">
          {tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`flex-1 rounded-md py-1.5 text-[11px] font-semibold transition ${tab === k ? 'bg-primary text-primary-foreground' : 'text-foreground/80 hover:bg-white/10'}`}>{l}</button>)}
        </div>
      )}
      {error && <p className="mx-4 mb-2 text-xs text-destructive">{error}</p>}
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4"><PanelEmbed.Provider value>{children}</PanelEmbed.Provider></div>
    </motion.div>
  );
}