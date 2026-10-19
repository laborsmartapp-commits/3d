import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

// Master bubble on the right edge; opening it fans the tool bubbles upward.
export default function BubbleMenu({ tools, open, toggle, tool, pick, dirty, rec, docked = {} }) {
  const list = [...tools].reverse(); // column grows upward from the master bubble
  return (
    <div className="absolute right-4 bottom-[10%] z-40 flex flex-col-reverse items-center gap-2.5">
      <button onClick={toggle} aria-label={open ? 'Close studio tools' : 'Open studio tools'} aria-expanded={open}
        className="relative w-14 h-14 rounded-full bg-primary text-primary-foreground grid place-items-center ring-1 ring-white/25 shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.7)] hover:scale-105 active:scale-95 transition-transform">
        <AnimatePresence initial={false} mode="wait">
          <motion.span key={open ? 'x' : 'o'} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.16 }}>
            {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
          </motion.span>
        </AnimatePresence>
        {rec && <span className="absolute inset-0 rounded-full ring-2 ring-destructive animate-pulse" />}
        {dirty && !rec && <span className="absolute top-0.5 right-0.5 w-3 h-3 rounded-full bg-ember ring-2 ring-background" title="Unsaved layout changes" />}
      </button>
      <AnimatePresence>
        {open && list.map((t, i) => { const on = t.toggle ? !!docked[t.id] : tool === t.id; return (
          <motion.div key={t.id} className="relative group"
            initial={{ opacity: 0, y: 28, scale: 0.4 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', damping: 18, stiffness: 380, delay: i * 0.035 } }}
            exit={{ opacity: 0, y: 20, scale: 0.4, transition: { duration: 0.14, delay: (list.length - 1 - i) * 0.02 } }}>
            <button onClick={() => pick(t.id)} aria-label={t.label} aria-pressed={on}
              className={`w-11 h-11 rounded-full grid place-items-center ring-1 shadow-lg shadow-black/40 transition ${on ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card/80 backdrop-blur-md text-foreground/90 ring-white/10 hover:bg-card hover:ring-white/30 hover:-translate-x-0.5'}`}>
              <t.icon className="w-[18px] h-[18px]" />
            </button>
            <span className="pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-card/90 backdrop-blur-md ring-1 ring-white/10 px-2.5 py-1 text-[11px] font-semibold opacity-0 translate-x-1 transition group-hover:opacity-100 group-hover:translate-x-0">{t.toggle ? `${t.label} ${on ? 'on' : 'off'}` : t.label}</span>
          </motion.div>
        ); })}
      </AnimatePresence>
    </div>
  );
}