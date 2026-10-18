import React from 'react';
import { PRESETS, ACCENTS } from '@/game/realm/env';
import RealmPanel from './RealmPanel';
import RoomSwitches from './RoomSwitches';
import ViewControls from './ViewControls';

const fmt = (h) => `${String(Math.floor(h) % 24).padStart(2, '0')}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
const Seg = ({ value, opts, onChange }) => <div className="flex gap-1">{opts.map(([v, l]) => <button key={v} onClick={() => onChange(v)} className={`flex-1 rounded-md py-1 text-xs ${value === v ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{l}</button>)}</div>;
const Slider = ({ label, value, min, max, step, onChange, show }) => (
  <label className="block text-xs"><span className="flex justify-between text-quiet"><span>{label}</span><span className="tabular-nums text-foreground">{show ? show(value) : value.toFixed(2)}</span></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="game-range" /></label>
);

export default function EnvironmentPanel({ R, r, onClose }) {
  const s = r.env, set = (p) => R.env.set(p);
  return (
    <RealmPanel title="Realm Environment" onClose={onClose}>
      <div className="space-y-3">
        <Slider label="Time of day" value={s.hour} min={5} max={23.9} step={0.05} onChange={(hour) => set({ hour })} show={fmt} />
        <div className="grid grid-cols-5 gap-1">{Object.entries(PRESETS).map(([l, h]) => <button key={l} onClick={() => set({ hour: h })} className="rounded-md bg-white/5 hover:bg-white/10 py-1 text-[10px]">{l}</button>)}</div>
        <Slider label="Sun direction" value={s.azimuth} min={-180} max={180} step={1} onChange={(azimuth) => set({ azimuth })} show={(v) => `${v}°`} />
        <Slider label="Sun intensity" value={s.sun} min={0} max={2} step={0.05} onChange={(sun) => set({ sun })} />
        <div><p className="text-xs text-quiet mb-1">Weather</p><Seg value={s.weather} opts={[['clear', 'Clear'], ['overcast', 'Overcast'], ['fog', 'Foggy']]} onChange={(weather) => set({ weather })} /></div>
        <Slider label="Fog density" value={s.fog} min={0.3} max={3} step={0.05} onChange={(fog) => set({ fog })} />
        <Slider label="Exposure" value={s.exposure} min={0.4} max={2} step={0.02} onChange={(exposure) => set({ exposure })} />
        <Slider label="Interior lights" value={s.interior} min={0} max={2} step={0.05} onChange={(interior) => set({ interior })} />
        <div><p className="text-xs text-quiet mb-1">Porch, patio & street lights {r.outdoorOn ? '(on)' : '(off)'}</p><Seg value={s.outdoor} opts={[['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]} onChange={(outdoor) => set({ outdoor })} /></div>
        <div><p className="text-xs text-quiet mb-1">Accent lighting (studio, DJ, LEDs)</p>
          <div className="grid grid-cols-3 gap-1">{Object.keys(ACCENTS).map((k) => <button key={k} onClick={() => set({ accent: k })} className={`rounded-md py-1 text-xs capitalize ${s.accent === k ? 'bg-primary text-primary-foreground' : 'bg-white/5 hover:bg-white/10'}`}>{k}</button>)}</div></div>
        <label className="flex items-center justify-between text-xs"><span>Party lights (moving beams)</span><input type="checkbox" checked={!!s.party} onChange={(e) => set({ party: e.target.checked })} className="accent-primary" /></label>
        <RoomSwitches R={R} rooms={r.rooms} />
        <ViewControls R={R} view={r.view} />
      </div>
    </RealmPanel>
  );
}