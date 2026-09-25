import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

export default function SidePanel({ title, subtitle, onClose, children, wide }) {
  const mobile = window.innerWidth < 768;
  const anim = mobile ? { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } } : { initial: { x: '110%' }, animate: { x: 0 }, exit: { x: '110%' } };
  const pos = mobile ? 'inset-x-0 bottom-0 max-h-[72vh] rounded-t-3xl' : `right-4 top-20 bottom-4 ${wide ? 'w-[500px]' : 'w-[360px]'} rounded-2xl`;
  return (
    <motion.div {...anim} transition={{ type: 'spring', damping: 30, stiffness: 280 }} className={`absolute ${pos} glass flex flex-col z-30`}>
      {mobile && <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/20" />}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/10">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-wide">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10" aria-label="Close"><X className="w-4 h-4" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">{children}</div>
    </motion.div>
  );
}