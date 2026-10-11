import React from 'react';
import { Gauge, RotateCcw } from 'lucide-react';

export default function FpsControls({ engine }) {
  const D = engine.diag, on = D.throttle;
  return (
    <div className="rounded-lg bg-white/5 p-2 space-y-1.5">
      <div className="flex gap-1.5">
        <button onClick={() => D.setThrottle(true, 15)} disabled={on || !!D.running} className={`flex-1 rounded-md py-1.5 font-semibold flex items-center justify-center gap-1 ${on ? 'bg-ember text-background' : 'bg-white/10 hover:bg-white/20'} disabled:opacity-60`}><Gauge className="w-3.5 h-3.5" />Simulate 15 FPS</button>
        <button onClick={() => D.setThrottle(false)} disabled={!on || !!D.running} className="flex-1 rounded-md py-1.5 font-semibold bg-white/10 hover:bg-white/20 disabled:opacity-40 flex items-center justify-center gap-1"><RotateCcw className="w-3.5 h-3.5" />Reset FPS</button>
      </div>
      <p className="text-muted-foreground">Target: <b className="text-foreground">{on ? `${D.target} fps` : 'unlimited'}</b> · Measured: <b className="text-foreground">{engine.fps} fps</b></p>
    </div>
  );
}