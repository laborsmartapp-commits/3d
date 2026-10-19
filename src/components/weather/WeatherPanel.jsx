import React from 'react';
import { Lock, Unlock, RotateCcw } from 'lucide-react';
import { describe } from '@/game/weather/state';
import WeatherTime from './WeatherTime';
import WeatherConditions from './WeatherConditions';
import WeatherControls from './WeatherControls';
import WeatherPresets from './WeatherPresets';

// Director-controlled weather and natural environment for the current stage.
export default function WeatherPanel({ engine, w }) {
  const W = engine.weather;
  if (!W || !w) return <p className="text-xs text-quiet">This stage has no weather controls.</p>;
  const blocked = W.blocked, off = !!blocked, set = (p) => W.set(p);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="flex-1 min-w-0 text-[11px] text-muted-foreground truncate">{describe(w)}</p>
        <button onClick={() => W.setLock(!w.locked)} className={`rounded-md px-2 py-1 text-[11px] flex items-center gap-1 ${w.locked ? 'bg-ember/20 text-ember' : 'bg-white/5 hover:bg-white/10'}`}>
          {w.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}{w.locked ? 'Locked' : 'Lock'}
        </button>
        <button disabled={off} onClick={() => W.reset()} aria-label="Reset weather" className="rounded-md p-1.5 bg-white/5 hover:bg-white/10 disabled:opacity-50"><RotateCcw className="w-3 h-3" /></button>
      </div>
      {blocked && <p className="rounded-md bg-ember/10 text-ember px-2 py-1 text-[11px]">{blocked}. Weather stays as it is.</p>}
      <WeatherTime w={w} set={set} disabled={off} />
      <WeatherConditions w={w} toggle={(k) => W.toggleCondition(k)} disabled={off} />
      <WeatherControls w={w} set={set} disabled={off} />
      <div><p className="text-xs text-quiet mb-1">Presets</p><WeatherPresets weather={W} stageId={engine.stage.id} disabled={off} /></div>
    </div>
  );
}