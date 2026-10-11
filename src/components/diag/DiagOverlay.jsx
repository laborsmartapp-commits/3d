import React, { useEffect, useState } from 'react';
import { Activity, Minus, Maximize2, X } from 'lucide-react';
import DiagLive from './DiagLive';
import TestCenter from './TestCenter';
import DiagHistory from './DiagHistory';
import QACleanup from './QACleanup';

const TABS = [['live', 'Live'], ['tests', 'Acceptance Tests'], ['history', 'History'], ['cleanup', 'QA Cleanup']];

// DOM overlay only: never drawn into the WebGL canvas, so it can't appear in footage or cloud renders.
export default function DiagOverlay({ engine }) {
  const [tab, setTab] = useState('live'), [min, setMin] = useState(false), [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick((n) => n + 1), 500); return () => clearInterval(i); }, []);
  const D = engine.diag;
  return (
    <div className="absolute left-3 top-20 z-30 w-[350px] max-w-[calc(100vw-1.5rem)] glass rounded-xl text-xs">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
        <Activity className="w-4 h-4 text-destructive" />
        <span className="font-semibold flex-1">Diagnostics</span>
        <span className="rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground animate-pulse">ON</span>
        <span className="font-mono text-muted-foreground">{engine.fps} fps</span>
        <button onClick={() => setMin(!min)} title={min ? 'Expand' : 'Minimize'} className="p-1 rounded hover:bg-white/10">{min ? <Maximize2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}</button>
        <button onClick={() => D.setEnabled(false)} disabled={!!D.running} title="Disable diagnostics" className="p-1 rounded hover:bg-white/10 disabled:opacity-40"><X className="w-3.5 h-3.5" /></button>
      </div>
      {!min && (
        <div className="p-2">
          <div className="grid grid-cols-4 gap-1 rounded-lg bg-white/5 p-1 mb-2">
            {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md py-1 text-[10px] font-semibold ${tab === k ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'}`}>{l}</button>)}
          </div>
          <div className="max-h-[62vh] overflow-y-auto pr-1">
            {tab === 'live' && <DiagLive engine={engine} />}
            {tab === 'tests' && <TestCenter engine={engine} />}
            {tab === 'history' && <DiagHistory />}
            {tab === 'cleanup' && <QACleanup />}
          </div>
        </div>
      )}
    </div>
  );
}