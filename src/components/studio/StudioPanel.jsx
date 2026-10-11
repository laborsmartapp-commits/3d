import React, { useState } from 'react';
import SidePanel from '@/components/game/SidePanel';
import ScenePicker from './ScenePicker';
import CameraList from './CameraList';
import RecordedSceneLibrary from './RecordedSceneLibrary';
import StudioSettings from './StudioSettings';
import DirectorTab from './director/DirectorTab';

const TABS = [['scene', 'Scene'], ['director', 'Director'], ['cameras', 'Cameras'], ['takes', 'Recorded Scenes'], ['settings', 'Settings']];

export default function StudioPanel({ engine, s, onClose }) {
  const st = s.studio;
  const [tab, setTab] = useState(st?.scene ? 'cameras' : 'scene');
  if (!st) return null;
  return (
    <SidePanel title="Scene Manager" subtitle={st.scene ? st.scene.name : 'Krush Studio'} onClose={onClose} wide>
      <div className="grid grid-cols-5 gap-1 rounded-lg bg-white/5 p-1 mb-4">
        {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md py-1.5 text-xs font-semibold ${tab === k ? 'bg-primary text-primary-foreground' : 'hover:bg-white/10'}`}>{l}</button>)}
      </div>
      {st.error && <p className="mb-3 text-xs text-destructive">{st.error}</p>}
      {tab === 'scene' && <ScenePicker engine={engine} st={st} />}
      {tab === 'director' && <DirectorTab engine={engine} st={st} />}
      {tab === 'cameras' && <CameraList engine={engine} st={st} />}
      {tab === 'takes' && <RecordedSceneLibrary engine={engine} st={st} />}
      {tab === 'settings' && <StudioSettings engine={engine} st={st} diagOn={s.diag} />}
    </SidePanel>
  );
}