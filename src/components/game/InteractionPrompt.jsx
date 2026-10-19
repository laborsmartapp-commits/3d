import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function InteractionPrompt({ prompt, isTouch, onPick }) {
  const choices = prompt?.choices;
  return (
    <div className={`absolute bottom-28 md:bottom-10 left-1/2 -translate-x-1/2 z-20 ${choices ? '' : 'pointer-events-none'}`}>
      <AnimatePresence>
        {prompt && (
          <motion.div key={prompt.verb + prompt.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className={`glass ${choices ? 'rounded-2xl p-2 space-y-1 min-w-[220px]' : 'rounded-full pl-2 pr-5 py-2 flex items-center gap-3'}`}>
            {choices ? (
              <>
                <p className="px-2 pt-1 text-[11px] text-muted-foreground">{prompt.label}</p>
                {choices.map((c, i) => (
                  <button key={c.label} onClick={() => onPick?.(i)} className="w-full flex items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/10">
                    <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-xs">{i + 1}</span>
                    <span className="leading-tight"><span className="block text-sm font-semibold">{c.verb}</span><span className="block text-[11px] text-muted-foreground">{c.label}</span></span>
                  </button>
                ))}
              </>
            ) : (
              <>
                {!isTouch && <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground grid place-items-center font-bold text-sm">E</span>}
                <div className="leading-tight">
                  <p className="text-sm font-semibold">{prompt.verb}</p>
                  <p className="text-[11px] text-muted-foreground">{prompt.label}</p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}