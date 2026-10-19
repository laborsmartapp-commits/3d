import React, { useState } from 'react';
import ToolPanel from './ToolPanel';
import WeatherPanel from '@/components/weather/WeatherPanel';
import EnvironmentPanel from '../EnvironmentPanel';

// Weather bubble (same on every stage): natural light and weather, plus the set's own artificial lights.
export default function WeatherTool({ engine, s, R, r, onClose }) {
  const [tab, setTab] = useState('weather');
  return (
    <ToolPanel title="Weather & Light" subtitle="Manual only: nothing changes unless you change it" tabs={[['weather', 'Weather'], ['lights', 'Set Lights']]} tab={tab} setTab={setTab} onClose={onClose}>
      {tab === 'weather' && <WeatherPanel engine={engine} w={s.weather} />}
      {tab === 'lights' && (R ? <EnvironmentPanel R={R.R} r={r} /> : <p className="text-xs text-quiet">This stage has no switchable set lights. Its lamps and signs follow the time of day you set in Weather.</p>)}
    </ToolPanel>
  );
}