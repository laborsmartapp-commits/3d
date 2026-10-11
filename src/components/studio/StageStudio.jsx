import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Clapperboard } from 'lucide-react';
import StudioPanel from './StudioPanel';
import StudioBar from './StudioBar';
import DiagOverlay from '@/components/diag/DiagOverlay';

// Drop-in Scene Manager UI for any stage that doesn't have its own HUD integration.
export default function StageStudio({ engine, s, open, setOpen }) {
  const st = s.studio;
  return (
    <>
      <button onClick={() => setOpen(!open)} className={`absolute top-4 right-4 z-20 glass rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-card/80 ${open ? 'ring-1 ring-primary' : ''}`}>
        <Clapperboard className="w-4 h-4 text-primary" />Scene Manager
      </button>
      {st && (st.active || st.status !== 'idle') && <StudioBar engine={engine} st={st} />}
      <AnimatePresence>{open && <StudioPanel key="studio" engine={engine} s={s} onClose={() => setOpen(false)} />}</AnimatePresence>
      {s.diag && <DiagOverlay engine={engine} />}
    </>
  );
}