import React from 'react';
import { CONDITIONS } from '@/game/weather/state';

// Combinable weather conditions (e.g. Light Rain + Mist + Windy). Opposites replace each other.
export default function WeatherConditions({ w, toggle, disabled }) {
  return (
    <div>
      <p className="text-xs text-quiet mb-1">Conditions {w.custom && <span className="text-ember">· custom mix</span>}</p>
      <div className="grid grid-cols-3 gap-1">
        {Object.entries(CONDITIONS).map(([k, c]) => (
          <button key={k} disabled={disabled} onClick={() => toggle(k)} className={`rounded-md px-1 py-1.5 text-[10px] leading-tight disabled:opacity-50 ${w.conditions.includes(k) ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{c.label}</button>
        ))}
      </div>
    </div>
  );
}