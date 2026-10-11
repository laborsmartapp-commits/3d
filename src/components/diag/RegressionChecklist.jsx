import React from 'react';
import { REGRESSION } from '@/game/diag/tests';

// Test J: human confirmation per item. PASS only when every item is confirmed passing.
export default function RegressionChecklist({ engine }) {
  const D = engine.diag, m = D.results.J?.m || {};
  const set = (item, v) => {
    const next = { ...m, [item]: v }, vals = REGRESSION.map((k) => next[k]);
    const status = vals.includes('fail') ? 'FAIL' : vals.every((x) => x === 'pass') ? 'PASS' : 'INCONCLUSIVE';
    const failed = REGRESSION.filter((k) => next[k] === 'fail');
    D.setResult('J', { status, m: next, note: failed.length ? `Failed: ${failed.join(', ')}` : `${vals.filter(Boolean).length}/${REGRESSION.length} items confirmed` });
  };
  return (
    <div className="space-y-1 pt-1">
      <p>Try each item with diagnostics on, then turn diagnostics off and try again.</p>
      {REGRESSION.map((k) => (
        <div key={k} className="flex items-center gap-1.5">
          <span className="flex-1 text-foreground">{k}</span>
          {['pass', 'fail'].map((v) => <button key={v} onClick={() => set(k, v)} className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${m[k] === v ? (v === 'pass' ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground') : 'bg-white/10'}`}>{v}</button>)}
        </div>
      ))}
    </div>
  );
}