import React, { useState } from 'react';
import { Check, X } from 'lucide-react';

export default function TakeRename({ name, onSave, onCancel }) {
  const [v, setV] = useState(name);
  const save = () => (v.trim() && v.trim() !== name ? onSave(v.trim()) : onCancel());
  return (
    <div className="flex gap-1.5 items-center">
      <input autoFocus value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') save(); if (e.key === 'Escape') onCancel(); }}
        aria-label="Take name" className="flex-1 min-w-0 rounded-lg bg-black/30 border border-white/10 px-2 py-1 text-xs" />
      <button onClick={save} aria-label="Save name" className="rounded-full p-1.5 bg-primary text-primary-foreground"><Check className="w-3 h-3" /></button>
      <button onClick={onCancel} aria-label="Cancel rename" className="rounded-full p-1.5 bg-white/10"><X className="w-3 h-3" /></button>
    </div>
  );
}