import React from 'react';
import { Switch } from '@/components/ui/switch';
import NumField from './NumField';

export default function FollowEditor({ c, edit }) {
  const f = c.follow;
  const set = (patch) => edit((k) => Object.assign(k.follow, patch));
  return (
    <div className="space-y-3">
      <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">Follow target
        <select value={f.target} onChange={(e) => set({ target: e.target.value })} className="rounded-lg bg-white/5 border border-white/10 px-2 py-2 text-sm text-foreground">
          <option value="krush">Krush (your character)</option>
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <NumField label="Follow distance (behind)" suffix="m" value={-f.fwd} onChange={(v) => set({ fwd: -v })} />
        <NumField label="Camera height" suffix="m" step={0.25} value={f.up} onChange={(v) => set({ up: v })} />
        <NumField label="Horizontal offset" suffix="m" value={f.side} onChange={(v) => set({ side: v })} />
        <NumField label="Look-at height (vertical offset)" suffix="m" step={0.1} value={f.lookHeight} onChange={(v) => set({ lookHeight: v })} />
        <NumField label="Follow smoothing" step={0.5} min={0.5} max={30} value={f.posSmooth} onChange={(v) => set({ posSmooth: v })} />
        <NumField label="Rotation smoothing" step={0.5} min={0.5} max={30} value={f.rotSmooth} onChange={(v) => set({ rotSmooth: v })} />
        <NumField label="Field of view" suffix="°" step={5} min={10} max={110} value={c.fov} onChange={(v) => edit((k) => { k.fov = v; })} />
      </div>
      <div className="grid grid-cols-2 gap-1.5 rounded-lg bg-white/5 p-1">
        {[[false, 'Smooth cinematic'], [true, 'Rigid lock']].map(([v, l]) => (
          <button key={l} onClick={() => set({ rigid: v })} className={`rounded-md py-1.5 text-xs font-medium ${f.rigid === v ? 'bg-primary text-primary-foreground' : ''}`}>{l}</button>
        ))}
      </div>
      <div className="flex items-center justify-between text-sm"><span>Follow character rotation</span><Switch checked={f.followRotation} onCheckedChange={(v) => edit((k, m) => { m.lockFollow(k); k.follow.followRotation = v; })} /></div>
      <button className="w-full rounded-lg bg-white/5 hover:bg-white/10 py-2 text-xs font-medium" onClick={() => edit((k, m) => m.lockFollow(k))}>Lock relative position from current camera spot</button>
      <p className="text-[11px] text-muted-foreground">The offset was captured from where the camera stood when you switched to Follow, so it starts recording without jumping.</p>
    </div>
  );
}