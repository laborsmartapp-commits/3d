import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ToolPanel from '@/components/realm/bubble/ToolPanel';
import useStageApi from './useStageApi';
import GenProgress from './GenProgress';
import CreateTab from './CreateTab';
import LibraryTab from './LibraryTab';
import StageTab from './StageTab';
import PreviewCommit from './PreviewCommit';

// Stage Creator bubble: AI-generated stages built only from MationStudio's real parts.
export default function StageCreatorTool({ engine, st, onClose, onPick }) {
  const rec = engine.D?.record, api = useStageApi(), nav = useNavigate();
  const [tab, setTab] = useState(rec ? 'stage' : 'create');
  const tabs = [...(rec ? [['stage', 'This Stage']] : []), ['create', 'Create'], ['library', 'Library']];
  return (
    <ToolPanel title="Stage Creator" subtitle={rec ? `${rec.spec.name} · v${rec.version || 1}${rec.preview ? ' · preview' : ''}` : 'AI stages built from MationStudio parts'} tabs={tabs} tab={tab} setTab={setTab} onClose={onClose}>
      {api.job && <GenProgress job={api.job} onDismiss={api.clear} onRetry={api.canRetry ? async () => { const d = await api.retry(); if (d?.stage) nav(`/stage/${d.stage.id}`); } : null} />}
      {tab === 'create' && <CreateTab api={api} />}
      {tab === 'library' && <LibraryTab current={rec} />}
      {tab === 'stage' && rec && (rec.preview ? <PreviewCommit rec={rec} api={api} /> : <StageTab engine={engine} st={st} rec={rec} api={api} onPick={onPick} />)}
    </ToolPanel>
  );
}