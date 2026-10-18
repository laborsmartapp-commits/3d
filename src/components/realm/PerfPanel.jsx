import React from 'react';
import RealmPanel from './RealmPanel';

const Row = ({ k, v, warn }) => <div className="flex justify-between py-1 border-b border-white/5 text-xs"><span className="text-quiet">{k}</span><span className={`tabular-nums ${warn ? 'text-ember' : ''}`}>{v}</span></div>;

// Live render profile (previous frame totals across every camera drawn).
export default function PerfPanel({ r, onClose }) {
  const p = r.perf;
  const hints = !p ? [] : [p.calls > 1200 && 'Draw calls are high — hide distant rooms or the upper floor while filming.', p.tris > 3e6 && 'Triangle count is high — imported models may need decimation.', p.avgFps < 30 && 'Average frame rate below 30 — lower preview quality in the Scene Manager.'].filter(Boolean);
  return (
    <RealmPanel title="Performance" onClose={onClose}>
      {!p ? <p className="text-xs text-muted-foreground">Measuring…</p> : (
        <div>
          <Row k="Frame rate (now / avg / min, last 300 frames)" v={`${p.fps} / ${p.avgFps} / ${p.minFps}`} warn={p.avgFps < 30} />
          <Row k="Frame time" v={`${p.ms} ms`} />
          <Row k="Draw calls" v={p.calls} warn={p.calls > 1200} />
          <Row k="Triangles" v={p.tris.toLocaleString()} warn={p.tris > 3e6} />
          <Row k="Geometries / textures in memory" v={`${p.geos} / ${p.tex}`} />
          <Row k="Practical lights wanting the pool / pool size" v={`${p.lights} / 12`} />
          <Row k="Set objects (visible / total)" v={`${p.visibleObjects} / ${p.objects}`} />
          <Row k="Colliders" v={p.colliders} />
          <div className="mt-3 space-y-1">{hints.length ? hints.map((h) => <p key={h} className="text-xs text-ember">{h}</p>) : <p className="text-xs text-primary">No bottleneck flagged at the moment.</p>}</div>
        </div>
      )}
    </RealmPanel>
  );
}