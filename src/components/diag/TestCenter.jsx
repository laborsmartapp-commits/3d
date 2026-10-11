import React from 'react';
import { TESTS } from '@/game/diag/tests';
import TestRow from './TestRow';
import RegressionChecklist from './RegressionChecklist';
import ReportButtons from './ReportButtons';

export default function TestCenter({ engine }) {
  const D = engine.diag;
  return (
    <div className="space-y-2">
      <ReportButtons engine={engine} />
      <p className="text-muted-foreground">Tests run in a dedicated <b>QA Diagnostics</b> scene and move Krush with scripted input. Keep hands off the controls while a test runs. Krush returns to his starting spot afterwards.</p>
      {TESTS.map((t) => <TestRow key={t.id} engine={engine} test={t}>{t.id === 'J' && <RegressionChecklist engine={engine} />}</TestRow>)}
      <button onClick={() => D.clearResults()} disabled={!!D.running} className="w-full rounded-md py-1.5 bg-white/5 hover:bg-white/10 text-muted-foreground">Reset all results to NOT TESTED</button>
    </div>
  );
}