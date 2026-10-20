import React, { useState } from 'react';
import ToolPanel from '@/components/realm/bubble/ToolPanel';
import useStageApi from './useStageApi';
import GenProgress from './GenProgress';
import CreateTab from './CreateTab';
import LibraryTab from './LibraryTab';
import StageTab from './StageTab';
import PreviewCommit from './PreviewCommit';
import ConstructionPanel from './ConstructionPanel';

// Stage Creator bubble: AI-generated stages built only from MationStudio's real parts.
export default function StageCreatorTool({ engine, st, onClose, onPick }) {
  const rec = engine.D?.record, api = useStageApi(), building = rec?.status === 'building';
  const [tab, setTab] = useState(rec ? 'stage' : 'create');
  const tabs = [...(rec ? [['stage', 'This Stage']] : []), ['create', 'Create'], ['library', 'Library']];
  return (
    <ToolPanel title="Stage Creator" subtitle={rec ? `${rec.spec.name} · v${rec.version || 1}${rec.preview ? ' · preview' : building ? ' · under construction' : ''}` : 'AI stages built from MationStudio parts'} tabs={tabs} tab={tab} setTab={setTab} onClose={onClose}>
      {api.job && <GenProgress job={api.job} onDismiss={api.clear} />}
      <ConstructionPanel jobId={building ? rec.job_id : undefined} here={rec && building} />
      {tab === 'create' && <CreateTab />}
      {tab === 'library' && <LibraryTab current={rec} />}
      {tab === 'stage' && rec && !building && (rec.preview ? <PreviewCommit rec={rec} api={api} /> : <StageTab engine={engine} st={st} rec={rec} api={api} onPick={onPick} />)}
      {tab === 'stage' && building && <p className="text-[11px] text-quiet">Versions, variations and refinements unlock when construction finishes. You can walk, record and use Set Edit on what is built so far.</p>}
    </ToolPanel>
  );
}