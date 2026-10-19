import React from 'react';
import ToolPanel from './ToolPanel';
import ScenesTool from './ScenesTool';
import SetEditTool from './SetEditTool';
import CamerasTool from './CamerasTool';
import RecordingTool from './RecordingTool';
import LayoutsTool from './LayoutsTool';
import SettingsTool from './SettingsTool';
import EnvironmentPanel from '../EnvironmentPanel';

// The panel for the selected bubble.
export default function RealmTool({ tool, engine, s, R, r, onClose }) {
  const st = s.studio;
  if (tool === 'scenes') return <ScenesTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'setedit') return <SetEditTool R={R} r={r} onClose={onClose} />;
  if (tool === 'cameras') return <CamerasTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'recording') return <RecordingTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'layouts') return <LayoutsTool R={R.R} r={r} onClose={onClose} />;
  if (tool === 'settings') return <SettingsTool engine={engine} s={s} r={r} onClose={onClose} />;
  return <ToolPanel title="Environment" subtitle="Time, sky, weather and lighting" onClose={onClose}><EnvironmentPanel R={R.R} r={r} /></ToolPanel>;
}