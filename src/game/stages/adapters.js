import { ENGINE_VERSION, worldSnapshot } from '../studio/versions';

// Stage adapter: the only stage-specific surface the shared Scene Manager talks to.
// Engines also provide: scene, renderer, camera, container, player, rig, emit, qName, fps, applyQuality.

export const celestiaStage = (e) => ({
  id: 'celestia-grotto', name: 'Celestia Grotto', version: ENGINE_VERSION, actors: ['krush'],
  location: () => e.island?.name || 'Celestia Grotto',
  snapshot: () => worldSnapshot(e),
  env: {
    kind: 'dynamic',
    get: () => ({ h: +e.env.hour.toFixed(3), w: e.env.weather }),
    start: () => ({ hour: e.env.hour, weather: e.env.weather, timeScale: e.env.timeScale, rate: e.env.rate }),
    apply: (s) => { if (!s) return; e.env.hour = s.h; if (e.env.weather !== s.w) e.env.setWeather(s.w); },
    save: () => ({ h: e.env.hour, w: e.env.weather }),
  },
});

export const starSquareStage = (e) => ({
  id: 'star-square', name: 'Star Square', version: 'star-square@1.0.0', actors: ['krush'],
  location: () => e.hud.zone || 'Star Square',
  snapshot: () => ({ world: 'star-square', engine_version: 'star-square@1.0.0', district: 'star-square', district_name: 'Star Square', fog: e.D.fog, spawn: e.D.spawn }),
  env: { kind: 'static', get: () => ({ h: null, w: 'clear' }), start: () => ({ static: true }), apply: () => {}, save: () => null },
});

export const convergenceStage = (e) => ({
  id: 'convergence', name: 'The Convergence', version: 'convergence@1.0.0', actors: ['krush'],
  location: () => e.D.name,
  snapshot: () => ({ world: 'convergence', engine_version: 'convergence@1.0.0', district: e.D.id, district_name: e.D.name, fog: e.D.fog, spawn: e.D.spawn }),
  env: { kind: 'static', get: () => ({ h: null, w: 'clear' }), start: () => ({ static: true }), apply: () => {}, save: () => null },
});