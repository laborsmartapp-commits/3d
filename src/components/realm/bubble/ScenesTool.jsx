import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Film } from 'lucide-react';
import ToolPanel from './ToolPanel';
import ScenePicker from '@/components/studio/ScenePicker';
import DirectorTab from '@/components/studio/director/DirectorTab';

export default function ScenesTool({ engine, st, onClose }) {
  const [tab, setTab] = useState('scene');
  return (
    <ToolPanel title="Scenes" subtitle={st?.scene ? st.scene.name : 'Krush Studio'} tabs={[['scene', 'Scene Manager'], ['cast', 'Cast & Characters']]} tab={tab} setTab={setTab} error={st?.error} onClose={onClose}>
      {!st ? <p className="text-sm text-muted-foreground">Loading studio…</p> : tab === 'scene' ? (
        <>
          <ScenePicker engine={engine} st={st} />
          <Link to="/productions" className="mt-4 rounded-lg bg-white/5 hover:bg-white/10 px-3 py-2 text-xs flex items-center gap-2"><Film className="w-4 h-4 text-primary" />Open Productions</Link>
        </>
      ) : <DirectorTab engine={engine} st={st} />}
    </ToolPanel>
  );
}