import React from 'react';
import SidePanel from './SidePanel';
import DevSlider from './DevSlider';

const CONTROLS = [['WASD / Arrows', 'Move'], ['Shift', 'Sprint'], ['C (hold)', 'Walk'], ['Space', 'Jump'], ['E', 'Interact'], ['Right-drag', 'Orbit camera'], ['Wheel', 'Zoom'], ['V', 'First person'], ['B', 'Build mode'], ['P', 'Photo mode'], ['G / T', 'Wave / Point'], ['`', 'Playground']];

export default function SettingsPanel({ engine, s, onClose }) {
  return (
    <SidePanel title="Settings" onClose={onClose}>
      <p className="text-xs text-muted-foreground mb-2">Graphics quality</p>
      <div className="grid grid-cols-4 gap-1.5">
        {['low', 'medium', 'high', 'ultra'].map((q) => (
          <button key={q} onClick={() => engine.applyQuality(q)} className={`rounded-lg py-2 text-xs font-semibold uppercase ${s.quality === q ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{q}</button>
        ))}
      </div>
      <p className="text-[11px] text-quiet mt-1.5">Adjusts shadows, grass density, particles, render distance, lights, NPCs and wildlife.</p>
      <div className="mt-4">
        <DevSlider label="Master volume" min={0} max={1} get={() => engine.audio.volume} set={(v) => engine.audio.setVolume(v)} fmt={(v) => `${Math.round(v * 100)}%`} />
        <DevSlider label="Camera sensitivity" min={0.3} max={2.5} get={() => engine.input.sens} set={(v) => { engine.input.sens = v; }} />
        <DevSlider label="Day length speed" min={0.25} max={10} step={0.25} get={() => engine.env.timeScale} set={(v) => { engine.env.timeScale = v; }} fmt={(v) => `${v}x`} />
      </div>
      <p className="text-xs text-muted-foreground mt-5 mb-2">Controls</p>
      <div className="space-y-1">
        {CONTROLS.map(([k, v]) => <div key={k} className="flex justify-between text-xs rounded-lg bg-white/5 px-3 py-1.5"><span className="font-mono text-primary">{k}</span><span>{v}</span></div>)}
      </div>
      <p className="text-[11px] text-quiet mt-3">Controllers are supported: left stick move, right stick camera, A jump, X interact, RT sprint.</p>
    </SidePanel>
  );
}