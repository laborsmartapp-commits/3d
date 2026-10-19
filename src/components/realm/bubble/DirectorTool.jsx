import React from 'react';
import ToolPanel from './ToolPanel';
import DirectorTab from '@/components/studio/director/DirectorTab';

export default function DirectorTool({ engine, st, onClose }) {
  const armed = st?.director?.actors.find((a) => a.armed);
  return (
    <ToolPanel title="Director" subtitle={armed ? `Armed: ${armed.name}` : 'Cast, actors and scheduled animations'} error={st?.error} onClose={onClose}>
      {!st ? <p className="text-sm text-muted-foreground">Loading studio…</p> : <DirectorTab engine={engine} st={st} />}
    </ToolPanel>
  );
}