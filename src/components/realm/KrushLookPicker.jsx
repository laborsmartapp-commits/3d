import React, { useState } from 'react';
import { KRUSH_LOOKS, krushLook, setKrushLook } from '@/game/studio/krushLooks';

export default function KrushLookPicker({ engine }) {
  const [look, setLook] = useState(krushLook());
  const pick = (k) => { setLook(k); setKrushLook(engine, k); };
  return (
    <div>
      <p className="text-xs font-semibold mb-1.5">Krush model</p>
      <div className="grid grid-cols-2 gap-1.5">
        {Object.entries(KRUSH_LOOKS).map(([k, l]) => (
          <button key={k} onClick={() => pick(k)} className={`rounded-lg px-3 py-2 text-sm ${look === k ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{l.label}</button>
        ))}
      </div>
    </div>
  );
}