import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

function useTimed(item, ms) {
  const [v, setV] = useState(null);
  useEffect(() => { if (!item) return; setV(item); const t = setTimeout(() => setV(null), ms); return () => clearTimeout(t); }, [item?.id]);
  return v;
}

export default function Toasts({ notice, discovery }) {
  const n = useTimed(notice, 2800);
  const d = useTimed(discovery, 4000);
  return (
    <>
      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <AnimatePresence>
          {n && <motion.div key={n.id} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass rounded-full px-4 py-2 text-sm text-center max-w-[90vw]">{n.text}</motion.div>}
        </AnimatePresence>
      </div>
      <div className="absolute top-[28%] inset-x-0 z-30 pointer-events-none flex justify-center">
        <AnimatePresence>
          {d && (
            <motion.div key={d.id} initial={{ opacity: 0, letterSpacing: '0.5em' }} animate={{ opacity: 1, letterSpacing: '0.12em' }} exit={{ opacity: 0 }} transition={{ duration: 1.2 }} className="text-center px-4">
              <p className="font-display text-3xl md:text-5xl font-semibold drop-shadow-[0_2px_20px_rgba(0,0,0,0.8)]">{d.title}</p>
              <div className="mx-auto my-2 h-px w-40 bg-gradient-to-r from-transparent via-primary to-transparent" />
              <p className="text-xs uppercase tracking-[0.4em] text-primary drop-shadow">{d.sub}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}