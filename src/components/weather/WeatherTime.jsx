import React from 'react';
import { TIME_PRESETS, fmtHour } from '@/game/weather/state';
import WxSlider from './WxSlider';

// Time of day: stays exactly where it is set, never advances on its own.
export default function WeatherTime({ w, set, disabled }) {
  return (
    <div className="space-y-2">
      <WxSlider label="Time of day" value={w.hour} min={0} max={23.98} step={0.02} onChange={(hour) => set({ hour })} show={fmtHour} disabled={disabled} />
      <div className="grid grid-cols-3 gap-1">
        {TIME_PRESETS.map(([l, h]) => (
          <button key={l} disabled={disabled} onClick={() => set({ hour: h })} className={`rounded-md py-1 text-[10px] disabled:opacity-50 ${Math.abs(w.hour - h) < 0.01 ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{l}</button>
        ))}
      </div>
    </div>
  );
}