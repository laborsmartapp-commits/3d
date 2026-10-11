import React from 'react';
import { LOCAL_QUALITY, RESOLUTIONS, PRESETS, FRAME_RATES } from '@/game/studio/quality';
import { CLOUD_CONNECTED } from '@/game/studio/CloudRenderService';

function Seg({ items, value, onChange, label = (v) => v }) {
  return (
    <div className="grid gap-1 rounded-lg bg-white/5 p-1" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((v) => <button key={v} onClick={() => onChange(v)} className={`rounded-md py-1.5 text-xs font-semibold ${value === v ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'}`}>{label(v)}</button>)}
    </div>
  );
}

export default function StudioSettings({ engine, st }) {
  const S = engine.studio, c = st.cloud;
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Local Preview Quality</h3>
        <p className="text-xs text-muted-foreground">Only affects this device's viewport. Currently running: <b className="uppercase">{st.liveQuality}</b></p>
        <Seg items={LOCAL_QUALITY} value={st.localQuality} onChange={(v) => S.setLocalQuality(v)} label={(v) => v[0].toUpperCase() + v.slice(1)} />
      </section>
      <section className="space-y-2">
        <h3 className="text-sm font-semibold">Cloud Recording Quality</h3>
        <p className="text-xs text-muted-foreground">Sent to the remote renderer, which re-renders the original scene at this size. Never upscaled from your preview.</p>
        <Seg items={Object.keys(RESOLUTIONS)} value={c.resolution} onChange={(v) => S.setCloud({ resolution: v })} label={(v) => (v === '4k' ? '4K' : v)} />
        <Seg items={Object.keys(PRESETS)} value={c.preset} onChange={(v) => S.setCloud({ preset: v })} label={(v) => PRESETS[v].label} />
        <Seg items={FRAME_RATES} value={c.fps} onChange={(v) => S.setCloud({ fps: v })} label={(v) => `${v} fps`} />
        <p className="text-xs text-muted-foreground">Output {RESOLUTIONS[c.resolution].w}×{RESOLUTIONS[c.resolution].h} at {c.fps} fps.</p>
      </section>
      <div className={`rounded-lg p-3 text-xs ${CLOUD_CONNECTED ? 'bg-primary/15 text-primary' : 'bg-ember/15 text-ember'}`}>
        {CLOUD_CONNECTED ? 'Cloud renderer: RunPod connected.' : 'Cloud renderer: RunPod not connected yet. Takes are saved and queued, and will render once it is connected.'}
      </div>
    </div>
  );
}