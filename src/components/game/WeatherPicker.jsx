import React from 'react';
import { WEATHERS } from '@/game/systems/Environment';

export default function WeatherPicker({ engine, current }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {Object.entries(WEATHERS).map(([k, w]) => (
        <button key={k} onClick={() => { engine.env.auto = false; engine.env.setWeather(k); }}
          className={`rounded-lg px-2 py-1.5 text-[11px] ${current === k ? 'bg-accent text-accent-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{w.label}</button>
      ))}
    </div>
  );
}