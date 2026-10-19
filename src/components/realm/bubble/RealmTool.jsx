import React from 'react';
import ScenesTool from './ScenesTool';
import WeatherTool from './WeatherTool';
import SetEditTool from './SetEditTool';
import DirectorTool from './DirectorTool';
import CamerasTool from './CamerasTool';
import RecordingTool from './RecordingTool';
import LayoutsTool from './LayoutsTool';
import SettingsTool from './SettingsTool';

// The panel for the selected bubble. R/r (set editor) exist only on stages with an editable set.
export default function RealmTool({ tool, engine, s, R, r, onClose }) {
  const st = s.studio;
  if (tool === 'scenes') return <ScenesTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'director') return <DirectorTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'setedit' && R) return <SetEditTool R={R} r={r} onClose={onClose} />;
  if (tool === 'cameras') return <CamerasTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'recording') return <RecordingTool engine={engine} st={st} onClose={onClose} />;
  if (tool === 'layouts' && R) return <LayoutsTool R={R.R} r={r} onClose={onClose} />;
  if (tool === 'settings') return <SettingsTool engine={engine} s={s} r={r} onClose={onClose} />;
  return <WeatherTool engine={engine} s={s} R={R} r={r} onClose={onClose} />;
}