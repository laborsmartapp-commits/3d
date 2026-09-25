import React from 'react';
import { EyeOff, Eye, X } from 'lucide-react';
import DevSlider from './DevSlider';
import WeatherPicker from './WeatherPicker';

export default function PhotoPanel({ engine, s, hideUI, setHideUI }) {
  if (hideUI) {
    return <button onClick={() => setHideUI(false)} className="absolute bottom-4 right-4 z-30 glass rounded-full p-2 opacity-40 hover:opacity-100"><Eye className="w-4 h-4" /></button>;
  }
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 glass rounded-2xl p-4 w-[calc(100%-2rem)] md:w-[640px]">
      <div className="flex items-center justify-between mb-2">
        <p className="font-display font-semibold">Photo Mode</p>
        <div className="flex gap-1">
          <button onClick={() => setHideUI(true)} className="rounded-full bg-white/10 hover:bg-white/15 px-3 py-1.5 text-xs flex items-center gap-1"><EyeOff className="w-3.5 h-3.5" />Hide UI</button>
          <button onClick={() => engine.setMode('play')} className="rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs flex items-center gap-1 font-semibold"><X className="w-3.5 h-3.5" />Exit</button>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground mb-2">Drag to orbit · Scroll to zoom · WASD to move · Q/E camera height</p>
      <div className="grid md:grid-cols-2 gap-x-4">
        <DevSlider label="Time of day" min={0} max={23.99} step={0.05} get={() => engine.env.hour} set={(v) => { engine.env.hour = v; }} fmt={(v) => `${Math.floor(v)}:${String(Math.floor((v % 1) * 60)).padStart(2, '0')}`} />
        <DevSlider label="Field of view" min={25} max={100} step={1} get={() => engine.camera.fov} set={(v) => { engine.camera.fov = v; engine.camera.updateProjectionMatrix(); }} fmt={(v) => `${v}°`} />
      </div>
      <div className="mt-2"><WeatherPicker engine={engine} current={s.weatherKey} /></div>
    </div>
  );
}