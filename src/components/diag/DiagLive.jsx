import React from 'react';
import { AlertTriangle } from 'lucide-react';
import DiagSection from './DiagSection';
import FpsControls from './FpsControls';

const SECTIONS = [['Performance', 'Performance & movement'], ['Recording', 'Scene recording'], ['Camera', 'Camera system'], ['Sync', 'Data synchronization'], ['Playback', 'Playback']];

export default function DiagLive({ engine }) {
  const m = engine.diag.metrics();
  return (
    <div className="space-y-2">
      <FpsControls engine={engine} />
      {m.warnings.map((w) => <p key={w} className="rounded-md bg-ember/15 text-ember p-2 flex gap-1.5"><AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />{w}</p>)}
      {SECTIONS.map(([k, label], i) => <DiagSection key={k} title={label} data={m[k]} open={i === 0} />)}
    </div>
  );
}