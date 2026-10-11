import { base44 } from '@/api/base44Client';

// Single studio settings record, cached. Sync getter returns defaults until loaded.
const DEFAULTS = { default_fps: 30, default_preview_quality: '720p', default_render_resolution: '1080p', default_render_preset: 'high', max_scene_duration: 600, default_camera_fov: 50, recording_chunk_seconds: 5 };
let cache = { ...DEFAULTS };

export const studioSettings = () => cache;
export const loadStudioSettings = base44.entities.AppSettings.filter({ key: 'studio' })
  .then((r) => { const s = (r.items || r)[0]; if (s) cache = { ...DEFAULTS, ...s }; return cache; })
  .catch(() => cache);