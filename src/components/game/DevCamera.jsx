import React from 'react';
import DevSlider from './DevSlider';

export default function DevCamera({ engine }) {
  const rig = engine.rig, cam = engine.camera;
  const r = (key) => ({ get: () => rig[key], set: (v) => { rig[key] = v; } });
  return (
    <div>
      <DevSlider label="Field of view" min={35} max={100} step={1} get={() => cam.fov} set={(v) => { cam.fov = v; cam.updateProjectionMatrix(); }} fmt={(v) => `${v}°`} />
      <DevSlider label="Camera distance" min={1.5} max={30} step={0.1} {...r('dist')} />
      <DevSlider label="Camera height" min={0.5} max={4} {...r('height')} />
      <DevSlider label="Camera smoothing" min={2} max={30} step={0.5} {...r('smooth')} />
      <DevSlider label="Rotation speed" min={0.2} max={3} {...r('rotSpeed')} />
      <DevSlider label="Zoom min" min={1} max={6} step={0.1} {...r('minDist')} />
      <DevSlider label="Zoom max" min={8} max={40} step={0.5} {...r('maxDist')} />
      <DevSlider label="Collision radius" min={0} max={1.5} {...r('colRadius')} />
      <DevSlider label="Free camera speed" min={5} max={120} step={1} get={() => rig.free.speed} set={(v) => { rig.free.speed = v; }} />
    </div>
  );
}