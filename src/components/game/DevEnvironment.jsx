import React from 'react';
import DevSlider from './DevSlider';

// Time of day and weather live in the Weather bubble (shared by every stage); only render tuning stays here.
export default function DevEnvironment({ engine }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">Time of day and weather are set in the Weather bubble. They never change on their own.</p>
      <DevSlider label="Particle density" min={0} max={1} get={() => engine.Q.particles} set={(v) => { engine.Q = { ...engine.Q, particles: v }; }} />
    </div>
  );
}