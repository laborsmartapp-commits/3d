import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';

export default function DialogueBox({ engine, d }) {
  const [i, setI] = useState(0);
  const last = i >= d.lines.length - 1;
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 glass rounded-2xl w-[calc(100%-2rem)] md:w-[560px] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-lg font-semibold">{d.name}</p>
          <p className="text-xs text-muted-foreground">{d.job} · {d.age} · {d.mood}</p>
        </div>
        <span className="flex items-center gap-1 text-xs text-accent"><Heart className="w-3.5 h-3.5" />{d.friendship}</span>
      </div>
      <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-[15px] leading-relaxed min-h-[3rem]">"{d.lines[i]}"</motion.p>
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => engine.closeDialogue()} className="rounded-full bg-white/10 hover:bg-white/15 px-4 py-2 text-sm">Goodbye</button>
        {!last && <button onClick={() => setI(i + 1)} className="rounded-full bg-primary text-primary-foreground px-5 py-2 text-sm font-semibold">Continue</button>}
      </div>
    </motion.div>
  );
}