import React, { useState } from 'react';
import DevSlider from './DevSlider';
import WeatherPicker from './WeatherPicker';

export default function DevEnvironment({ engine, s }) {
  const env = engine.env;
  const [auto, setAuto] = useState(env.auto);
  const ov = (key) => ({ get: () => env.ov[key] ?? env.p[key], set: (v) => { env.ov[key] = v; } });
  return (
    <div>
      <DevSlider label="Time of day" min={0} max={23.99} step={0.05} get={() => env.hour} set={(v) => { env.hour = v; }} fmt={(v) => `${Math.floor(v)}:${String(Math.floor((v % 1) * 60)).padStart(2, '0')}`} />
      <DevSlider label="Time speed" min={0} max={30} step={0.5} get={() => env.timeScale} set={(v) => { env.timeScale = v; }} fmt={(v) => `${v}x`} />
      <p className="text-xs text-muted-foreground mt-3 mb-1.5">Weather</p>
      <WeatherPicker engine={engine} current={s.weatherKey} />
      <label className="flex items-center gap-2 text-xs mt-2"><input type="checkbox" className="accent-primary" checked={auto} onChange={(e) => { env.auto = e.target.checked; setAuto(e.target.checked); }} />Automatic weather changes</label>
      <div className="mt-3">
        <DevSlider label="Fog density" min={0} max={4} get={() => env.ov.fog} set={(v) => { env.ov.fog = v; }} />
        <DevSlider label="Wind" min={0} max={1.5} {...ov('wind')} />
        <DevSlider label="Cloud coverage" min={0} max={1} {...ov('cloud')} />
        <DevSlider label="Rain intensity" min={0} max={1} {...ov('rain')} />
        <DevSlider label="Storm intensity" min={0} max={1} {...ov('storm')} />
        <DevSlider label="Ambient light" min={0} max={3} get={() => env.ov.ambient} set={(v) => { env.ov.ambient = v; }} />
        <DevSlider label="Exposure" min={0.2} max={2.5} get={() => env.ov.exposure} set={(v) => { env.ov.exposure = v; }} />
        <DevSlider label="Particle density" min={0} max={1} get={() => engine.Q.particles} set={(v) => { engine.Q = { ...engine.Q, particles: v }; }} />
        <button onClick={() => Object.assign(env.ov, { wind: null, rain: null, cloud: null, storm: null })} className="mt-2 w-full rounded-lg bg-white/5 hover:bg-white/10 py-2 text-xs">Release weather overrides</button>
      </div>
    </div>
  );
}