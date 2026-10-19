import React from 'react';
import { X } from 'lucide-react';

export default function RealmPanel({ title, onClose, children, side = 'left' }) {
  return (
    <div className={`absolute top-20 bottom-6 z-30 w-80 glass rounded-2xl flex flex-col ${side === 'left' ? 'left-[100px]' : 'right-4'}`}>
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h3 className="font-heading text-sm tracking-wide">{title}</h3>
        {onClose && <button onClick={onClose} className="p-1 rounded-md hover:bg-white/10"><X className="w-4 h-4" /></button>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 pb-4">{children}</div>
    </div>
  );
}