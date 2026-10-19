import React, { useState } from 'react';
import ToolPanel from './ToolPanel';
import WeatherPanel from '@/components/weather/WeatherPanel';
import EnvironmentPanel from '../EnvironmentPanel';

// Weather bubble: manual weather for the shot, plus the set's own practical lights.
export default function WeatherTool({ engine, s, R, r, onClose }) {
  const [tab, setTab] = useState('weather');
  return (
    <ToolPanel title="Weather & Light" subtitle="Manual only: nothing changes unless you change it" tabs={[['weather', 'Weather'], ['lights', 'Set Lights']]} tab={tab} setTab={setTab} onClose={onClose}>
      {tab === 'weather' ? <WeatherPanel engine={engine} w={s.weather} /> : <EnvironmentPanel R={R.R} r={r} />}
    </ToolPanel>
  );
}