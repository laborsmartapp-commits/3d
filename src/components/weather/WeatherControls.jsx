import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import WxSlider from './WxSlider';

const deg = (v) => `${Math.round(v)}°`, x = (v) => `${v.toFixed(2)}×`;
const GROUPS = [
  ['Atmosphere', [['cloud', 'Cloud cover'], ['cloudMove', 'Cloud movement'], ['fog', 'Fog'], ['haze', 'Haze'], ['rain', 'Rain'], ['snow', 'Snow'], ['lightning', 'Lightning'], ['wind', 'Wind strength'], ['windDir', 'Wind direction', 0, 360, 1, deg]]],
  ['Light & Sky', [['sun', 'Sun / moon light', 0, 2, 0.02, x], ['sunAz', 'Sun direction', -180, 180, 1, deg], ['skyBright', 'Sky brightness', 0.2, 2, 0.02, x], ['ambient', 'Ambient light', 0, 2, 0.02, x], ['shadowSoft', 'Shadow softness'], ['moon', 'Moon'], ['stars', 'Stars'], ['exposure', 'Exposure', 0.4, 2, 0.02, x]]],
  ['Nature', [['vegetation', 'Vegetation sway'], ['leaves', 'Falling leaves'], ['dust', 'Drifting dust'], ['fireflies', 'Fireflies'], ['wetness', 'Wet ground', 0, 1, 0.01, null, 'surfaces'], ['snowCover', 'Snow cover', 0, 1, 0.01, null, 'surfaces']]],
];

// Fine control over every weather value, grouped into collapsible sections.
export default function WeatherControls({ w, set, disabled }) {
  const [open, setOpen] = useState('Atmosphere');
  return (
    <div className="space-y-1.5">
      {GROUPS.map(([name, rows]) => (
        <div key={name} className="rounded-lg bg-white/5">
          <button onClick={() => setOpen(open === name ? '' : name)} className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-semibold">
            {name}<ChevronDown className={`w-3.5 h-3.5 transition ${open === name ? 'rotate-180' : ''}`} />
          </button>
          {open === name && (
            <div className="space-y-2 px-2.5 pb-2.5">
              {rows.filter((r) => !r[6] || w[r[6]]).map(([k, label, min, max, step, show]) => (
                <WxSlider key={k} label={label} value={w[k]} min={min} max={max} step={step} show={show || undefined} disabled={disabled} onChange={(v) => set({ [k]: v })} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}