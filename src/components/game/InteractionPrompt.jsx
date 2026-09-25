import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function InteractionPrompt({ prompt, isTouch }) {
  return (
    <div className="absolute bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
      <AnimatePresence>
        {prompt && (
          <motion.div key={prompt.verb + prompt.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="glass rounded-full pl-2 pr-5 py-2 flex items-center gap-3">
            {!isTouch && <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">E</span>}
            <div className="leading-tight">
              <p className="text-sm font-semibold">{prompt.verb}</p>
              <p className="text-[11px] text-muted-foreground">{prompt.label}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}