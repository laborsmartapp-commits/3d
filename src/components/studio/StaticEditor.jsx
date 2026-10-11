import React from 'react';
import NumField from './NumField';
import NudgePad from './NudgePad';

const DEG = 180 / Math.PI;

export default function StaticEditor({ engine, c, edit }) {
  const ground = engine.groundAt(c.x, c.z);
  const b = 'rounded-lg bg-white/5 hover:bg-white/10 py-2 text-xs font-medium';
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <NumField label="X" value={c.x} onChange={(v) => edit((k) => { k.x = v; })} />
        <NumField label="Z" value={c.z} onChange={(v) => edit((k) => { k.z = v; })} />
        <NumField label="Height above ground" suffix="m" value={c.y - ground} step={0.25} onChange={(v) => edit((k) => { k.y = ground + v; })} />
        <NumField label="Turn (yaw)" suffix="°" step={5} value={c.yaw * DEG} onChange={(v) => edit((k) => { k.target = null; k.yaw = v / DEG; })} />
        <NumField label="Angle (pitch)" suffix="°" step={2} min={-85} max={85} value={c.pitch * DEG} onChange={(v) => edit((k) => { k.target = null; k.pitch = v / DEG; })} />
        <NumField label="Field of view" suffix="°" step={5} min={10} max={110} value={c.fov} onChange={(v) => edit((k) => { k.fov = v; })} />
      </div>
      <NudgePad onNudge={(d, a) => edit((k, m) => m.nudge(k, d, a))} />
      <div className="grid grid-cols-2 gap-1.5">
        <button className={b} onClick={() => edit((k, m) => m.placeAtView(k))}>Place at my current view</button>
        <button className={b} onClick={() => edit((k, m) => m.aimAtActor(k))}>Point at Krush</button>
        <button className={b} onClick={() => edit((k) => { const p = engine.player.pos; k.target = { x: p.x, y: p.y + 1.4, z: p.z }; })}>Set focal target here</button>
        <button className={b} disabled={!c.target} onClick={() => edit((k) => { k.target = null; })}>{c.target ? 'Clear focal target' : 'No focal target'}</button>
      </div>
      <p className="text-[11px] text-muted-foreground">Tip: orbit the view with the mouse (or fly it in Photo Mode, P), then "Place at my current view" to position with the mouse. This camera never moves while recording.</p>
    </div>
  );
}